import { NextRequest, NextResponse } from 'next/server'
import { checkSupabaseEnv } from '@/lib/supabase/validate-env'
import { isDiagnosticAuthorized } from '@/lib/diagnostic-auth'

export const dynamic = 'force-dynamic'

/** Minimal public health — detay için DEBUG_SECRET veya lokal dev */
export async function GET(request: NextRequest) {
  const env = checkSupabaseEnv()
  const authorized = isDiagnosticAuthorized(request)

  if (!authorized) {
    return NextResponse.json({ ok: env.ok })
  }

  return NextResponse.json({
    ok: env.ok,
    message: env.ok ? 'Yapılandırma OK' : env.message,
    env,
  })
}
