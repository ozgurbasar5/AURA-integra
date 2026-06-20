export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canManageTenantSettings } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import {
  DEFAULT_TENANT_SIDEBAR,
  parseTenantSidebarSettings,
  type TenantSidebarSettings,
} from '@/lib/sidebar-layout'
import { writeTenantAuditLog } from '@/lib/tenant-audit-log'

function readSidebarFromSettings(settings: Record<string, unknown>): TenantSidebarSettings {
  return parseTenantSidebarSettings(settings.sidebar ?? settings)
}

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { data } = await auth.supabase
    .from('tenant_settings')
    .select('settings')
    .eq('tenant_id', auth.tenantId)
    .maybeSingle()

  const settings = (data?.settings as Record<string, unknown>) ?? {}
  const sidebar = readSidebarFromSettings(settings)

  return NextResponse.json({ sidebar })
}

export async function PUT(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  if (!canManageTenantSettings(auth.role)) {
    return NextResponse.json({ error: 'Yönetici yetkisi gerekli' }, { status: 403 })
  }

  let body: Partial<TenantSidebarSettings>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const { data: existing } = await admin
    .from('tenant_settings')
    .select('settings')
    .eq('tenant_id', auth.tenantId)
    .maybeSingle()

  const prev = (existing?.settings as Record<string, unknown>) ?? {}
  const prevSidebar = readSidebarFromSettings(prev)

  const sidebar: TenantSidebarSettings = {
    sidebar_layout: body.sidebar_layout ?? prevSidebar.sidebar_layout ?? DEFAULT_TENANT_SIDEBAR.sidebar_layout,
    sidebar_default_expanded: body.sidebar_default_expanded ?? prevSidebar.sidebar_default_expanded,
    enforce_tenant_default:
      body.enforce_tenant_default !== undefined
        ? Boolean(body.enforce_tenant_default)
        : prevSidebar.enforce_tenant_default,
  }

  const { error } = await admin.from('tenant_settings').upsert({
    tenant_id: auth.tenantId,
    settings: { ...prev, sidebar },
    updated_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeTenantAuditLog({
    tenantId: auth.tenantId,
    userId: auth.userId,
    action: 'update',
    entityType: 'sidebar_settings',
    newData: { ...sidebar },
  })

  return NextResponse.json({ ok: true, sidebar })
}
