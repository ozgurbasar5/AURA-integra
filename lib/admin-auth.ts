import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getServiceClient } from '@/lib/supabase/service'
import { isSuperAdminEmail } from '@/lib/supabase/auth-helpers'
import { getUserFromRequest } from '@/lib/supabase/session-from-request'

const PROFILE_CHECK_MS = 5000

export async function requireSuperAdmin(
  request: NextRequest
): Promise<{ authorized: true; userId: string } | { authorized: false; error: NextResponse }> {
  const user = await getUserFromRequest(request)
  if (!user) {
    return { authorized: false, error: NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 }) }
  }

  const service = getServiceClient()
  if (service) {
    try {
      const result = await Promise.race([
        service.from('user_profiles').select('role, is_active').eq('id', user.id).single(),
        new Promise<{ data: null; error: { message: 'timeout' } }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), PROFILE_CHECK_MS)
        ),
      ])

      const profile = result.data as { role: string; is_active: boolean } | null
      if (profile?.role === 'super_admin' && profile.is_active !== false) {
        return { authorized: true, userId: user.id }
      }
    } catch {
      /* service role okunamadı — e-posta yedeğine düş */
    }
  }

  if (isSuperAdminEmail(user.email)) {
    return { authorized: true, userId: user.id }
  }

  return { authorized: false, error: NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 }) }
}

/** Server component layout — cookie store ile oturum */
export async function requireSuperAdminFromCookies(): Promise<
  { authorized: true; userId: string } | { authorized: false }
> {
  try {
    const { cookies } = await import('next/headers')
    const cookieStore = cookies()
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !key) return { authorized: false }

    const sb = createServerClient(url, key, {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: () => {},
      },
    })

    const {
      data: { session },
    } = await sb.auth.getSession()
    const user = session?.user
    if (!user) return { authorized: false }

    const service = getServiceClient()
    if (service) {
      const { data: profile } = await service
        .from('user_profiles')
        .select('role, is_active')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'super_admin' && profile.is_active !== false) {
        return { authorized: true, userId: user.id }
      }
    }

    if (isSuperAdminEmail(user.email)) {
      return { authorized: true, userId: user.id }
    }

    return { authorized: false }
  } catch {
    return { authorized: false }
  }
}
