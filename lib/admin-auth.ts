import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getServiceClient } from '@/lib/supabase/service'
import { getUserFromRequest } from '@/lib/supabase/session-from-request'

const PROFILE_CHECK_MS = 5000

async function verifySuperAdminProfile(userId: string): Promise<boolean> {
  const service = getServiceClient()
  if (!service) return false

  try {
    const result = await Promise.race([
      service.from('user_profiles').select('role, is_active').eq('id', userId).single(),
      new Promise<{ data: null; error: { message: 'timeout' } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), PROFILE_CHECK_MS)
      ),
    ])

    const profile = result.data as { role: string; is_active: boolean } | null
    return profile?.role === 'super_admin' && profile.is_active !== false
  } catch {
    return false
  }
}

export async function requireSuperAdmin(
  request: NextRequest
): Promise<{ authorized: true; userId: string } | { authorized: false; error: NextResponse }> {
  const user = await getUserFromRequest(request)
  if (!user) {
    return { authorized: false, error: NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 }) }
  }

  const ok = await verifySuperAdminProfile(user.id)
  if (!ok) {
    return { authorized: false, error: NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 }) }
  }

  return { authorized: true, userId: user.id }
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
      data: { user },
      error,
    } = await sb.auth.getUser()
    if (error || !user) return { authorized: false }

    const ok = await verifySuperAdminProfile(user.id)
    if (!ok) return { authorized: false }

    return { authorized: true, userId: user.id }
  } catch {
    return { authorized: false }
  }
}
