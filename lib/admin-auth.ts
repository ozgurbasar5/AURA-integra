import type { User } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import {
  ensureSuperAdminProfile,
  isSuperAdminEmail,
  requireSuperAdminFromServiceRole,
} from '@/lib/supabase/auth-helpers'
import { getUserFromRequest } from '@/lib/supabase/session-from-request'

function asUser(user: { id: string; email: string }): User {
  return { id: user.id, email: user.email } as User
}

export async function requireSuperAdmin(
  request: NextRequest,
): Promise<{ authorized: true; userId: string } | { authorized: false; error: NextResponse }> {
  const user = await getUserFromRequest(request)
  if (!user) {
    return { authorized: false, error: NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 }) }
  }

  let access = await requireSuperAdminFromServiceRole(asUser(user))

  if (
    !access.ok &&
    isSuperAdminEmail(user.email) &&
    (access.reason === 'not_found' || access.reason === 'not_super_admin')
  ) {
    await ensureSuperAdminProfile(asUser(user))
    access = await requireSuperAdminFromServiceRole(asUser(user))
  }

  if (!access.ok) {
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
    const { createServerClient } = await import('@supabase/ssr')
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

    let access = await requireSuperAdminFromServiceRole(user)
    if (
      !access.ok &&
      isSuperAdminEmail(user.email) &&
      (access.reason === 'not_found' || access.reason === 'not_super_admin')
    ) {
      await ensureSuperAdminProfile(user)
      access = await requireSuperAdminFromServiceRole(user)
    }

    if (!access.ok) return { authorized: false }

    return { authorized: true, userId: user.id }
  } catch {
    return { authorized: false }
  }
}
