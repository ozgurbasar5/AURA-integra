export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { writeAuditLog } from '@/lib/audit-log'
import { generateDashboardMagicLink } from '@/lib/magic-link'

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  let body: { tenant_id?: string; note?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const tenantId = body.tenant_id
  const note = (body.note ?? '').trim()
  if (!tenantId) return NextResponse.json({ error: 'tenant_id gerekli' }, { status: 400 })
  if (note.length < 3) return NextResponse.json({ error: 'Destek notu zorunlu (min 3 karakter)' }, { status: 400 })

  const { data: tenant } = await admin.from('tenants').select('id, company_name, email').eq('id', tenantId).single()
  if (!tenant) return NextResponse.json({ error: 'Bayi bulunamadı' }, { status: 404 })

  const { data: owner } = await admin
    .from('user_profiles')
    .select('id, email, full_name')
    .eq('tenant_id', tenantId)
    .in('role', ['owner', 'admin', 'tenant_admin'])
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const loginEmail = owner?.email ?? tenant.email
  if (!loginEmail) return NextResponse.json({ error: 'Bayi giriş e-postası bulunamadı' }, { status: 404 })

  const magic = await generateDashboardMagicLink(admin, loginEmail, request.nextUrl.origin)
  if (!magic.ok) {
    return NextResponse.json({ error: magic.error }, { status: 500 })
  }

  await writeAuditLog({
    actorId: auth.userId,
    action: 'impersonate_link_generated',
    targetType: 'tenant',
    targetId: tenantId,
    metadata: { note, email: loginEmail, company_name: tenant.company_name },
  })

  return NextResponse.json({
    ok: true,
    action_link: magic.link,
    email: loginEmail,
    company_name: tenant.company_name,
  })
}
