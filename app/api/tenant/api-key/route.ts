export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canManageTenantSettings } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { hashApiKey } from '@/lib/secrets-crypto'
import { writeTenantAuditLog } from '@/lib/tenant-audit-log'
import { randomBytes } from 'crypto'

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { data } = await auth.supabase
    .from('tenants')
    .select('api_key_hash')
    .eq('id', auth.tenantId)
    .single()

  const hasKey = Boolean(data?.api_key_hash)
  return NextResponse.json({
    has_key: hasKey,
    key_hint: hasKey ? 'ak_live_••••••••••••••••' : null,
  })
}

export async function POST() {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  if (!canManageTenantSettings(auth.role)) {
    return NextResponse.json({ error: 'Yönetici yetkisi gerekli' }, { status: 403 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const apiKey = `ak_live_${randomBytes(24).toString('hex')}`
  const apiKeyHash = hashApiKey(apiKey)

  const { error } = await admin
    .from('tenants')
    .update({ api_key_hash: apiKeyHash, api_key: null })
    .eq('id', auth.tenantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeTenantAuditLog({
    tenantId: auth.tenantId,
    userId: auth.userId,
    action: 'create',
    entityType: 'api_key',
    newData: { prefix: apiKey.slice(0, 12) },
  })

  return NextResponse.json({ ok: true, api_key: apiKey })
}
