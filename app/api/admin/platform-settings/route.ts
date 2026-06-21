export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { writeAuditLog } from '@/lib/audit-log'

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  const admin = getServiceClient()
  if (!admin) {
    return NextResponse.json({
      error: 'SUPABASE_SERVICE_ROLE_KEY eksik — Vercel ortam değişkenlerini kontrol edin',
    }, { status: 503 })
  }

  const { data, error } = await admin.from('platform_settings').select('settings').eq('id', 'default').maybeSingle()
  if (error) {
    const hint = /does not exist|relation/i.test(error.message)
      ? 'platform_settings tablosu yok — supabase/migrations/20260615_platform_admin_features.sql çalıştırın'
      : error.message
    return NextResponse.json({ error: hint }, { status: 500 })
  }

  return NextResponse.json({ settings: data?.settings ?? {} })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  const admin = getServiceClient()
  if (!admin) {
    return NextResponse.json({
      error: 'SUPABASE_SERVICE_ROLE_KEY eksik — Vercel ortam değişkenlerini kontrol edin',
    }, { status: 503 })
  }

  let body: { settings?: Record<string, unknown> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.settings || typeof body.settings !== 'object') {
    return NextResponse.json({ error: 'settings objesi gerekli' }, { status: 400 })
  }

  const { data: existing, error: readErr } = await admin
    .from('platform_settings')
    .select('settings')
    .eq('id', 'default')
    .maybeSingle()

  if (readErr && !/does not exist|relation/i.test(readErr.message)) {
    return NextResponse.json({ error: readErr.message }, { status: 500 })
  }

  const merged = {
    ...((existing?.settings as Record<string, unknown>) ?? {}),
    ...body.settings,
  }

  const { error } = await admin.from('platform_settings').upsert(
    {
      id: 'default',
      settings: merged,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )

  if (error) {
    const hint = /does not exist|relation/i.test(error.message)
      ? 'platform_settings tablosu yok — Supabase SQL Editor\'da migration çalıştırın'
      : error.message
    return NextResponse.json({ error: hint }, { status: 500 })
  }

  await writeAuditLog({
    actorId: auth.userId,
    action: 'platform_settings_updated',
    targetType: 'platform_settings',
    targetId: 'default',
    metadata: { keys: Object.keys(body.settings) },
  })

  return NextResponse.json({ ok: true, settings: merged })
}
