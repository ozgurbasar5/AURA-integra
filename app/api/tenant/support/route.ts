export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'

/** Destek talebi oluştur — Supabase support_tickets */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  let body: { subject?: string; description?: string; priority?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.subject?.trim() || !body.description?.trim()) {
    return NextResponse.json({ error: 'Konu ve açıklama zorunlu' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  const { data, error } = await admin.from('support_tickets').insert({
    tenant_id: auth.tenantId,
    subject: body.subject.trim(),
    description: body.description.trim(),
    priority: body.priority || 'Normal',
    status: 'open',
    category: 'support',
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
}

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { data, error } = await auth.supabase
    .from('support_tickets')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data: data ?? [] })
}
