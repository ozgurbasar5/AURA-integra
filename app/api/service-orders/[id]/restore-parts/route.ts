export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { canWriteTenantData } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { partToStock } from '@/lib/db-mappers'

type RouteParams = { params: { id: string } }

/** Parça silme — stok iade */
export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
  }
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: 'Geçersiz sipariş id' }, { status: 400 })
  }

  let body: { stock_id?: string; qty?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const stockId = body.stock_id
  const qty = Number(body.qty) || 1
  if (!stockId || !isUuid(stockId) || qty <= 0) {
    return NextResponse.json({ error: 'stock_id ve qty gerekli' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const { data: order } = await admin
    .from('service_orders')
    .select('id, status, order_no, metadata')
    .eq('tenant_id', auth.tenantId)
    .eq('id', params.id)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'Sipariş bulunamadı' }, { status: 404 })
  if (order.status === 'teslim') {
    return NextResponse.json({ error: 'Teslim edilmiş işte parça iade edilemez' }, { status: 409 })
  }

  const { data: part } = await admin
    .from('parts')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .eq('id', stockId)
    .maybeSingle()

  if (!part) return NextResponse.json({ error: 'Parça bulunamadı' }, { status: 404 })

  const newQty = (Number(part.stock_qty) || 0) + qty
  const { data: updated, error: updErr } = await admin
    .from('parts')
    .update({ stock_qty: newQty })
    .eq('tenant_id', auth.tenantId)
    .eq('id', stockId)
    .select('*')
    .single()

  if (updErr || !updated) {
    return NextResponse.json({ error: updErr?.message || 'Stok güncellenemedi' }, { status: 500 })
  }

  await admin.from('stock_movements').insert({
    tenant_id: auth.tenantId,
    part_id: stockId,
    movement_type: 'iade',
    quantity: qty,
    notes: `Servis parça iade — ${order.order_no}`,
    reference_id: params.id,
    created_by: auth.userId,
  })

  const meta = (order.metadata as Record<string, unknown>) ?? {}
  const used = Array.isArray(meta.used_parts) ? [...(meta.used_parts as Array<Record<string, unknown>>)] : []
  const nextUsed: Array<Record<string, unknown>> = []
  let remaining = qty
  for (const row of used) {
    const id = String(row.id ?? row.stock_id ?? '')
    if (id !== stockId) {
      nextUsed.push(row)
      continue
    }
    const rowQty = Number(row.qty) || 0
    if (rowQty > remaining) {
      nextUsed.push({ ...row, qty: rowQty - remaining })
      remaining = 0
    } else {
      remaining -= rowQty
    }
  }

  await admin
    .from('service_orders')
    .update({
      metadata: { ...meta, used_parts: nextUsed },
      updated_at: new Date().toISOString(),
    })
    .eq('tenant_id', auth.tenantId)
    .eq('id', params.id)

  return NextResponse.json({
    ok: true,
    stock_item: partToStock(updated as Record<string, unknown>),
    used_parts: nextUsed,
  })
}
