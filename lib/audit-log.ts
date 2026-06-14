import { getServiceClient } from '@/lib/supabase/service'

export async function writeAuditLog(input: {
  actorId?: string
  actorEmail?: string
  action: string
  targetType?: string
  targetId?: string
  metadata?: Record<string, unknown>
}) {
  const admin = getServiceClient()
  if (!admin) return
  await admin.from('admin_audit_logs').insert({
    actor_id: input.actorId ?? null,
    actor_email: input.actorEmail ?? null,
    action: input.action,
    target_type: input.targetType ?? null,
    target_id: input.targetId ?? null,
    metadata: input.metadata ?? {},
  })
}
