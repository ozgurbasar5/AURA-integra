export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { canPushFinance } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { saleToDb } from '@/lib/db-mappers'
import { normalizePaymentMethod } from '@/lib/payment-method'
import type { CartItem } from '@/lib/store'

type SaleBody = {
  items: CartItem[]
  customer_name?: string
  payment_method: string
  vat_rate?: number
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

  for (const item of items) {
    const { data: part } = await admin
      .from('parts')
      .select('id, name, stock_qty, buy_price')
      .eq('tenant_id', auth.tenantId)
      .eq('id', item.stock_id)
      .maybeSingle()

    if (!part || Number(part.stock_qty) < item.qty) {
      return NextResponse.json({
        error: `Yetersiz stok: ${item.name} (mevcut: ${part?.stock_qty ?? 0})`,
      }, { status: 409 })
    }
    validated.push({ ...item, buy_price: Number(part.buy_price) || 0 })
  }

  const subtotal = validated.reduce((s, i) => s + i.unit_price * i.qty, 0)
  const vatRate = body.vat_rate ?? 20
  const vatAmount = subtotal * (vatRate / 100)
  const totalWithVat = subtotal + vatAmount
  const costPrice = validated.reduce((s, i) => s + (i.buy_price ?? 0) * i.qty, 0)
  const saleId = crypto.randomUUID()

  for (const item of validated) {
    const { data: part } = await admin
      .from('parts')
      .select('stock_qty')
      .eq('tenant_id', auth.tenantId)
      .eq('id', item.stock_id)
      .single()

    const newQty = Number(part?.stock_qty ?? 0) - item.qty
    if (newQty < 0) {
      return NextResponse.json({ error: `Stok yetersiz: ${item.name}` }, { status: 409 })
    }

    const { error: stockErr } = await admin
      .from('parts')
      .update({ stock_qty: newQty })
      .eq('tenant_id', auth.tenantId)
      .eq('id', item.stock_id)

    if (stockErr) return NextResponse.json({ error: stockErr.message }, { status: 500 })
  }

  const paymentMethod = normalizePaymentMethod(body.payment_method)

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
  )

  const { error: saleErr } = await admin.from('sales').insert(saleRow)
  if (saleErr) return NextResponse.json({ error: saleErr.message }, { status: 500 })

  const { error: txErr } = await admin.from('financial_transactions').insert({
    tenant_id: auth.tenantId,
    type: 'gelir',
    description: `POS Satış — ${items.map(i => i.name).join(', ')}`,
    category: 'Satış',
    amount: totalWithVat,
    payment_method: paymentMethod,
    transaction_date: new Date().toISOString(),
    customer_name: body.customer_name ?? 'Perakende',
    created_by: auth.userId,
  })
  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 })

  const { data: newBalance, error: kasaErr } = await admin.rpc('adjust_kasa_balance', {
    p_tenant_id: auth.tenantId,
    p_delta: totalWithVat,
  })
  if (kasaErr) return NextResponse.json({ error: kasaErr.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    sale_id: saleId,
    total_with_vat: totalWithVat,
    kasa_balance: Number(newBalance),
  })
}
