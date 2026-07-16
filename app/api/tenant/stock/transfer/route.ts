export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { canWriteTenantData } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'

async function resolveBranchQty(
  admin: ReturnType<typeof getServiceClient>,
  tenantId: string,
  branchId: string,
  partId: string,
): Promise<number> {
  if (!admin) return 0

  const { data: row } = await admin
    .from('branch_part_stock')
    .select('qty')
    .eq('tenant_id', tenantId)
    .eq('branch_id', branchId)
    .eq('part_id', partId)
    .maybeSingle()

  if (row) return Number(row.qty) || 0

  const { count } = await admin
    .from('branch_part_stock')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('part_id', partId)

  if ((count ?? 0) > 0) return 0

  const { data: part } = await admin
    .from('parts')
    .select('stock_qty')
    .eq('tenant_id', tenantId)
    .eq('id', partId)
    .maybeSingle()

  const { data: branches } = await admin
    .from('branches')
    .select('id')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })
    .limit(1)

  const defaultBranchId = branches?.[0]?.id
  if (defaultBranchId === branchId) return Number(part?.stock_qty) || 0
  return 0
}

async function upsertBranchQty(
  admin: NonNullable<ReturnType<typeof getServiceClient>>,
  tenantId: string,
  branchId: string,
  partId: string,
  qty: number,
) {
  const { data: existing } = await admin
    .from('branch_part_stock')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('branch_id', branchId)
    .eq('part_id', partId)
    .maybeSingle()

  if (existing) {
    await admin
      .from('branch_part_stock')
      .update({ qty, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
  } else {
    await admin.from('branch_part_stock').insert({
      tenant_id: tenantId,
      branch_id: branchId,
      part_id: partId,
      qty,
    })
  }
}

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { data, error } = await auth.supabase
    .from('stock_transfers')
    .select(`
      id, qty, note, created_at,
      from_branch:from_branch_id(id, name),
      to_branch:to_branch_id(id, name),
      part:part_id(id, name)
    `)
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
  }

  let body: {
    from_branch_id?: string
    to_branch_id?: string
    part_id?: string
    qty?: number
    note?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const fromBranchId = body.from_branch_id
  const toBranchId = body.to_branch_id
  const partId = body.part_id
  const qty = Number(body.qty)

  if (!fromBranchId || !isUuid(fromBranchId) || !toBranchId || !isUuid(toBranchId)) {
    return NextResponse.json({ error: 'Geçerli from_branch_id ve to_branch_id gerekli' }, { status: 400 })
  }
  if (!partId || !isUuid(partId)) {
    return NextResponse.json({ error: 'Geçerli part_id gerekli' }, { status: 400 })
  }
  if (!qty || qty <= 0) {
    return NextResponse.json({ error: 'qty > 0 olmalı' }, { status: 400 })
  }
  if (fromBranchId === toBranchId) {
    return NextResponse.json({ error: 'Kaynak ve hedef şube farklı olmalı' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const available = await resolveBranchQty(admin, auth.tenantId, fromBranchId, partId)
  if (available < qty) {
    return NextResponse.json({
      error: `Yetersiz şube stoku (mevcut: ${available})`,
    }, { status: 400 })
  }

  const toQty = await resolveBranchQty(admin, auth.tenantId, toBranchId, partId)

  await upsertBranchQty(admin, auth.tenantId, fromBranchId, partId, available - qty)
  await upsertBranchQty(admin, auth.tenantId, toBranchId, partId, toQty + qty)

  const { data: transfer, error: trErr } = await admin
    .from('stock_transfers')
    .insert({
      tenant_id: auth.tenantId,
      from_branch_id: fromBranchId,
      to_branch_id: toBranchId,
      part_id: partId,
      qty,
      note: body.note?.trim() || null,
      created_by: auth.userId,
    })
    .select('*')
    .single()

  if (trErr) return NextResponse.json({ error: trErr.message }, { status: 500 })

  await admin.from('stock_movements').insert({
    tenant_id: auth.tenantId,
    part_id: partId,
    movement_type: 'transfer',
    quantity: qty,
    notes: `Şube transferi: ${fromBranchId} → ${toBranchId}${body.note ? ` — ${body.note}` : ''}`,
    reference_id: transfer.id,
    created_by: auth.userId,
  })

  return NextResponse.json({ ok: true, item: transfer }, { status: 201 })
}
