export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { canPushFinance } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { saleToDb, saleToStore } from '@/lib/db-mappers'
import { normalizePaymentMethod } from '@/lib/payment-method'
import type { CartItem } from '@/lib/store'

type SaleBody = {
  items: CartItem[]
  customer_name?: string
  payment_method: string
  vat_rate?: number
}

export async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get('limit')) || 30))
  const { data, error } = await auth.supabase
    .from('sales')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const items = (data ?? []).map(r => saleToStore(r as Record<string, unknown>))
  return NextResponse.json({ ok: true, items })
}

/** Legacy non-atomic path — RPC yoksa veya hata verirse */
async function completeSaleLegacy(
  admin: NonNullable<ReturnType<typeof getServiceClient>>,
  auth: { tenantId: string; userId: string },
  body: SaleBody,
  validated: Array<CartItem & { buy_price?: number }>,
) {
  const subtotal = validated.reduce((s, i) => s + i.unit_price * i.qty, 0)
  const vatRate = body.vat_rate ?? 20
  const vatAmount = subtotal * (vatRate / 100)
  const totalWithVat = subtotal + vatAmount
  const costPrice = validated.reduce((s, i) => s + (i.buy_price ?? 0) * i.qty, 0)
  const saleId = crypto.randomUUID()
  const appliedStock: Array<{ id: string; qty: number }> = []

  try {
    for (const item of validated) {
      const { data: part } = await admin
        .from('parts')
        .select('stock_qty')
        .eq('tenant_id', auth.tenantId)
        .eq('id', item.stock_id)
        .single()

      const newQty = Number(part?.stock_qty ?? 0) - item.qty
      if (newQty < 0) {
        throw new Error(`Stok yetersiz: ${item.name}`)
      }

      const { error: stockErr } = await admin
        .from('parts')
        .update({ stock_qty: newQty })
        .eq('tenant_id', auth.tenantId)
        .eq('id', item.stock_id)

      if (stockErr) throw new Error(stockErr.message)
      appliedStock.push({ id: item.stock_id, qty: item.qty })

      await admin.from('stock_movements').insert({
        tenant_id: auth.tenantId,
        part_id: item.stock_id,
        movement_type: 'cikis',
        quantity: item.qty,
        notes: `POS satış — ${item.name}`,
        reference_id: saleId,
        created_by: auth.userId,
      })
    }

    const paymentMethod = normalizePaymentMethod(body.payment_method)
    const { data: openShift } = await admin
      .from('cash_shifts')
      .select('id')
      .eq('tenant_id', auth.tenantId)
      .eq('status', 'open')
      .maybeSingle()
    const cashShiftId = openShift?.id ? String(openShift.id) : null

    const saleRow = saleToDb(
      {
        id: saleId,
        date: new Date().toISOString(),
        customer_name: body.customer_name ?? 'Perakende',
        items: validated,
        subtotal,
        cost_price: costPrice,
        gross_profit: subtotal - costPrice,
        expenses: [],
        expense_total: 0,
        net_profit: subtotal - costPrice,
        profit_margin: subtotal > 0 ? ((subtotal - costPrice) / subtotal) * 100 : 0,
        vat_rate: vatRate,
        vat_amount: vatAmount,
        total_with_vat: totalWithVat,
        payment_method: paymentMethod,
      },
      auth.tenantId,
      auth.userId,
      { cash_shift_id: cashShiftId },
    )

    const { error: saleErr } = await admin.from('sales').insert(saleRow)
    if (saleErr) throw new Error(saleErr.message)

    const transactionId = crypto.randomUUID()
    const { error: txErr } = await admin.from('financial_transactions').insert({
      id: transactionId,
      tenant_id: auth.tenantId,
      type: 'gelir',
      description: `POS Satış — ${body.items.map(i => i.name).join(', ')}`,
      category: 'Satış',
      amount: totalWithVat,
      payment_method: paymentMethod,
      transaction_date: new Date().toISOString(),
      customer_name: body.customer_name ?? 'Perakende',
      created_by: auth.userId,
      reference_id: cashShiftId,
    })
    if (txErr) throw new Error(txErr.message)

    if (paymentMethod === 'veresiye') {
      await admin.from('financial_transactions').insert({
        tenant_id: auth.tenantId,
        type: 'gider',
        description: `Veresiye satış — ${body.items.map(i => i.name).join(', ')}`,
        category: 'Cari Borç',
        amount: totalWithVat,
        payment_method: 'veresiye',
        transaction_date: new Date().toISOString(),
        customer_name: body.customer_name ?? 'Perakende',
        created_by: auth.userId,
      })
    }

    let newBalance: number | undefined
    if (paymentMethod === 'nakit') {
      const { data: bal, error: kasaErr } = await admin.rpc('adjust_kasa_balance', {
        p_tenant_id: auth.tenantId,
        p_delta: totalWithVat,
      })
      if (kasaErr) throw new Error(kasaErr.message)
      newBalance = Number(bal)
    }

    return {
      sale_id: saleId,
      transaction_id: transactionId,
      cash_shift_id: cashShiftId,
      total_with_vat: totalWithVat,
      subtotal,
      vat_rate: vatRate,
      vat_amount: vatAmount,
      cost_price: costPrice,
      kasa_balance: newBalance,
      sale: saleRow,
      atomic: false,
    }
  } catch (e) {
    // Kısmi stok düşümünü geri al
    for (const s of appliedStock.reverse()) {
      const { data: part } = await admin.from('parts').select('stock_qty').eq('id', s.id).maybeSingle()
      if (part) {
        await admin.from('parts').update({ stock_qty: Number(part.stock_qty) + s.qty }).eq('id', s.id)
      }
    }
    throw e
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canPushFinance(auth.role)) {
    return NextResponse.json({ error: 'Satış yetkisi yok' }, { status: 403 })
  }

  let body: SaleBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const items = body.items ?? []
  if (!items.length) {
    return NextResponse.json({ error: 'Sepet boş' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  type SaleLine = CartItem & { buy_price?: number }
  const validated: SaleLine[] = []
  const qtyByStockId = new Map<string, number>()
  for (const item of items) {
    if (!isUuid(item.stock_id)) {
      return NextResponse.json({ error: `Geçersiz stok id: ${item.name}` }, { status: 400 })
    }
    qtyByStockId.set(item.stock_id, (qtyByStockId.get(item.stock_id) ?? 0) + item.qty)
  }

  for (const item of items) {
    const { data: part } = await admin
      .from('parts')
      .select('id, name, stock_qty, purchase_price')
      .eq('tenant_id', auth.tenantId)
      .eq('id', item.stock_id)
      .maybeSingle()

    const requestedTotal = qtyByStockId.get(item.stock_id) ?? item.qty
    if (!part || Number(part.stock_qty) < requestedTotal) {
      return NextResponse.json({
        error: `Yetersiz stok: ${item.name} (mevcut: ${part?.stock_qty ?? 0})`,
      }, { status: 409 })
    }
    validated.push({ ...item, buy_price: Number(part.purchase_price) || 0 })
  }

  const paymentMethod = normalizePaymentMethod(body.payment_method)
  const vatRate = body.vat_rate ?? 20
  const rpcItems = validated.map(i => ({
    stock_id: i.stock_id,
    name: i.name,
    qty: i.qty,
    unit_price: i.unit_price,
  }))

  const { data: rpcResult, error: rpcErr } = await admin.rpc('complete_pos_sale', {
    p_tenant_id: auth.tenantId,
    p_user_id: auth.userId,
    p_items: rpcItems,
    p_customer_name: body.customer_name ?? 'Perakende',
    p_payment_method: paymentMethod,
    p_vat_rate: vatRate,
  })

  if (!rpcErr && rpcResult && (rpcResult as { ok?: boolean }).ok !== false) {
    const r = rpcResult as {
      sale_id: string
      transaction_id: string
      cash_shift_id?: string
      total_with_vat: number
      subtotal: number
      vat_amount: number
      cost_price?: number
      kasa_balance?: number
    }
    const updatedParts = []
    for (const item of validated) {
      const { data: part } = await admin
        .from('parts')
        .select('*')
        .eq('tenant_id', auth.tenantId)
        .eq('id', item.stock_id)
        .maybeSingle()
      if (part) updatedParts.push(part)
    }
    return NextResponse.json({
      ok: true,
      atomic: true,
      sale_id: r.sale_id,
      transaction_id: r.transaction_id,
      cash_shift_id: r.cash_shift_id ?? null,
      total_with_vat: Number(r.total_with_vat),
      subtotal: Number(r.subtotal),
      vat_rate: vatRate,
      vat_amount: Number(r.vat_amount),
      cost_price: Number(r.cost_price) || 0,
      kasa_balance: r.kasa_balance != null ? Number(r.kasa_balance) : undefined,
      parts: updatedParts,
    })
  }

  // RPC yok / şema uyumsuz → legacy + stok rollback
  try {
    const legacy = await completeSaleLegacy(admin, auth, { ...body, payment_method: paymentMethod }, validated)
    const updatedParts = []
    for (const item of validated) {
      const { data: part } = await admin
        .from('parts')
        .select('*')
        .eq('tenant_id', auth.tenantId)
        .eq('id', item.stock_id)
        .maybeSingle()
      if (part) updatedParts.push(part)
    }
    return NextResponse.json({ ok: true, ...legacy, parts: updatedParts })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Satış başarısız'
    return NextResponse.json({
      error: msg,
      rpc_fallback: rpcErr?.message ?? null,
    }, { status: 500 })
  }
}
