export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { canWriteTenantData } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { partToStock } from '@/lib/db-mappers'

type CountItem = {
  part_id: string
  counted_qty: number
  expected_qty?: number
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Sayım yetkisi yok' }, { status: 403 })
  }

  let body: { items?: CountItem[]; notes?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const items = (body.items ?? []).filter(i => i.part_id && isUuid(i.part_id) && i.counted_qty >= 0)
  if (!items.length) {
    return NextResponse.json({ error: 'items gerekli' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const countId = crypto.randomUUID()
  const today = new Date().toISOString().slice(0, 10)
  const now = new Date().toISOString()

  const { error: countErr } = await admin.from('stock_counts').insert({
    id: countId,
    tenant_id: auth.tenantId,
    count_date: today,
    status: 'completed',
    notes: body.notes || 'Stok sayım',
    created_by: auth.userId,
    completed_at: now,
  })
  if (countErr) {
    // stock_counts opsiyonel — devam et
    console.warn('[stock/count]', countErr.message)
  }

  const updatedItems = []
  let adjusted = 0

  for (const item of items) {
    const { data: part, error: fetchErr } = await admin
      .from('parts')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .eq('id', item.part_id)
      .maybeSingle()

    if (fetchErr || !part) {
      return NextResponse.json({ error: `Parça bulunamadı: ${item.part_id}` }, { status: 404 })
    }

    const systemQty = item.expected_qty != null ? Number(item.expected_qty) : Number(part.stock_qty) || 0
    const counted = Number(item.counted_qty)
    const diff = counted - systemQty

    if (diff === 0) continue

    const { data: updated, error: updErr } = await admin
      .from('parts')
      .update({ stock_qty: counted })
      .eq('tenant_id', auth.tenantId)
      .eq('id', item.part_id)
      .select('*')
      .single()

    if (updErr || !updated) {
      return NextResponse.json({ error: updErr?.message || 'Stok güncellenemedi' }, { status: 500 })
    }

    await admin.from('stock_movements').insert({
      tenant_id: auth.tenantId,
      part_id: item.part_id,
      movement_type: diff > 0 ? 'giris' : 'fire',
      quantity: Math.abs(diff),
      notes: `Sayım farkı (${systemQty} → ${counted})`,
      reference_id: countId,
      created_by: auth.userId,
    })

    await admin.from('stock_count_items').insert({
      count_id: countId,
      part_id: item.part_id,
      system_qty: systemQty,
      counted_qty: counted,
      difference: diff,
      notes: `Sayım ${today}`,
    })

    updatedItems.push(partToStock(updated as Record<string, unknown>))
    adjusted += 1
  }

  return NextResponse.json({
    ok: true,
    count_id: countId,
    adjusted,
    items: updatedItems,
  })
}
