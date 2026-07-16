export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canWriteTenantData, canPushFinance } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { appointmentToDb, appointmentToStore } from '@/lib/db-mappers'
import type { Appointment } from '@/lib/store'

const STATUS_TO_DB: Record<string, string> = {
  bekliyor: 'beklemede',
  onaylandi: 'onaylandi',
  tamamlandi: 'tamamlandi',
  iptal: 'iptal',
  gelmedi: 'gelmedi',
}

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { data, error } = await auth.supabase
    .from('appointments')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('appointment_date', { ascending: true })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, items: (data ?? []).map(appointmentToStore) })
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
  }

  let body: Partial<Appointment>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.customer_name || !body.appointment_date) {
    return NextResponse.json({ error: 'Müşteri ve tarih zorunlu' }, { status: 400 })
  }

  const item: Appointment = {
    id: crypto.randomUUID(),
    customer_name: body.customer_name,
    customer_phone: body.customer_phone || '',
    device_brand: body.device_brand || '',
    device_model: body.device_model || '',
    fault_description: body.fault_description || '',
    appointment_date: body.appointment_date,
    appointment_time: body.appointment_time || '10:00',
    duration_minutes: body.duration_minutes ?? 30,
    technician_name: body.technician_name,
    status: body.status || 'bekliyor',
    notes: body.notes,
    deposit_amount: Number(body.deposit_amount) || 0,
    deposit_paid: Boolean(body.deposit_paid),
    created_at: new Date().toISOString(),
  }

  const row = appointmentToDb(item, auth.tenantId)
  row.id = item.id
  const { data, error } = await auth.supabase.from('appointments').insert(row).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, item: appointmentToStore(data) }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
  }

  let body: {
    id: string
    status?: Appointment['status']
    deposit_amount?: number
    deposit_paid?: boolean
    record_cash?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }
  if (!body.id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })

  const { data: existing, error: fetchErr } = await auth.supabase
    .from('appointments')
    .select('*')
    .eq('id', body.id)
    .eq('tenant_id', auth.tenantId)
    .single()

  if (fetchErr || !existing) {
    return NextResponse.json({ error: 'Randevu bulunamadı' }, { status: 404 })
  }

  const updates: Record<string, unknown> = {}
  if (body.status) updates.status = STATUS_TO_DB[body.status] ?? body.status
  if (body.deposit_amount != null) updates.deposit_amount = Number(body.deposit_amount) || 0
  if (body.deposit_paid != null) updates.deposit_paid = Boolean(body.deposit_paid)

  const wasPaid = Boolean(existing.deposit_paid)
  const willBePaid = body.deposit_paid != null ? Boolean(body.deposit_paid) : wasPaid
  const depositAmount = body.deposit_amount != null
    ? Number(body.deposit_amount) || 0
    : Number(existing.deposit_amount) || 0

  const { data, error } = await auth.supabase
    .from('appointments')
    .update(updates)
    .eq('id', body.id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (
    !wasPaid && willBePaid && depositAmount > 0 &&
    body.record_cash !== false && canPushFinance(auth.role)
  ) {
    const admin = getServiceClient()
    if (admin) {
      const refId = `apt-deposit-${body.id}`
      const { data: prior } = await admin
        .from('financial_transactions')
        .select('id')
        .eq('tenant_id', auth.tenantId)
        .eq('reference_id', refId)
        .maybeSingle()

      if (!prior) {
        await admin.from('financial_transactions').insert({
          tenant_id: auth.tenantId,
          type: 'gelir',
          amount: depositAmount,
          payment_method: 'nakit',
          category: 'Kapora',
          description: `Randevu kapora — ${existing.customer_name}`,
          reference_id: refId,
          transaction_date: new Date().toISOString().slice(0, 10),
          customer_name: existing.customer_name,
          created_by: auth.userId,
        })
      }
    }
  }

  return NextResponse.json({ ok: true, item: appointmentToStore(data) })
}
