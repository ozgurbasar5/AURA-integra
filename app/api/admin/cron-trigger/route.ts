export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit-log'
import { dispatchCronJob, type CronJobId } from '@/lib/cron/jobs'

const ALLOWED: CronJobId[] = [
  'trial-reminders',
  'payment-reminders',
  'appointment-reminders',
  'churn-interventions',
  'efatura-queue',
]

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  let body: { job?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const job = body.job as CronJobId | undefined
  if (!job || !ALLOWED.includes(job)) {
    return NextResponse.json({ error: `Geçersiz job. İzinli: ${ALLOWED.join(', ')}` }, { status: 400 })
  }

  const result = await dispatchCronJob(job)

  await writeAuditLog({
    actorId: auth.userId,
    action: 'cron_manual_trigger',
    targetType: 'cron',
    targetId: job,
    metadata: { ok: result.ok, status: result.status, summary: result.body },
  })

  if (!result.ok) {
    return NextResponse.json({ error: (result.body as { error?: string }).error ?? 'Cron başarısız', details: result.body }, { status: result.status })
  }

  return NextResponse.json({ ok: true, job, result: result.body })
}
