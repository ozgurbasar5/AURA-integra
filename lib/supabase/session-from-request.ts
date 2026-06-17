import { createServerClient } from '@supabase/ssr'
import type { NextRequest } from 'next/server'
import { getPublicSupabaseEnv } from './public-env'

export type RequestUser = { id: string; email: string }

/** API route — oturumu cookie'den okur (ağ çağrısı yapmaz) */
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
      data: { session },
    } = await sb.auth.getSession()
    if (session?.user?.id) {
      return { id: session.user.id, email: session.user.email ?? '' }
    }
  } catch {
    /* cookie parse */
  }

  return parseUserFromAuthCookie(request, url)
}

function parseUserFromAuthCookie(
  request: NextRequest,
  supabaseUrl: string
): RequestUser | null {
  const ref = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1]
  if (!ref) return null

  const raw =
    request.cookies.get(`sb-${ref}-auth-token`)?.value ??
    request.cookies.get(`sb-${ref}-auth-token.0`)?.value

  if (!raw) return null

  try {
    const decoded = decodeURIComponent(raw)
    const parsed = JSON.parse(decoded) as unknown
    let accessToken: string | undefined

    if (Array.isArray(parsed)) {
      accessToken = typeof parsed[0] === 'string' ? parsed[0] : undefined
    } else if (parsed && typeof parsed === 'object') {
      const obj = parsed as { access_token?: string }
      accessToken = obj.access_token
    }

    if (!accessToken) return null

    const payload = JSON.parse(
      Buffer.from(accessToken.split('.')[1], 'base64url').toString('utf8')
    ) as { sub?: string; email?: string }

    if (!payload.sub) return null
    return { id: payload.sub, email: payload.email ?? '' }
  } catch {
    return null
  }
}
