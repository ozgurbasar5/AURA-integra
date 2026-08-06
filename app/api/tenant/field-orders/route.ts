export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { fieldOrderToStore, fieldOrderToDb } from '@/lib/db-mappers'

export async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const technician_id = url.searchParams.get('technician_id')

  let query = auth.supabase
    .from('field_orders')
    .select('*, service_orders!field_orders_parent_order_id_fkey(job_no, customer_name, customer_phone, device_brand, device_model)')
    .eq('tenant_id', auth.tenantId)
    .order('scheduled_at', { ascending: true })

  if (status) query = query.eq('status', status)
  if (technician_id) query = query.eq('technician_id', technician_id)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  // Transform and include joined data manually for frontend
  const items = (data ?? []).map((row: any) => {
    const fo = fieldOrderToStore(row)
    return {
      ...fo,
      customer_name: row.service_orders?.customer_name,
      customer_phone: row.service_orders?.customer_phone,
      job_no: row.service_orders?.job_no,
      device_brand: row.service_orders?.device_brand,
      device_model: row.service_orders?.device_model,
    }
  })

  return NextResponse.json({ ok: true, items })
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.address) {
    return NextResponse.json({ error: 'Adres zorunludur' }, { status: 400 })
  }

  const newOrder = {
    id: crypto.randomUUID(),
    parent_order_id: body.parent_order_id,
    customer_id: body.customer_id,
    technician_id: body.technician_id,
    address: body.address,
    latitude: body.latitude,
    longitude: body.longitude,
    scheduled_at: body.scheduled_at,
    status: 'scheduled',
    notes: body.notes
  }

  const { data, error } = await auth.supabase
    .from('field_orders')
    .insert(fieldOrderToDb(newOrder as any, auth.tenantId))
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, item: fieldOrderToStore(data) }, { status: 201 })
}
