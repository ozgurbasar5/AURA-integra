export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import {
  resolveUserPreferences,
  type UserPreferences,
} from '@/lib/user-preferences'

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  // 1. Fetch tenant_settings
  const { data: tenantSetting } = await auth.supabase
    .from('tenant_settings')
    .select('settings')
    .eq('tenant_id', auth.tenantId)
    .maybeSingle()

  const tenantSettings = (tenantSetting?.settings as Record<string, unknown>) ?? {}
  const userPreferencesMap = (tenantSettings.user_preferences as Record<string, Partial<UserPreferences>>) ?? {}
  const userPrefs = userPreferencesMap[auth.userId] ?? null
  const tenantDefaults = (tenantSettings.default_preferences as Partial<UserPreferences>) ?? null

  // 2. Resolve preferences across hierarchy (User > Tenant > Role > System)
  const resolved = resolveUserPreferences(userPrefs, tenantDefaults, auth.role)

  return NextResponse.json({
    ok: true,
    preferences: resolved,
    is_customized: Boolean(userPrefs),
  })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  let patch: Partial<UserPreferences>
  try {
    patch = (await req.json()) as Partial<UserPreferences>
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON verisi' }, { status: 400 })
  }

  const client = getServiceClient() || auth.supabase

  // 1. Fetch existing tenant settings
  const { data: existing } = await client
    .from('tenant_settings')
    .select('settings')
    .eq('tenant_id', auth.tenantId)
    .maybeSingle()

  const prevSettings = (existing?.settings as Record<string, unknown>) ?? {}
  const prevUserPrefsMap = (prevSettings.user_preferences as Record<string, Partial<UserPreferences>>) ?? {}
  const currentPrefs = prevUserPrefsMap[auth.userId] ?? {}

  // Domain-isolated merge
  const updatedPrefs: Partial<UserPreferences> = {
    ...currentPrefs,
    ...(patch.theme ? { theme: { ...(currentPrefs.theme || {}), ...patch.theme } } : {}),
    ...(patch.density !== undefined ? { density: patch.density } : {}),
    ...(patch.startup_route !== undefined ? { startup_route: patch.startup_route } : {}),
    ...(patch.dashboard ? { dashboard: { ...(currentPrefs.dashboard || {}), ...patch.dashboard } } : {}),
    ...(patch.quick_actions ? { quick_actions: { ...(currentPrefs.quick_actions || {}), ...patch.quick_actions } } : {}),
    ...(patch.table_preferences
      ? { table_preferences: { ...(currentPrefs.table_preferences || {}), ...patch.table_preferences } }
      : {}),
    ...(patch.saved_views !== undefined ? { saved_views: patch.saved_views } : {}),
    ...(patch.recent_items !== undefined ? { recent_items: patch.recent_items } : {}),
    ...(patch.favorites !== undefined ? { favorites: patch.favorites } : {}),
    ...(patch.mobile_home
      ? { mobile_home: { ...(currentPrefs.mobile_home || {}), ...patch.mobile_home } }
      : {}),
    ...(patch.notifications
      ? { notifications: { ...(currentPrefs.notifications || {}), ...patch.notifications } }
      : {}),
  }

  const nextSettings = {
    ...prevSettings,
    user_preferences: {
      ...prevUserPrefsMap,
      [auth.userId]: updatedPrefs,
    },
  }

  const { error } = await client.from('tenant_settings').upsert({
    tenant_id: auth.tenantId,
    settings: nextSettings,
    updated_at: new Date().toISOString(),
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const tenantDefaults = (prevSettings.default_preferences as Partial<UserPreferences>) ?? null
  const resolved = resolveUserPreferences(updatedPrefs, tenantDefaults, auth.role)

  return NextResponse.json({
    ok: true,
    preferences: resolved,
    is_customized: true,
  })
}
