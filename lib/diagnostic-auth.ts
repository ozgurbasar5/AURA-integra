import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/** Production diagnostic endpoint'leri — DEBUG_SECRET veya CRON_SECRET header */
export function isDiagnosticAuthorized(request: NextRequest): boolean {
  if (process.env.NODE_ENV !== 'production') return true

  const secret = process.env.DEBUG_SECRET || process.env.CRON_SECRET
  if (!secret) return false

  const header =
    request.headers.get('x-debug-secret') ||
    request.headers.get('x-cron-secret') ||
    request.headers.get('authorization')?.replace(/^Bearer\s+/i, '')

  return header === secret
}

export function diagnosticUnauthorizedResponse(): NextResponse {
  return NextResponse.json({ error: 'Yetkisiz' }, { status: 401 })
}
