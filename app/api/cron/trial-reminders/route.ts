export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronRequest } from '@/lib/cron-auth'
import { dispatchCronJob, type CronJobId } from '@/lib/cron/jobs'

/** Vercel Cron — trial bitiş hatırlatması */
export async function GET(req: NextRequest) {
  const denied = verifyCronRequest(req)
  if (denied) return denied
  const result = await dispatchCronJob('trial-reminders' satisfies CronJobId)
  return NextResponse.json(result.body, { status: result.status })
}
