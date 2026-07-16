export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { canPushFinance } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { normalizePaymentMethod } from '@/lib/payment-method'
import { partToStock, warrantyToDb } from '@/lib/db-mappers'
import type { WarrantyRecord } from '@/lib/store'

type RouteParams = { params: { id: string } }

type UsedPartBody = {
  stock_id: string
  name?: string
  qty: number
  unit_buy?: number
  unit_sell?: number
  stock_deducted?: boolean
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canPushFinance(auth.role)) {
    return NextResponse.json({ error: 'Teslim / finans yetkisi yok' }, { status: 403 })
  }
  if (!isUuid(params.id)) {
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

  const { data: order, error: orderErr } = await admin
    .from('service_orders')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .eq('id', params.id)
    .maybeSingle()

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Servis kaydı bulunamadı' }, { status: 404 })
  }
  if (order.status === 'teslim') {
    return NextResponse.json({ error: 'Bu iş zaten teslim edilmiş' }, { status: 409 })
  }

  const { data: existingTx } = await admin
    .from('financial_transactions')
    .select('id')
    .eq('tenant_id', auth.tenantId)
    .eq('service_id', params.id)
    .eq('category', 'Servis Teslim')
    .limit(1)

  if (existingTx?.length) {
    return NextResponse.json({ error: 'Bu iş için finans kaydı zaten var' }, { status: 409 })
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

  const updatedStock = []
  let totalExpense = 0

  for (const p of usedParts) {
    if (!p.stock_id || !isUuid(p.stock_id) || !p.qty || p.qty <= 0) continue
    const unitBuy = Number(p.unit_buy) || 0
    totalExpense += unitBuy * p.qty

    if (p.stock_deducted) continue

    const { data: part } = await admin
      .from('parts')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .eq('id', p.stock_id)
      .maybeSingle()

    if (!part) {
      return NextResponse.json({ error: `Parça bulunamadı: ${p.name || p.stock_id}` }, { status: 404 })
    }

    const currentQty = Number(part.stock_qty) || 0
    if (currentQty < p.qty) {
      return NextResponse.json({
        error: `Yetersiz stok: ${part.name} (mevcut: ${currentQty})`,
      }, { status: 409 })
    }

    const { data: updated, error: updErr } = await admin
      .from('parts')
      .update({ stock_qty: currentQty - p.qty })
      .eq('tenant_id', auth.tenantId)
      .eq('id', p.stock_id)
      .select('*')
      .single()

    if (updErr || !updated) {
      return NextResponse.json({ error: updErr?.message || 'Stok düşülemedi' }, { status: 500 })
    }

    await admin.from('stock_movements').insert({
      tenant_id: auth.tenantId,
      part_id: p.stock_id,
      movement_type: 'cikis',
      quantity: p.qty,
      notes: `Servis teslim — ${order.order_no}`,
      reference_id: params.id,
      created_by: auth.userId,
    })

    updatedStock.push(partToStock(updated as Record<string, unknown>))
  }

  const paymentMethod = normalizePaymentMethod(body.payment_method)
  const deliveredAt = new Date().toISOString()
  const netProfit = serviceFee - totalExpense
  const financeTxId = crypto.randomUUID()

  const { data: openShift } = await admin
    .from('cash_shifts')
    .select('id')
    .eq('tenant_id', auth.tenantId)
    .eq('status', 'open')
    .maybeSingle()
  const cashShiftId = openShift?.id ? String(openShift.id) : null

  const { error: gelirErr } = await admin.from('financial_transactions').insert({
    id: financeTxId,
    tenant_id: auth.tenantId,
    type: 'gelir',
    description: `Servis teslim — ${order.order_no}`,
    category: 'Servis Teslim',
    amount: serviceFee,
    payment_method: paymentMethod,
    transaction_date: deliveredAt,
    customer_name: order.customer_name,
    order_no: order.order_no,
    service_id: params.id,
    financial_posted: true,
    created_by: auth.userId,
    reference_id: cashShiftId,
  })
  if (gelirErr) return NextResponse.json({ error: gelirErr.message }, { status: 500 })

  // Not: parça maliyeti alış sırasında zaten 'Alış' gideri olarak kaydedildi ve
  // kasadan düşüldü; burada tekrar gider yazmak/kasadan düşmek çift sayım olur.

  if (paymentMethod === 'veresiye') {
    await admin.from('financial_transactions').insert({
      tenant_id: auth.tenantId,
      type: 'gider',
      description: `Veresiye teslim — ${order.order_no}`,
      category: 'Cari Borç',
      amount: serviceFee,
      payment_method: 'veresiye',
      transaction_date: deliveredAt,
      customer_name: order.customer_name,
      order_no: order.order_no,
      service_id: params.id,
      created_by: auth.userId,
    })
  }

  // Nakit kasa yalnızca nakit tahsilatta artar; kart/havale/veresiye kasaya girmez
  let kasaBalance: number | undefined
  if (paymentMethod === 'nakit') {
    const { data: bal, error: kasaErr } = await admin.rpc('adjust_kasa_balance', {
      p_tenant_id: auth.tenantId,
      p_delta: serviceFee,
    })
    if (kasaErr) return NextResponse.json({ error: kasaErr.message }, { status: 500 })
    kasaBalance = Number(bal)
  }

  const usedPartsMeta = usedParts.map(p => ({
    id: p.stock_id,
    name: p.name,
    qty: p.qty,
    unit_buy: p.unit_buy,
    unit_sell: p.unit_sell,
    stock_deducted: true,
  }))

  const { data: updatedOrder, error: statusErr } = await admin
    .from('service_orders')
    .update({
      status: 'teslim',
      actual_cost: serviceFee,
      closed_at: deliveredAt,
      updated_at: deliveredAt,
      metadata: {
        ...meta,
        used_parts: usedPartsMeta,
        final_checks: body.final_checks ?? meta.final_checks,
        financial_posted: true,
        net_profit: netProfit,
        delivered_at: deliveredAt,
      },
    })
    .eq('tenant_id', auth.tenantId)
    .eq('id', params.id)
    .select('*')
    .single()

  if (statusErr || !updatedOrder) {
    return NextResponse.json({ error: statusErr?.message || 'Durum güncellenemedi' }, { status: 500 })
  }

  await admin.from('service_status_history').insert({
    order_id: params.id,
    status: 'teslim',
    note: 'Teslim edildi (API).',
    created_by: auth.userId,
  })

  let warranty: WarrantyRecord | null = null
  const warrantyMonths = body.warranty_months
  if (warrantyMonths != null && warrantyMonths > 0) {
    const start = deliveredAt.split('T')[0]
    const endDate = new Date(start)
    // Ay sonu taşmasını önle (örn. 31 Oca + 1 ay = 3 Mart olmasın, 28/29 Şubat olsun)
    const targetDay = endDate.getDate()
    endDate.setDate(1)
    endDate.setMonth(endDate.getMonth() + warrantyMonths)
    const lastDayOfMonth = new Date(endDate.getFullYear(), endDate.getMonth() + 1, 0).getDate()
    endDate.setDate(Math.min(targetDay, lastDayOfMonth))
    const record = {
      id: crypto.randomUUID(),
      order_id: params.id,
      customer_id: '',
      imei: order.imei ? String(order.imei) : undefined,
      device_brand: String(order.device_brand ?? ''),
      device_model: String(order.device_model ?? ''),
      warranty_months: warrantyMonths,
      start_date: start,
      end_date: endDate.toISOString().split('T')[0],
      covered_parts: ['İşçilik', 'Değiştirilen Parçalar'],
      terms: 'Servis sonrası garanti',
      status: 'aktif' as const,
      customer_name: String(order.customer_name ?? ''),
      order_no: String(order.order_no ?? ''),
      created_at: deliveredAt,
    } satisfies WarrantyRecord

    const row = warrantyToDb(record, auth.tenantId)
    row.id = record.id
    const { data: wRow } = await admin.from('warranties').insert(row).select('*').maybeSingle()
    if (wRow) warranty = record
  }

  return NextResponse.json({
    ok: true,
    order: updatedOrder,
    finance_tx_id: financeTxId,
    service_fee: serviceFee,
    total_expense: totalExpense,
    net_profit: netProfit,
    profit_margin: serviceFee > 0 ? Math.round((netProfit / serviceFee) * 10000) / 100 : 0,
    kasa_balance: kasaBalance,
    stock_items: updatedStock,
    warranty,
    delivered_at: deliveredAt,
  })
}
