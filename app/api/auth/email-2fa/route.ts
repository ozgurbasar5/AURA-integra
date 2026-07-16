export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import {
  MFA_PREF_COOKIE,
  mfaCookieOptions,
} from '@/lib/email-2fa'

/** E-posta 2FA tercihini aç/kapa */
export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  const { data } = await admin
    .from('tenant_settings')
    .select('settings')
    .eq('tenant_id', auth.tenantId)
    .maybeSingle()

  const settings = (data?.settings ?? {}) as Record<string, unknown>
  const users = (settings.email_2fa_users as Record<string, boolean>) || {}
  const enabled = Boolean(users[auth.userId])

  return NextResponse.json({ ok: true, enabled })
}

export async function PUT(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  let body: { enabled?: boolean }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const enabled = Boolean(body.enabled)
  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  const { data: existing } = await admin
    .from('tenant_settings')
    .select('settings')
    .eq('tenant_id', auth.tenantId)
    .maybeSingle()

  const settings = { ...((existing?.settings ?? {}) as Record<string, unknown>) }
  const users = { ...((settings.email_2fa_users as Record<string, boolean>) || {}) }
  users[auth.userId] = enabled
  settings.email_2fa_users = users

  const { error } = await admin
    .from('tenant_settings')
    .upsert({ tenant_id: auth.tenantId, settings }, { onConflict: 'tenant_id' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const res = NextResponse.json({ ok: true, enabled })
  if (enabled) {
    res.cookies.set(MFA_PREF_COOKIE, '1', mfaCookieOptions(60 * 60 * 24 * 365))
  } else {
    res.cookies.set(MFA_PREF_COOKIE, '', { ...mfaCookieOptions(0), maxAge: 0 })
  }
  return res
}
