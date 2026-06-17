import { NextResponse } from 'next/server'
import { getPublicSupabaseEnv } from '@/lib/supabase/public-env'

export const dynamic = 'force-dynamic'

/** İstemci fallback — runtime env (push/deploy sonrası teşhis) */
export async function GET() {
  const env = getPublicSupabaseEnv()

  return NextResponse.json(
    {
      ok: !!env,
      url: env?.url ?? null,
      hasAnon: !!env?.anon,
      hint: env
        ? 'Supabase public env sunucuda mevcut'
        : 'Vercel → Settings → Environment Variables → NEXT_PUBLIC_SUPABASE_URL + ANON_KEY → Redeploy',
    },
    {
      headers: { 'Cache-Control': 'no-store' },
    },
  )
}
