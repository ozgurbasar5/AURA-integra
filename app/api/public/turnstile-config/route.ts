export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'

function readSiteKey(): string {
  return (
    process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ||
    process.env.TURNSTILE_SITE_KEY?.trim() ||
    ''
  )
}

function isCaptchaRequired(): boolean {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim()
  if (!secret) return false
  if (process.env.NODE_ENV === 'production') return true
  return Boolean(readSiteKey())
}

/** Site key runtime — NEXT_PUBLIC build embed yerine API üzerinden client'a verilir */
export async function GET() {
  const siteKey = readSiteKey()
  const required = isCaptchaRequired()

  return NextResponse.json({
    siteKey,
    enabled: Boolean(siteKey),
    required,
    misconfigured: required && !siteKey,
  })
}
