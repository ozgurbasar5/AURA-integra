export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'

/** Mobil Expo push token kaydı */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  let body: { token?: string; platform?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const token = String(body.token || '').trim()
  if (!token || token.length < 10) {
    return NextResponse.json({ error: 'token gerekli' }, { status: 400 })
  }

  const platform = body.platform ? String(body.platform).slice(0, 32) : null

  const { error } = await auth.supabase.from('device_push_tokens').upsert(
    {
      user_id: auth.userId,
      tenant_id: auth.tenantId,
      token,
      platform,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'tenant_id,token' },
  )

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const token = req.nextUrl.searchParams.get('token')?.trim()
  if (!token) {
    return NextResponse.json({ error: 'token gerekli' }, { status: 400 })
  }

  await auth.supabase
    .from('device_push_tokens')
    .delete()
    .eq('tenant_id', auth.tenantId)
    .eq('user_id', auth.userId)
    .eq('token', token)

  return NextResponse.json({ ok: true })
}
