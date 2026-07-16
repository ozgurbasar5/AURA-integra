export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronRequest } from '@/lib/cron-auth'
import { dispatchCronJob } from '@/lib/cron/jobs'

/** e-Fatura kuyruk worker — pending → adapter → retry */
export async function GET(req: NextRequest) {
  const denied = verifyCronRequest(req)
  if (denied) return denied
  const result = await dispatchCronJob('efatura-queue')
  return NextResponse.json(result.body, { status: result.status })
}

export async function POST(req: NextRequest) {
  const denied = verifyCronRequest(req)
  if (denied) return denied
  const result = await dispatchCronJob('efatura-queue')
  return NextResponse.json(result.body, { status: result.status })
}
