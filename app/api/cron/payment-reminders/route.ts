export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronRequest } from '@/lib/cron-auth'
import { dispatchCronJob } from '@/lib/cron/jobs'

/** Vercel Cron — vadesi yaklaşan ve gecikmiş ödemeler için otomatik e-posta */
export async function GET(req: NextRequest) {
  const denied = verifyCronRequest(req)
  if (denied) return denied
  const result = await dispatchCronJob('payment-reminders')
  return NextResponse.json(result.body, { status: result.status })
}
