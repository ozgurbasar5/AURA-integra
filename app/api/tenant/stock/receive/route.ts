export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { canPushFinance } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { partToStock } from '@/lib/db-mappers'
import { normalizePaymentMethod } from '@/lib/payment-method'

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canPushFinance(auth.role)) {
    return NextResponse.json({ error: 'Stok giriş yetkisi yok' }, { status: 403 })
  }

  let body: {
    part_id?: string
    qty?: number
    total_cost?: number
    supplier?: string
    item_name?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const partId = body.part_id
  const qty = Number(body.qty)
  const totalCost = Number(body.total_cost)
  if (!partId || !isUuid(partId) || !qty || qty <= 0 || totalCost < 0) {
    return NextResponse.json({ error: 'part_id (UUID), qty ve total_cost gerekli' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const { data: part, error: fetchErr } = await admin
    .from('parts')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .eq('id', partId)
    .single()

  if (fetchErr || !part) {
    return NextResponse.json({ error: 'Parça bulunamadı' }, { status: 404 })
  }

  const newQty = Number(part.stock_qty) + qty
  const { data: updated, error: updErr } = await admin
    .from('parts')
    .update({ stock_qty: newQty })
    .eq('tenant_id', auth.tenantId)
    .eq('id', partId)
    .select('*')
    .single()

  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 })

  const itemName = body.item_name || String(part.name ?? 'Parça')
  const { error: txErr } = await admin.from('financial_transactions').insert({
    tenant_id: auth.tenantId,
    type: 'gider',
    description: `Stok alımı — ${itemName} (${qty} adet)`,
    category: 'Tedarikçi',
    amount: totalCost,
    payment_method: normalizePaymentMethod('havale'),
    transaction_date: new Date().toISOString(),
    created_by: auth.userId,
  })
  if (txErr) return NextResponse.json({ error: txErr.message }, { status: 500 })

  const { data: kasaBalance, error: kasaErr } = await admin.rpc('adjust_kasa_balance', {
    p_tenant_id: auth.tenantId,
    p_delta: -totalCost,
  })
  if (kasaErr) return NextResponse.json({ error: kasaErr.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    item: updated,
    stock_item: partToStock(updated as Record<string, unknown>),
    kasa_balance: Number(kasaBalance),
  })
}
