export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { canWriteTenantData } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { data, error } = await auth.supabase
    .from('supplier_orders')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Tedarik yetkisi yok' }, { status: 403 })
  }

  let body: {
    supplier_name?: string
    supplier_phone?: string
    service_order_id?: string
    service_job_no?: string
    items?: Array<{ name: string; qty: number; unit_price: number; stock_id?: string }>
    notes?: string
    expected_at?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.supplier_name?.trim() || !body.items?.length) {
    return NextResponse.json({ error: 'supplier_name ve items gerekli' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const year = new Date().getFullYear()
  const { count } = await admin
    .from('supplier_orders')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', auth.tenantId)

  const orderNo = `PO-${year}-${String((count ?? 0) + 1).padStart(4, '0')}`
  const items = body.items.map(i => ({
    name: i.name,
    qty: Number(i.qty) || 1,
    unit_price: Number(i.unit_price) || 0,
    stock_id: i.stock_id,
  }))
  const total = items.reduce((s, i) => s + i.qty * i.unit_price, 0)
  const id = crypto.randomUUID()

  const { data, error } = await admin
    .from('supplier_orders')
    .insert({
      id,
      tenant_id: auth.tenantId,
      order_no: orderNo,
      supplier_name: body.supplier_name.trim(),
      supplier_phone: body.supplier_phone || null,
      service_order_id: body.service_order_id && isUuid(body.service_order_id) ? body.service_order_id : null,
      service_job_no: body.service_job_no || null,
      items,
      total,
      status: 'pending',
      notes: body.notes || null,
      expected_at: body.expected_at || null,
      created_at: new Date().toISOString(),
    })
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Oluşturulamadı' }, { status: 500 })
  }

  if (body.service_order_id && isUuid(body.service_order_id)) {
    await admin
      .from('service_orders')
      .update({ status: 'tamir', updated_at: new Date().toISOString() })
      .eq('tenant_id', auth.tenantId)
      .eq('id', body.service_order_id)
  }

  return NextResponse.json({ ok: true, item: data }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Tedarik yetkisi yok' }, { status: 403 })
  }

  let body: { id?: string; status?: string; notes?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.id || !isUuid(body.id)) {
    return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  }

  const allowed = new Set(['pending', 'ordered', 'received', 'cancelled'])
  if (body.status && !allowed.has(body.status)) {
    return NextResponse.json({ error: 'Geçersiz status' }, { status: 400 })
  }
  if (body.status === 'received') {
    return NextResponse.json({
      error: 'Teslim için /api/tenant/supplier-orders/receive kullanın',
    }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const patch: Record<string, unknown> = {}
  if (body.status) patch.status = body.status
  if (body.notes !== undefined) patch.notes = body.notes

  const { data, error } = await admin
    .from('supplier_orders')
    .update(patch)
    .eq('tenant_id', auth.tenantId)
    .eq('id', body.id)
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Güncellenemedi' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, item: data })
}
