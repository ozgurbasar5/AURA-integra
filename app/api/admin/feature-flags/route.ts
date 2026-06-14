export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { writeAuditLog } from '@/lib/audit-log'

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  let body: { tenant_id?: string; feature_flags?: Record<string, boolean> }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.tenant_id || !body.feature_flags) {
    return NextResponse.json({ error: 'tenant_id ve feature_flags gerekli' }, { status: 400 })
  }

  const { error } = await admin
    .from('tenants')
    .update({ feature_flags: body.feature_flags })
    .eq('id', body.tenant_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  await writeAuditLog({
    actorId: auth.userId,
    action: 'update_feature_flags',
    targetType: 'tenant',
    targetId: body.tenant_id,
    metadata: body.feature_flags,
  })

  return NextResponse.json({ ok: true })
}
