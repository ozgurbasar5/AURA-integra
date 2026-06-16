export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { mapStoreStatusToDb } from '@/lib/erp-features'

type RouteParams = { params: { token: string } }

export async function GET(_req: NextRequest, { params }: RouteParams) {
  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Servis kullanılamıyor' }, { status: 503 })

  const { data, error } = await admin
    .from('service_orders')
    .select(`
      id, order_no, device_brand, device_model, status,
      estimated_cost, actual_cost, approval_amount, approval_desc, description,
      approval_expires_at, approval_status,
      customers ( full_name, phone )
    `)
    .eq('approval_token', params.token)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ error: 'Geçersiz veya süresi dolmuş link' }, { status: 404 })
  }

  if (data.approval_expires_at && new Date(data.approval_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Onay linkinin süresi dolmuş' }, { status: 410 })
  }

  if (data.approval_status === 'approved' || data.approval_status === 'rejected') {
    return NextResponse.json({
      data,
      decided: data.approval_status,
    })
  }

  return NextResponse.json({ data })
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Servis kullanılamıyor' }, { status: 503 })

  let body: { approved?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }

  const { data: order, error: findErr } = await admin
    .from('service_orders')
    .select('id, tenant_id, status, approval_status, approval_expires_at')
    .eq('approval_token', params.token)
    .maybeSingle()

  if (findErr || !order) {
    return NextResponse.json({ error: 'Geçersiz link' }, { status: 404 })
  }

  if (order.approval_expires_at && new Date(order.approval_expires_at) < new Date()) {
    return NextResponse.json({ error: 'Süresi dolmuş' }, { status: 410 })
  }

  if (order.approval_status === 'approved' || order.approval_status === 'rejected') {
    return NextResponse.json({ error: 'Zaten yanıtlandı' }, { status: 409 })
  }

  const approved = body.approved === true
  const newStatus = approved ? mapStoreStatusToDb('customer_approved') : mapStoreStatusToDb('customer_refused')

  const { error: updateErr } = await admin
    .from('service_orders')
    .update({
      approval_status: approved ? 'approved' : 'rejected',
      status: newStatus,
      updated_at: new Date().toISOString(),
    })
    .eq('id', order.id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  await admin.from('service_status_history').insert({
    service_order_id: order.id,
    tenant_id: order.tenant_id,
    status: newStatus,
    note: approved ? 'Müşteri onay linki ile onayladı' : 'Müşteri onay linki ile reddetti',
  })

  return NextResponse.json({ ok: true, approved })
}
