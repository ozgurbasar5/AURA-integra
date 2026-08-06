export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canWriteTenantData } from '@/lib/api-role-guard'
import { checklistTemplateToStore, checklistTemplateToDb } from '@/lib/db-mappers'
import type { ChecklistTemplate } from '@/lib/store'

export async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { data, error } = await auth.supabase
    .from('checklist_templates')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json({ ok: true, items: (data ?? []).map(checklistTemplateToStore) })
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
  }

  let body: Partial<ChecklistTemplate>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.name || !body.category || !body.items || !Array.isArray(body.items)) {
    return NextResponse.json({ error: 'İsim, kategori ve items zorunludur' }, { status: 400 })
  }

  const record: ChecklistTemplate = {
    id: crypto.randomUUID(),
    name: body.name,
    category: body.category,
    device_type: body.device_type,
    brand_filter: body.brand_filter,
    items: body.items,
    version: 1,
    is_active: body.is_active ?? true,
  }

  const row = checklistTemplateToDb(record, auth.tenantId)
  row.id = record.id

  const { data, error } = await auth.supabase
    .from('checklist_templates')
    .insert(row)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json({ ok: true, item: checklistTemplateToStore(data) }, { status: 201 })
}
