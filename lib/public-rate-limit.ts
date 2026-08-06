import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

/** Herkese açık endpoint'ler için IP bazlı rate limit */
export async function enforcePublicRateLimit(
  req: NextRequest,
  keyPrefix: string,
  limit: number,
  windowMs: number,
): Promise<NextResponse | null> {
  const ip = getClientIp(req)
  const rl = await checkRateLimit(`${keyPrefix}:${ip}`, limit, windowMs)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Çok fazla istek. Lütfen bekleyin.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }
  return null
}
