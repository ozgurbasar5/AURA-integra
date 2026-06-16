import { getServiceClient } from '@/lib/supabase/service'

export async function writeTenantAuditLog(input: {
  tenantId: string
  userId?: string
  action: string
  entityType: string
  entityId?: string
  oldData?: Record<string, unknown>
  newData?: Record<string, unknown>
  ipAddress?: string
  userAgent?: string
}) {
  const admin = getServiceClient()
  if (!admin) return

  await admin.from('audit_logs').insert({
    tenant_id: input.tenantId,
    user_id: input.userId ?? null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId ?? null,
    old_data: input.oldData ?? null,
    new_data: input.newData ?? null,
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  })
}
