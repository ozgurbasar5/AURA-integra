export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronRequest } from '@/lib/cron-auth'
import { dispatchCronJob } from '@/lib/cron/jobs'

/** Risk skoru düşük bayilere otomatik e-posta + admin görev kaydı */
export async function GET(req: NextRequest) {
  const denied = verifyCronRequest(req)
  if (denied) return denied
  const result = await dispatchCronJob('churn-interventions')
  return NextResponse.json(result.body, { status: result.status })
}
