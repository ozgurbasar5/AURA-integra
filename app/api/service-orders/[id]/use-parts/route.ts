export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { canWriteTenantData } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { partToStock } from '@/lib/db-mappers'

type RouteParams = { params: { id: string } }

type UsedPartBody = {
  stock_id: string
  name?: string
  qty: number
  unit_buy?: number
  unit_sell?: number
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Parça düşüm yetkisi yok' }, { status: 403 })
  }
  if (!isUuid(params.id)) {
    return NextResponse.json({ error: 'Geçersiz sipariş id' }, { status: 400 })
  }

  let body: { parts?: UsedPartBody[] }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const parts = body.parts ?? []
  if (!parts.length) {
    return NextResponse.json({ error: 'parts gerekli' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const { data: order, error: orderErr } = await admin
    .from('service_orders')
    .select('id, status, order_no, metadata')
    .eq('tenant_id', auth.tenantId)
    .eq('id', params.id)
    .maybeSingle()

  if (orderErr || !order) {
    return NextResponse.json({ error: 'Servis kaydı bulunamadı' }, { status: 404 })
  }
  if (order.status === 'teslim') {
    return NextResponse.json({ error: 'Teslim edilmiş işe parça eklenemez' }, { status: 409 })
  }

  const updatedParts = []
  const applied: UsedPartBody[] = []

  for (const p of parts) {
    if (!p.stock_id || !isUuid(p.stock_id) || !p.qty || p.qty <= 0) {
      return NextResponse.json({ error: 'Geçersiz parça satırı' }, { status: 400 })
    }

    const { data: part, error: partErr } = await admin
      .from('parts')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .eq('id', p.stock_id)
      .maybeSingle()

    if (partErr || !part) {
      return NextResponse.json({ error: `Parça bulunamadı: ${p.name || p.stock_id}` }, { status: 404 })
    }

    const currentQty = Number(part.stock_qty) || 0
    if (currentQty < p.qty) {
      return NextResponse.json({
        error: `Yetersiz stok: ${part.name} (mevcut: ${currentQty})`,
      }, { status: 409 })
    }

    const newQty = currentQty - p.qty
    const { data: updated, error: updErr } = await admin
      .from('parts')
      .update({ stock_qty: newQty })
      .eq('tenant_id', auth.tenantId)
      .eq('id', p.stock_id)
      .select('*')
      .single()

    if (updErr || !updated) {
      return NextResponse.json({ error: updErr?.message || 'Stok güncellenemedi' }, { status: 500 })
    }

    await admin.from('stock_movements').insert({
      tenant_id: auth.tenantId,
      part_id: p.stock_id,
      movement_type: 'cikis',
      quantity: p.qty,
      notes: `Servis parça — ${order.order_no}`,
      reference_id: params.id,
      created_by: auth.userId,
    })

    await admin.from('service_parts_used').insert({
      order_id: params.id,
      part_id: p.stock_id,
      quantity: p.qty,
      unit_price: Number(p.unit_sell ?? part.sale_price) || 0,
      unit_cost: Number(p.unit_buy ?? part.purchase_price) || 0,
      part_name: String(part.name),
      service_order_id: params.id,
    })

    applied.push({
      stock_id: p.stock_id,
      name: String(part.name),
      qty: p.qty,
      unit_buy: Number(p.unit_buy ?? part.purchase_price) || 0,
      unit_sell: Number(p.unit_sell ?? part.sale_price) || 0,
    })
    updatedParts.push(updated)
  }

  const meta = (order.metadata as Record<string, unknown>) ?? {}
  const prevUsed = Array.isArray(meta.used_parts) ? meta.used_parts : []
  const nextUsed = [
    ...prevUsed,
    ...applied.map(p => ({
      id: p.stock_id,
      name: p.name,
      qty: p.qty,
      unit_buy: p.unit_buy,
      unit_sell: p.unit_sell,
      stock_deducted: true,
    })),
  ]

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
    parts: applied,
    stock_items: updatedParts.map(r => partToStock(r as Record<string, unknown>)),
    used_parts: nextUsed,
  })
}
