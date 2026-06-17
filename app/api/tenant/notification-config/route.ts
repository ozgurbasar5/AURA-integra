export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canManageTenantSettings } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { encryptSecret, isEncryptedSecret } from '@/lib/secrets-crypto'
import { writeTenantAuditLog } from '@/lib/tenant-audit-log'

export type TenantNotificationConfig = {
  netgsm_user?: string
  netgsm_pass?: string
  netgsm_header?: string
  smtp_email?: string
  smtp_host?: string
  whatsapp_phone?: string
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
  const notif = (settings.notification_config as TenantNotificationConfig) ?? {}
  const triggers = (settings.notification_triggers as Record<string, boolean>) ?? {}

  return NextResponse.json({
    config: {
      netgsm_user: notif.netgsm_user ?? '',
      netgsm_header: notif.netgsm_header ?? '',
      smtp_email: notif.smtp_email ?? '',
      smtp_host: notif.smtp_host ?? 'smtp.gmail.com',
      whatsapp_phone: notif.whatsapp_phone ?? '',
      has_netgsm_pass: Boolean(notif.netgsm_pass),
    },
    triggers,
  })
}

export async function PUT(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  if (!canManageTenantSettings(auth.role)) {
    return NextResponse.json({ error: 'Yönetici yetkisi gerekli' }, { status: 403 })
  }

  let body: TenantNotificationConfig & { netgsm_pass?: string; triggers?: Record<string, boolean> }
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

  if (body.triggers && Object.keys(body).length === 1) {
    const { error } = await admin.from('tenant_settings').upsert({
      tenant_id: auth.tenantId,
      settings: { ...prev, notification_triggers: body.triggers },
      updated_at: new Date().toISOString(),
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  }

  const prevNotif = (prev.notification_config as TenantNotificationConfig) ?? {}

  let netgsmPass = prevNotif.netgsm_pass
  if (body.netgsm_pass) {
    netgsmPass = encryptSecret(body.netgsm_pass)
  } else if (netgsmPass && !isEncryptedSecret(netgsmPass)) {
    netgsmPass = encryptSecret(netgsmPass)
  }

  const notification_config: TenantNotificationConfig = {
    netgsm_user: body.netgsm_user ?? prevNotif.netgsm_user,
    netgsm_header: body.netgsm_header ?? prevNotif.netgsm_header,
    netgsm_pass: netgsmPass,
    smtp_email: body.smtp_email ?? prevNotif.smtp_email,
    smtp_host: body.smtp_host ?? prevNotif.smtp_host,
    whatsapp_phone: body.whatsapp_phone ?? prevNotif.whatsapp_phone,
  }

  const { error } = await admin.from('tenant_settings').upsert({
    tenant_id: auth.tenantId,
    settings: {
      ...prev,
      notification_config,
      ...(body.triggers ? { notification_triggers: body.triggers } : {}),
    },
    updated_at: new Date().toISOString(),
  })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeTenantAuditLog({
    tenantId: auth.tenantId,
    userId: auth.userId,
    action: 'update',
    entityType: 'notification_config',
    newData: { netgsm_user: notification_config.netgsm_user, has_pass: Boolean(netgsmPass) },
  })

  return NextResponse.json({ ok: true })
}

