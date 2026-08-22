import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import {
  MFA_PENDING_COOKIE,
  MFA_TOKEN_COOKIE,
  MFA_VERIFIED_COOKIE,
  mfaCookieOptions,
} from '@/lib/email-2fa'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const response = NextResponse.json({ ok: true, redirect: '/login' })

  if (url && key) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options)
          })
        },
      },
    })
    try {
      await supabase.auth.signOut()
    } catch {
      /* ignore */
    }
  }

  // Clear 2FA and session cookies
  response.cookies.set(MFA_PENDING_COOKIE, '', { ...mfaCookieOptions(0), maxAge: 0 })
  response.cookies.set(MFA_TOKEN_COOKIE, '', { ...mfaCookieOptions(0), maxAge: 0 })
  response.cookies.set(MFA_VERIFIED_COOKIE, '', { ...mfaCookieOptions(0), maxAge: 0 })

  return response
}
