import { NextRequest, NextResponse } from 'next/server'

/** Vercel Cron / manuel tetikleme — CRON_SECRET zorunlu (prod) */
export function verifyCronRequest(req: NextRequest): NextResponse | null {
  const secret = process.env.CRON_SECRET?.trim()

  if (secret) {
    const auth = req.headers.get('authorization')?.trim()
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return null
  }

  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'CRON_SECRET yapılandırılmamış' }, { status: 503 })
  }

  if (process.env.CRON_ALLOW_DEV !== '1') {
    return NextResponse.json(
      { error: 'CRON_SECRET gerekli (dev: CRON_ALLOW_DEV=1 ile geçici açılabilir)' },
      { status: 503 },
    )
  }

  return null
}
