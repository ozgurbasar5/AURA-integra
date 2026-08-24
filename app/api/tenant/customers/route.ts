export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canWriteTenantData } from '@/lib/api-role-guard'
import { customerToDb, customerToStore } from '@/lib/db-mappers'
import type { StoreCustomer } from '@/lib/store'

type CustomerBody = {
  id?: string
  name?: string
  full_name?: string
  phone?: string
  email?: string
  address?: string
  tc_no?: string
  vkn?: string
  customer_type?: StoreCustomer['customer_type']
  segment?: StoreCustomer['segment']
  company_name?: string
  sms_allowed?: boolean
  email_allowed?: boolean
  blacklisted?: boolean
  blacklist_reason?: string
  notes?: string
  kvkk_consent_date?: string
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '')
}

function customerKey(name: string, phone: string): string {
  const digits = normalizePhone(phone)
  if (digits.length >= 10) return digits
  return name.trim().toLowerCase()
}

function isMissingCustomersTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false
  const msg = String(error.message ?? '').toLowerCase()
  return (
    error.code === '42P01'
    || error.code === 'PGRST205'
    || (msg.includes('relation') && msg.includes('customers') && msg.includes('does not exist'))
  )
}

import type { SupabaseClient } from '@supabase/supabase-js'

async function aggregateCustomersFromTransactions(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<StoreCustomer[]> {
  const [ordersRes, salesRes] = await Promise.all([
    supabase
      .from('service_orders')
      .select('customer_name, customer_phone, actual_cost, estimated_cost')
      .eq('tenant_id', tenantId)
      .limit(2000),
    supabase
      .from('sales')
      .select('customer_name, total, subtotal, extra, created_at')
      .eq('tenant_id', tenantId)
      .limit(2000),
  ])

  const map = new Map<string, StoreCustomer>()
  const now = new Date().toISOString()

  for (const row of ordersRes.data ?? []) {
    const fullName = String(row.customer_name ?? '').trim()
    const phone = String(row.customer_phone ?? '').trim()
    if (!fullName && !phone) continue
    const key = customerKey(fullName || 'Müşteri', phone)
    const spent = Number(row.actual_cost ?? row.estimated_cost) || 0
    const existing = map.get(key)
    if (existing) {
      existing.total_spent += spent
      if (!existing.phone && phone) existing.phone = phone
      if (fullName && existing.full_name === 'Müşteri') existing.full_name = fullName
    } else {
      map.set(key, {
        id: crypto.randomUUID(),
        full_name: fullName || 'Müşteri',
        phone: phone || '—',
        customer_type: 'bireysel',
        segment: 'oneshot',
        sms_allowed: false,
        email_allowed: false,
        blacklisted: false,
        total_spent: spent,
        satisfaction_avg: 0,
        created_at: now,
        updated_at: now,
      })
    }
  }

  for (const row of salesRes.data ?? []) {
    const fullName = String(row.customer_name ?? '').trim()
    if (!fullName || fullName === 'Perakende') continue
    const extra = (row.extra as Record<string, unknown>) ?? {}
    const spent = Number(extra.total_with_vat ?? row.total ?? row.subtotal) || 0
    const key = customerKey(fullName, '')
    const existing = map.get(key)
    if (existing) {
      existing.total_spent += spent
    } else {
      map.set(key, {
        id: crypto.randomUUID(),
        full_name: fullName,
        phone: '—',
        customer_type: 'bireysel',
        segment: 'oneshot',
        sms_allowed: false,
        email_allowed: false,
        blacklisted: false,
        total_spent: spent,
        satisfaction_avg: 0,
        created_at: String(row.created_at ?? now),
        updated_at: String(row.created_at ?? now),
      })
    }
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime(),
  )
}

function bodyToCustomer(body: CustomerBody, existing?: StoreCustomer): Partial<StoreCustomer> {
  const fullName = (body.full_name ?? body.name ?? existing?.full_name ?? '').trim()
  return {
    full_name: fullName || existing?.full_name,
    phone: body.phone?.trim() ?? existing?.phone,
    email: body.email ?? existing?.email,
    address: body.address ?? existing?.address,
    tc_no: body.tc_no ?? existing?.tc_no,
    vkn: body.vkn ?? existing?.vkn,
    customer_type: body.customer_type ?? existing?.customer_type ?? 'bireysel',
    segment: body.segment ?? existing?.segment ?? 'regular',
    company_name: body.company_name ?? existing?.company_name,
    sms_allowed: body.sms_allowed ?? existing?.sms_allowed ?? false,
    email_allowed: body.email_allowed ?? existing?.email_allowed ?? false,
    blacklisted: body.blacklisted ?? existing?.blacklisted ?? false,
    blacklist_reason: body.blacklist_reason ?? existing?.blacklist_reason,
    notes: body.notes ?? existing?.notes,
    kvkk_consent_date: body.kvkk_consent_date ?? existing?.kvkk_consent_date,
    total_spent: existing?.total_spent ?? 0,
    satisfaction_avg: existing?.satisfaction_avg ?? 0,
  }
}

import { getServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const db = getServiceClient() || auth.supabase

  const { data, error } = await db
    .from('customers')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })
    .limit(500)

  if (!error) {
    const items = (data ?? []).map(r => customerToStore(r as Record<string, unknown>))
    return NextResponse.json({ ok: true, items })
  }

  console.error('[API /api/tenant/customers GET]', {
    code: error.code,
    message: error.message,
    hint: error.hint,
  })

  if (isMissingCustomersTable(error)) {
    const items = await aggregateCustomersFromTransactions(db, auth.tenantId)
    return NextResponse.json({ ok: true, items, source: 'aggregated' })
  }

  return NextResponse.json({ error: 'Müşteri listesi alınamadı.' }, { status: 500 })
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
  }

  let body: CustomerBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON verisi.' }, { status: 400 })
  }

  const fields = bodyToCustomer(body)
  if (!fields.full_name?.trim() || !fields.phone?.trim()) {
    return NextResponse.json({ error: 'Ad ve telefon zorunlu' }, { status: 400 })
  }

  const db = getServiceClient() || auth.supabase

  const now = new Date().toISOString()
  const customer: StoreCustomer = {
    id: crypto.randomUUID(),
    full_name: fields.full_name.trim(),
    phone: fields.phone.trim(),
    email: fields.email,
    address: fields.address,
    tc_no: fields.tc_no,
    vkn: fields.vkn,
    customer_type: fields.customer_type ?? 'bireysel',
    segment: fields.segment ?? 'regular',
    company_name: fields.company_name,
    sms_allowed: fields.sms_allowed ?? false,
    email_allowed: fields.email_allowed ?? false,
    blacklisted: fields.blacklisted ?? false,
    blacklist_reason: fields.blacklist_reason,
    total_spent: 0,
    satisfaction_avg: 0,
    notes: fields.notes,
    kvkk_consent_date: fields.kvkk_consent_date,
    created_at: now,
    updated_at: now,
  }

  const row = customerToDb(customer, auth.tenantId)
  row.id = customer.id
  const { data, error } = await db.from('customers').insert(row).select('*').single()
  if (error) {
    console.error('[API /api/tenant/customers POST]', {
      code: error.code,
      message: error.message,
      hint: error.hint,
    })
    return NextResponse.json({ error: 'Müşteri kaydı oluşturulamadı.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, data: customerToStore(data as Record<string, unknown>) }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
  }

  let body: CustomerBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON verisi.' }, { status: 400 })
  }
  if (!body.id) return NextResponse.json({ error: 'Müşteri ID gerekli.' }, { status: 400 })

  const db = getServiceClient() || auth.supabase

  const { data: existing, error: fetchErr } = await db
    .from('customers')
    .select('*')
    .eq('id', body.id)
    .eq('tenant_id', auth.tenantId)
    .maybeSingle()

  if (fetchErr) {
    console.error('[API /api/tenant/customers PATCH fetch]', {
      code: fetchErr.code,
      message: fetchErr.message,
    })
    return NextResponse.json({ error: 'Müşteri sorgulanamadı.' }, { status: 500 })
  }
  if (!existing) return NextResponse.json({ error: 'Müşteri bulunamadı.' }, { status: 404 })

  const current = customerToStore(existing as Record<string, unknown>)
  const fields = bodyToCustomer(body, current)
  const updated: StoreCustomer = {
    ...current,
    ...fields,
    full_name: fields.full_name ?? current.full_name,
    phone: fields.phone ?? current.phone,
    updated_at: new Date().toISOString(),
  }

  const row = customerToDb(updated, auth.tenantId)
  const { data, error } = await db
    .from('customers')
    .update(row)
    .eq('id', body.id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single()

  if (error) {
    console.error('[API /api/tenant/customers PATCH update]', {
      code: error.code,
      message: error.message,
    })
    return NextResponse.json({ error: 'Müşteri güncellenemedi.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, data: customerToStore(data as Record<string, unknown>) })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Bu işlem için yetkiniz yok.' }, { status: 403 })
  }

  const id = req.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Müşteri ID gerekli.' }, { status: 400 })

  const db = getServiceClient() || auth.supabase

  const { error } = await db
    .from('customers')
    .delete()
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)

  if (error) {
    console.error('[API /api/tenant/customers DELETE]', {
      code: error.code,
      message: error.message,
    })
    return NextResponse.json({ error: 'Müşteri silinemedi.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}
