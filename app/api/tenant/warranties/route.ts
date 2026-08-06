export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canWriteTenantData } from '@/lib/api-role-guard'
import { warrantyToDb, warrantyToStore } from '@/lib/db-mappers'
import { recordImeiEvent } from '@/lib/imei-tracker'
import type { WarrantyRecord } from '@/lib/store'

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const url = new URL(req.url)
  const imei = url.searchParams.get('imei')

  let query = auth.supabase
    .from('warranties')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    
  if (imei) {
    query = query.eq('imei', imei)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, items: (data ?? []).map(warrantyToStore) })
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
  }

  let body: Partial<WarrantyRecord>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.customer_name || !body.device_brand || !body.device_model) {
    return NextResponse.json({ error: 'Müşteri ve cihaz zorunlu' }, { status: 400 })
  }

  const record = {
    id: crypto.randomUUID(),
    order_id: body.order_id || '',
    customer_id: body.customer_id || '',
    imei: body.imei,
    invoice_no: body.invoice_no,
    device_brand: body.device_brand,
    device_model: body.device_model,
    warranty_months: body.warranty_months ?? 6,
    start_date: body.start_date || new Date().toISOString().split('T')[0],
    end_date: body.end_date || '',
    covered_parts: body.covered_parts ?? ['Genel'],
    exclusion_reasons: body.exclusion_reasons ?? [],
    terms: body.terms,
    customer_name: body.customer_name,
    order_no: body.order_no,
    status: body.status || 'aktif',
    sla_days: body.sla_days ?? 0,
    notify_before_days: body.notify_before_days ?? 7,
    created_at: new Date().toISOString(),
  } as WarrantyRecord

  if (!record.end_date) {
    const d = new Date(record.start_date)
    d.setMonth(d.getMonth() + record.warranty_months)
    record.end_date = d.toISOString().split('T')[0]
  }

  const row = warrantyToDb(record, auth.tenantId)
  row.id = record.id
  
  const { data, error } = await auth.supabase.from('warranties').insert(row).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (record.imei) {
    // Fire and forget IMEI loglama
    recordImeiEvent(auth.tenantId, record.imei, {
      event_type: 'warranty',
      event_id: data.id,
      customer_name: record.customer_name,
      notes: `${record.warranty_months} aylık yeni garanti kaydı oluşturuldu.`,
      metadata: { status: record.status }
    }).catch(console.error)
  }

  return NextResponse.json({ ok: true, item: warrantyToStore(data) }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
  }

  let body: Partial<WarrantyRecord>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }
  if (!body.id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (body.status) updates.status = body.status
  if (body.claim_status) updates.claim_status = body.claim_status
  if (body.claim_notes !== undefined) updates.claim_notes = body.claim_notes
  if (body.exclusion_reasons) updates.exclusion_reasons = body.exclusion_reasons
  if (body.invoice_no !== undefined) updates.invoice_no = body.invoice_no
  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('warranties')
    .update(updates)
    .eq('id', body.id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, item: warrantyToStore(data) })
}
