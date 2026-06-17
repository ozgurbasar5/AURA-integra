export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'

/** Plan yükseltme talebi — admin panelde görünür */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  let body: { plan_id?: string; message?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  const { data: tenant } = await admin
    .from('tenants')
    .select('company_name, plan_id')
    .eq('id', auth.tenantId)
    .single()

  const { error } = await admin.from('support_tickets').insert({
    tenant_id: auth.tenantId,
    subject: `Plan yükseltme talebi${body.plan_id ? ` — ${body.plan_id}` : ''}`,
    description: body.message || `${tenant?.company_name ?? 'Bayi'} plan yükseltme isteği`,
    priority: 'Normal',
    status: 'open',
    category: 'billing',
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, message: 'Talebiniz alındı. Ekibimiz sizinle iletişime geçecek.' })
}
