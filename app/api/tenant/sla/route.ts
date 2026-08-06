export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canWriteTenantData } from '@/lib/api-role-guard'
import { slaConfigToStore, slaConfigToDb } from '@/lib/db-mappers'
import type { SlaConfig } from '@/lib/store'

export async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { data, error } = await auth.supabase
    .from('sla_configs')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('category', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json({ ok: true, items: (data ?? []).map(slaConfigToStore) })
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
  }

  let body: Partial<SlaConfig>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.category) {
    return NextResponse.json({ error: 'Kategori adı zorunludur' }, { status: 400 })
  }

  const record: SlaConfig = {
    id: crypto.randomUUID(),
    category: body.category,
    device_type: body.device_type,
    standard_days: body.standard_days ?? 3,
    legal_max_days: body.legal_max_days ?? 20,
    warning_at_percent: body.warning_at_percent ?? 80,
    escalation_roles: body.escalation_roles ?? ['admin', 'manager'],
    auto_notify_customer: body.auto_notify_customer ?? true,
    is_active: body.is_active ?? true,
    created_at: new Date().toISOString(),
  }

  const row = slaConfigToDb(record, auth.tenantId)
  row.id = record.id

  const { data, error } = await auth.supabase
    .from('sla_configs')
    .insert(row)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json({ ok: true, item: slaConfigToStore(data) }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
  }

  let body: Partial<SlaConfig>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }
  if (!body.id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })

  const updates: Record<string, unknown> = {}
  if (body.standard_days !== undefined) updates.standard_days = body.standard_days
  if (body.legal_max_days !== undefined) updates.legal_max_days = body.legal_max_days
  if (body.warning_at_percent !== undefined) updates.warning_at_percent = body.warning_at_percent
  if (body.auto_notify_customer !== undefined) updates.auto_notify_customer = body.auto_notify_customer
  if (body.is_active !== undefined) updates.is_active = body.is_active

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('sla_configs')
    .update(updates)
    .eq('id', body.id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, item: slaConfigToStore(data) })
}
