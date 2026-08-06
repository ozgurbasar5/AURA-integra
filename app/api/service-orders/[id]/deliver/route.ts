export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { tenantQuery } from '@/lib/supabase/query-helpers'
import { canPushFinance } from '@/lib/api-role-guard'
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

export const POST = withApiHandler(async function POST(req: NextRequest, ctx: RouteContext) {
  const params = ctx.params ?? {}
  const id = params.id
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canPushFinance(auth.role)) {
    return NextResponse.json({ error: 'Teslim / finans yetkisi yok' }, { status: 403 })
  }
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'Geçersiz sipariş id' }, { status: 400 })
  }

  let body: {
    service_fee?: number
    payment_method?: string
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

  const { data: rpcResult, error: rpcErr } = await admin.rpc('complete_service_delivery', {
    p_tenant_id: auth.tenantId,
    p_user_id: auth.userId,
    p_order_id: id,
    p_service_fee: serviceFee,
    p_payment_method: paymentMethod,
    p_used_parts: usedPartsJson,
    p_warranty_months: body.warranty_months ?? null,
    p_final_checks: body.final_checks ?? null,
  })

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
    service_fee: serviceFee,
    total_expense: result.total_expense,
    net_profit: result.net_profit,
    profit_margin: result.profit_margin,
    kasa_balance: result.kasa_balance,
    delivered_at: result.delivered_at,
    warranty_id: result.warranty_id ?? null,
  })
}, 'service-orders/deliver')
