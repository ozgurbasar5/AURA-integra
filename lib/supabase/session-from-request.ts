import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { getPublicSupabaseEnv } from './public-env'

export type RequestUser = { id: string; email: string }

/** API route — Supabase tarafından doğrulanmış oturum (getUser) */
export async function getUserFromRequest(request: NextRequest): Promise<RequestUser | null> {
  const env = getPublicSupabaseEnv()
  if (!env) return null

  const { url, anon: key } = env

  try {
    const sb = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: () => {},
      },
    })
    const {
      data: { user },
      error,
    } = await sb.auth.getUser()
    if (error || !user?.id) return null
    return { id: user.id, email: user.email ?? '' }
  } catch {
    return null
  }
}
