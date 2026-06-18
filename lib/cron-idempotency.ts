import { getServiceClient } from '@/lib/supabase/service'

/** Bugün aynı aksiyon + hedef için cron kaydı var mı? */
export async function wasCronActionSentToday(
  action: string,
  targetId: string,
): Promise<boolean> {
  const admin = getServiceClient()
  if (!admin) return false

  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const { data } = await admin
    .from('admin_audit_logs')
    .select('id')
    .eq('action', action)
    .eq('target_id', targetId)
    .gte('created_at', start.toISOString())
    .limit(1)

  return (data?.length ?? 0) > 0
}

export async function wasPaymentReminderSentToday(paymentId: string): Promise<boolean> {
  const admin = getServiceClient()
  if (!admin) return false

  const start = new Date()
  start.setHours(0, 0, 0, 0)

  const { data } = await admin
    .from('admin_audit_logs')
    .select('id, metadata')
    .eq('action', 'payment_reminder_cron')
    .gte('created_at', start.toISOString())
    .limit(50)

  return (data ?? []).some(row => {
    const meta = row.metadata as { payment_id?: string } | null
    return meta?.payment_id === paymentId
  })
}
