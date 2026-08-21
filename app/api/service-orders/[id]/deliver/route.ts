export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { tenantQuery } from '@/lib/supabase/query-helpers'
import { canPushFinance } from '@/lib/api-role-guard'
import { canDeliverService } from '@/lib/role-access'
import { getServiceClient } from '@/lib/supabase/service'
import { normalizePaymentMethod } from '@/lib/payment-method'
import { withApiHandler } from '@/lib/api-handler'

type RouteContext = { params?: Record<string, string> }

type UsedPartBody = {
  stock_id: string
  name?: string
  qty: number
  unit_buy?: number
  unit_sell?: number
  stock_deducted?: boolean
}

import {
  getDefaultAccountForPaymentMethod,
  adjustAccountBalance,
  isLiquidPaymentMethod,
  createIncome,
} from '@/lib/finance-accounts'

export const POST = withApiHandler(async function POST(req: NextRequest, ctx: RouteContext) {
  const params = ctx.params ?? {}
  const id = params.id
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canPushFinance(auth.role) && !canDeliverService(auth.role)) {
    return NextResponse.json({ error: 'Teslim / finans yetkisi yok' }, { status: 403 })
  }
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'Geçersiz sipariş id' }, { status: 400 })
  }

  let body: {
    service_fee?: number
    payment_method?: string
    account_id?: string
    used_parts?: UsedPartBody[]
    warranty_months?: number
    final_checks?: string[]
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const serviceFee = Number(body.service_fee)
  if (!serviceFee || serviceFee <= 0) {
    return NextResponse.json({ error: 'service_fee gerekli ve pozitif olmalı' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const { data: order, error: orderErr } = await tenantQuery(
    admin.from('service_orders').select('*'),
    auth.tenantId,
  )
    .eq('id', id)
    .maybeSingle()

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Servis kaydı bulunamadı' }, { status: 404 })
  }
  if (order.status === 'teslim') {
    return NextResponse.json({ error: 'Bu iş zaten teslim edilmiş' }, { status: 409 })
  }

  const meta = (order.metadata as Record<string, unknown>) ?? {}
  const metaParts = Array.isArray(meta.used_parts) ? (meta.used_parts as Array<Record<string, unknown>>) : []
  const alreadyDeducted = new Set(
    metaParts
      .filter(p => p.stock_deducted === true)
      .map(p => String(p.stock_id ?? p.id ?? ''))
      .filter(Boolean),
  )
  const bodyParts = body.used_parts ?? []
  const usedParts: UsedPartBody[] = (bodyParts.length ? bodyParts : metaParts.map(p => ({
    stock_id: String(p.stock_id ?? p.id ?? ''),
    name: p.name ? String(p.name) : undefined,
    qty: Number(p.qty) || 0,
    unit_buy: Number(p.unit_buy) || 0,
    unit_sell: Number(p.unit_sell) || 0,
    stock_deducted: p.stock_deducted === true,
  }))).map(p => ({
    ...p,
    stock_id: p.stock_id,
    stock_deducted: p.stock_deducted === true || alreadyDeducted.has(p.stock_id),
  }))

  const paymentMethod = normalizePaymentMethod(body.payment_method)
  const usedPartsJson = usedParts.map(p => ({
    stock_id: p.stock_id,
    name: p.name,
    qty: p.qty,
    unit_buy: p.unit_buy ?? 0,
    unit_sell: p.unit_sell ?? 0,
    stock_deducted: p.stock_deducted === true,
  }))

  let rpcResult: Record<string, unknown> | null = null
  let rpcErr: { message: string; code?: string } | null = null

  // 1. Try 9-param RPC (with p_account_id)
  const rpc9 = await admin.rpc('complete_service_delivery', {
    p_tenant_id: auth.tenantId,
    p_user_id: auth.userId,
    p_order_id: id,
    p_service_fee: serviceFee,
    p_payment_method: paymentMethod,
    p_used_parts: usedPartsJson,
    p_warranty_months: body.warranty_months ?? null,
    p_final_checks: body.final_checks ?? null,
    p_account_id: body.account_id && isUuid(body.account_id) ? body.account_id : null,
  })

  if (!rpc9.error && rpc9.data) {
    rpcResult = rpc9.data as Record<string, unknown>
    // If account_id was not populated by RPC for a liquid payment, resolve and adjust now
    if (isLiquidPaymentMethod(paymentMethod) && !rpcResult.account_id) {
      const defaultAcc = await getDefaultAccountForPaymentMethod(admin, auth.tenantId, paymentMethod)
      if (defaultAcc) {
        try {
          const newBal = await adjustAccountBalance(admin, auth.tenantId, defaultAcc.id, serviceFee)
          rpcResult.account_id = defaultAcc.id
          rpcResult.account_balance = newBal
          if (rpcResult.finance_tx_id) {
            await admin
              .from('financial_transactions')
              .update({ account_id: defaultAcc.id })
              .eq('id', rpcResult.finance_tx_id)
          }
        } catch {}
      }
    }
  } else if (
    rpc9.error &&
    (rpc9.error.message.includes('complete_service_delivery') ||
      rpc9.error.message.includes('signature') ||
      rpc9.error.code === 'PGRST202' ||
      rpc9.error.message.includes('function complete_service_delivery'))
  ) {
    // 2. Try 8-param signature (legacy migration compatibility)
    const rpc8 = await admin.rpc('complete_service_delivery', {
      p_tenant_id: auth.tenantId,
      p_user_id: auth.userId,
      p_order_id: id,
      p_service_fee: serviceFee,
      p_payment_method: paymentMethod,
      p_used_parts: usedPartsJson,
      p_warranty_months: body.warranty_months ?? null,
      p_final_checks: body.final_checks ?? null,
    })

    if (!rpc8.error && rpc8.data) {
      rpcResult = rpc8.data as Record<string, unknown>
      if (isLiquidPaymentMethod(paymentMethod)) {
        const defaultAcc = await getDefaultAccountForPaymentMethod(admin, auth.tenantId, paymentMethod)
        if (defaultAcc) {
          try {
            const newBal = await adjustAccountBalance(admin, auth.tenantId, defaultAcc.id, serviceFee)
            rpcResult.account_id = defaultAcc.id
            rpcResult.account_balance = newBal
          } catch {}
          if (rpcResult.finance_tx_id) {
            try {
              await admin
                .from('financial_transactions')
                .update({ account_id: defaultAcc.id })
                .eq('id', rpcResult.finance_tx_id)
            } catch {}
          }
        }
      }
    } else {
      rpcErr = rpc8.error
    }
  } else {
    rpcErr = rpc9.error
  }

  // 3. Direct Fallback if RPC is missing entirely
  if (rpcErr && (rpcErr.message.includes('complete_service_delivery') || rpcErr.code === 'PGRST202')) {
    const deliveredAt = new Date().toISOString()
    let totalExpense = 0
    for (const p of usedParts) {
      totalExpense += (p.unit_buy ?? 0) * (p.qty ?? 0)
    }
    const netProfit = serviceFee - totalExpense
    const profitMargin = serviceFee > 0 ? Math.round((netProfit / serviceFee) * 100) : 0

    // Deduct stock if needed
    for (const p of usedParts) {
      if (!p.stock_deducted && p.stock_id && p.qty > 0) {
        try {
          await admin.rpc('deduct_part_stock', {
            p_part_id: p.stock_id,
            p_quantity: p.qty,
          })
        } catch {}
      }
    }

    // Create Finance Record
    let finRes: { transaction_id: string; account_id: string | null; new_balance: number | null } | null = null
    try {
      finRes = await createIncome(admin, auth.tenantId, auth.userId, {
        type: 'gelir',
        amount: serviceFee,
        category: 'Servis Teslim',
        description: `Servis teslim — ${order.order_no ?? id}`,
        payment_method: paymentMethod,
        account_id: body.account_id,
        customer_name: order.customer_name,
        order_no: order.order_no,
        service_id: id,
      })
    } catch (finErr: any) {
      console.error('[deliver] createIncome error in fallback path:', finErr)
      return NextResponse.json(
        { error: `Finans / Kasa kaydı oluşturulamadı: ${finErr?.message || 'Hesap çözümlenemedi'}` },
        { status: 500 },
      )
    }

    // Update Service Order
    await tenantQuery(
      admin.from('service_orders').update({
        status: 'teslim',
        actual_cost: serviceFee,
        closed_at: deliveredAt,
        updated_at: deliveredAt,
        metadata: {
          ...meta,
          used_parts: usedParts,
          final_checks: body.final_checks ?? meta.final_checks,
          financial_posted: true,
          net_profit: netProfit,
          delivered_at: deliveredAt,
          account_id: finRes?.account_id ?? null,
        },
      }),
      auth.tenantId,
    ).eq('id', id)

    // Warranties
    let warrantyId: string | null = null
    const wMonths = body.warranty_months ?? 0
    if (wMonths > 0) {
      const start = deliveredAt.slice(0, 10)
      const endD = new Date()
      endD.setMonth(endD.getMonth() + wMonths)
      const end = endD.toISOString().slice(0, 10)
      warrantyId = crypto.randomUUID()

      try {
        await admin.from('warranties').insert({
          id: warrantyId,
          tenant_id: auth.tenantId,
          order_id: id,
          imei: order.imei,
          device_brand: order.device_brand,
          device_model: order.device_model,
          warranty_months: wMonths,
          start_date: start,
          end_date: end,
          covered_parts: ['İşçilik', 'Değiştirilen Parçalar'],
          terms: 'AURA standart servis garantisi.',
          status: 'active',
          created_by: auth.userId,
        })
      } catch {}
    }

    rpcResult = {
      ok: true,
      finance_tx_id: finRes?.transaction_id,
      account_id: finRes?.account_id,
      account_balance: finRes?.new_balance,
      service_fee: serviceFee,
      total_expense: totalExpense,
      net_profit: netProfit,
      profit_margin: profitMargin,
      delivered_at: deliveredAt,
      warranty_id: warrantyId,
      cash_shift_id: null,
    }
    rpcErr = null
  }

  if (rpcErr) {
    const msg = rpcErr.message
    if (/zaten teslim|finans kaydı zaten|Yetersiz stok/i.test(msg)) {
      return NextResponse.json({ error: msg }, { status: 409 })
    }
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const result = rpcResult as Record<string, unknown>

  const { data: updatedOrder } = await tenantQuery(
    admin.from('service_orders').select('*'),
    auth.tenantId,
  )
    .eq('id', id)
    .single()

  return NextResponse.json({
    ok: true,
    order: updatedOrder,
    finance_tx_id: result.finance_tx_id,
    account_id: result.account_id ?? null,
    account_balance: result.account_balance != null ? Number(result.account_balance) : undefined,
    service_fee: serviceFee,
    total_expense: result.total_expense,
    net_profit: result.net_profit,
    profit_margin: result.profit_margin,
    kasa_balance: result.kasa_balance != null ? Number(result.kasa_balance) : undefined,
    delivered_at: result.delivered_at,
    warranty_id: result.warranty_id ?? null,
    cash_shift_id: result.cash_shift_id ?? null,
  })
}, 'service-orders/deliver')
