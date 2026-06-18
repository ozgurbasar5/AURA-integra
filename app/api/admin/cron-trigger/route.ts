export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { writeAuditLog } from '@/lib/audit-log'

const ALLOWED = [
  'trial-reminders',
  'payment-reminders',
  'appointment-reminders',
  'churn-interventions',
] as const

type CronJob = (typeof ALLOWED)[number]

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  let body: { job?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const job = body.job as CronJob | undefined
  if (!job || !ALLOWED.includes(job)) {
    return NextResponse.json({ error: `Geçersiz job. İzinli: ${ALLOWED.join(', ')}` }, { status: 400 })
  }

  const secret = process.env.CRON_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'CRON_SECRET yapılandırılmamış' }, { status: 503 })
  }

  const origin = request.nextUrl.origin
  const res = await fetch(`${origin}/api/cron/${job}`, {
    headers: { Authorization: `Bearer ${secret}` },
  })
  const json = await res.json().catch(() => ({}))

  await writeAuditLog({
    actorId: auth.userId,
    action: 'cron_manual_trigger',
    targetType: 'cron',
    targetId: job,
    metadata: { ok: res.ok, status: res.status, summary: json },
  })

  if (!res.ok) {
    return NextResponse.json({ error: json.error ?? 'Cron başarısız', details: json }, { status: res.status })
  }

  return NextResponse.json({ ok: true, job, result: json })
}
