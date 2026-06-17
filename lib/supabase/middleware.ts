import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseGlobalOptions } from './fetch'
import { getPublicSupabaseEnv } from './public-env'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const env = getPublicSupabaseEnv()
  if (!env) {
    return supabaseResponse
  }

  const { url: supabaseUrl, anon: supabaseKey } = env

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    ...supabaseGlobalOptions,
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  const { pathname, searchParams } = request.nextUrl
  const isAuthPage = pathname.startsWith('/login')
  const isAdminPage = pathname.startsWith('/admin')
  const isDashboardPage = pathname.startsWith('/dashboard')
  const isApiRoute = pathname.startsWith('/api/')

  // getSession() → cookie'den okur; geçersiz refresh token'da sessiz çıkış
  const { data: { session }, error: sessionError } = await supabase.auth.getSession()

  if (sessionError?.message?.includes('refresh_token') || sessionError?.code === 'refresh_token_not_found') {
    await supabase.auth.signOut()
    if (isAdminPage || isDashboardPage) {
      return NextResponse.redirect(new URL('/login?error=session_expired', request.url))
    }
  }

  // API route'ları middleware auth yönlendirmesinden muaf
  if (isApiRoute) {
    return supabaseResponse
  }

  // Çıkış yap
  if (isAuthPage && searchParams.get('cikis') === '1') {
    await supabase.auth.signOut()
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Auth yok → korumalı sayfalara erişim engelle
  if (!session && (isAdminPage || isDashboardPage)) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Login sayfası her zaman açılır (oturum varken admin'e zorla yönlendirme YOK)
  return supabaseResponse
}
