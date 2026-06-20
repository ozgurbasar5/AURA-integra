export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

/** Site key build-time embed yerine runtime — env eklendikten sonra redeploy senaryosu */
export async function GET() {
  const siteKey =
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ||
    process.env.TURNSTILE_SITE_KEY?.trim() ||
    ''

  return NextResponse.json({ siteKey, enabled: Boolean(siteKey) })
}
