import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { supabaseGlobalOptions } from './fetch'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseKey) {
    return supabaseResponse
  }

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

  // getSession() → cookie'den okur, network call YAPMAZ (getUser() gibi değil)
  const { data: { session } } = await supabase.auth.getSession()

  const { pathname, searchParams } = request.nextUrl
  const isAuthPage = pathname.startsWith('/login')
  const isAdminPage = pathname.startsWith('/admin')
  const isDashboardPage = pathname.startsWith('/dashboard')
  const isApiRoute = pathname.startsWith('/api/')

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
