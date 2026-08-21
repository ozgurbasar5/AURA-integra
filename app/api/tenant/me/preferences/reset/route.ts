export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { resolveUserPreferences } from '@/lib/user-preferences'

export async function POST() {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const client = getServiceClient() || auth.supabase

  const { data: existing } = await client
    .from('tenant_settings')
    .select('settings')
    .eq('tenant_id', auth.tenantId)
    .maybeSingle()

  const prevSettings = (existing?.settings as Record<string, unknown>) ?? {}
  const prevUserPrefsMap = { ...((prevSettings.user_preferences as Record<string, unknown>) ?? {}) }
  delete prevUserPrefsMap[auth.userId]

  const nextSettings = {
    ...prevSettings,
    user_preferences: prevUserPrefsMap,
  }

  const { error } = await client.from('tenant_settings').upsert({
    tenant_id: auth.tenantId,
    settings: nextSettings,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const tenantDefaults = (prevSettings.default_preferences as any) ?? null
  const resolved = resolveUserPreferences(null, tenantDefaults, auth.role)

  return NextResponse.json({
    ok: true,
    preferences: resolved,
    is_customized: false,
    message: 'Kullanıcı tercihleri varsayılana sıfırlandı',
  })
}
