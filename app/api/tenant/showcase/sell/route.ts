export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { canPushFinance } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { normalizePaymentMethod } from '@/lib/payment-method'
import { saleToDb } from '@/lib/db-mappers'

/** Vitrin cihazı → POS satış + kasa */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canPushFinance(auth.role)) {
    return NextResponse.json({ error: 'Satış yetkisi yok' }, { status: 403 })
  }

  let body: {
    device_id?: string
    payment_method?: string
    customer_name?: string
    sell_price?: number
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.device_id || !isUuid(body.device_id)) {
    return NextResponse.json({ error: 'device_id gerekli' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const { data: device, error: devErr } = await admin
    .from('showcase_devices')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .eq('id', body.device_id)
    .maybeSingle()

  if (devErr || !device) {
    return NextResponse.json({ error: 'Cihaz bulunamadı' }, { status: 404 })
  }
  if (device.status === 'satildi') {
    return NextResponse.json({ error: 'Cihaz zaten satılmış' }, { status: 409 })
  }

  const sellPrice = Number(body.sell_price ?? device.sell_price) || 0
  const buyPrice = Number(device.buy_price) || 0
  if (sellPrice <= 0) {
    return NextResponse.json({ error: 'Satış fiyatı gerekli' }, { status: 400 })
  }

  const paymentMethod = normalizePaymentMethod(body.payment_method || 'nakit')
  const saleId = crypto.randomUUID()
  const name = `${device.brand} ${device.model}`.trim()

  const { data: openShift } = await admin
    .from('cash_shifts')
    .select('id')
    .eq('tenant_id', auth.tenantId)
    .eq('status', 'open')
    .maybeSingle()

  const saleRow = saleToDb(
    {
      id: saleId,
      date: new Date().toISOString(),
      customer_name: body.customer_name || 'Vitrin satış',
      items: [{
        stock_id: body.device_id,
        name,
        qty: 1,
        unit_price: sellPrice,
      }],
      subtotal: sellPrice,
      cost_price: buyPrice,
      gross_profit: sellPrice - buyPrice,
      expenses: [],
      expense_total: 0,
      net_profit: sellPrice - buyPrice,
      profit_margin: sellPrice > 0 ? ((sellPrice - buyPrice) / sellPrice) * 100 : 0,
      vat_rate: 0,
      vat_amount: 0,
      total_with_vat: sellPrice,
      payment_method: paymentMethod,
    },
    auth.tenantId,
    auth.userId,
    { cash_shift_id: openShift?.id ? String(openShift.id) : null },
  )

  const { error: saleErr } = await admin.from('sales').insert(saleRow)
  if (saleErr) return NextResponse.json({ error: saleErr.message }, { status: 500 })

  const { error: txErr } = await admin.from('financial_transactions').insert({
    tenant_id: auth.tenantId,
    type: 'gelir',
    description: `Vitrin satış — ${name}`,
    category: 'Vitrin',
    amount: sellPrice,
    payment_method: paymentMethod,
    transaction_date: new Date().toISOString(),
    customer_name: body.customer_name || 'Vitrin satış',
    created_by: auth.userId,
    reference_id: openShift?.id || saleId,
  })
  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 })

  let kasaBalance: number | undefined
  if (paymentMethod === 'nakit') {
    const { data: bal, error: kasaErr } = await admin.rpc('adjust_kasa_balance', {
      p_tenant_id: auth.tenantId,
      p_delta: sellPrice,
    })
    if (kasaErr) return NextResponse.json({ error: kasaErr.message }, { status: 500 })
    kasaBalance = Number(bal)
  } else if (paymentMethod === 'veresiye') {
    await admin.from('financial_transactions').insert({
      tenant_id: auth.tenantId,
      type: 'gider',
      description: `Veresiye — ${name}`,
      category: 'Cari Borç',
      amount: sellPrice,
      payment_method: 'veresiye',
      transaction_date: new Date().toISOString(),
      customer_name: body.customer_name || 'Vitrin satış',
      created_by: auth.userId,
    })
  }

  const { data: updated, error: updErr } = await admin
    .from('showcase_devices')
    .update({ status: 'satildi', sold_at: new Date().toISOString(), showcase: false })
    .eq('tenant_id', auth.tenantId)
    .eq('id', body.device_id)
    .select('*')
    .single()

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    sale_id: saleId,
    device: updated,
    kasa_balance: kasaBalance,
  })
}
