import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isSuperAdminEmail } from '@/lib/supabase/auth-helpers'
import { getServiceClient } from '@/lib/supabase/service'
import { evaluateTenantAccess, getTenantBlockMessage } from '@/lib/subscription'

export const dynamic = 'force-dynamic'

const LOGIN_TIMEOUT_MS = 8000

function mapAuthError(message: string): string {
  if (message === 'Invalid login credentials') return 'E-posta veya şifre hatalı.'
  if (message.includes('Email not confirmed')) {
    return 'E-postanızı onaylayın. Supabase → Auth → Users → Confirm email.'
  }
  return message
}

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase yapılandırması eksik' }, { status: 500 })
  }

  let body: { email?: string; password?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  }

  const email = body.email?.trim()
  const password = body.password
  if (!email || !password) {
    return NextResponse.json({ error: 'E-posta ve şifre gerekli' }, { status: 400 })
  }

  let cookieResponse = NextResponse.next({ request })

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        cookieResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieResponse.cookies.set(name, value, options)
        )
      },
    },
  })

  try {
    const signInResult = await Promise.race([
      supabase.auth.signInWithPassword({ email, password }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), LOGIN_TIMEOUT_MS)
      ),
    ])

    const { data, error } = signInResult
    if (error) {
      return NextResponse.json({ error: mapAuthError(error.message) }, { status: 401 })
    }
    if (!data.user) {
      return NextResponse.json({ error: 'Giriş başarısız' }, { status: 401 })
    }

    const user = data.user
    const meta = user.user_metadata as Record<string, unknown> | undefined

    if (meta?.is_active === false) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: 'Hesabınız pasif durumda.' }, { status: 403 })
    }

    // Süper admin — profil beklemeden yönlendir
    if (isSuperAdminEmail(user.email)) {
      const json = NextResponse.json({ ok: true, redirect: '/admin' })
      cookieResponse.cookies.getAll().forEach((cookie) => {
        json.cookies.set(cookie)
      })
      return json
    }

    // Bayi — service role ile hızlı profil kontrolü
    const admin = getServiceClient()
    if (!admin) {
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Sunucu yapılandırması eksik (SERVICE_ROLE_KEY)' },
        { status: 500 }
      )
    }

    const profileResult = await Promise.race([
      admin
        .from('user_profiles')
        .select('role, is_active, tenant_id, tenants(status, subscription_end)')
        .eq('id', user.id)
        .single(),
      new Promise<{ data: null; error: { message: 'timeout' } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 5000)
      ),
    ])

    if (profileResult.error || !profileResult.data) {
      await supabase.auth.signOut()
      return NextResponse.json(
        { error: 'Profil bulunamadı veya sunucu yanıt vermiyor.' },
        { status: 503 }
      )
    }

    const profile = profileResult.data as {
      role: string
      is_active: boolean
      tenant_id: string | null
      tenants: { status: string; subscription_end: string | null } | { status: string; subscription_end: string | null }[] | null
    }

    if (profile.is_active === false) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: getTenantBlockMessage('profile_inactive') }, { status: 403 })
    }

    if (profile.role === 'super_admin') {
      const json = NextResponse.json({ ok: true, redirect: '/admin' })
      cookieResponse.cookies.getAll().forEach((cookie) => {
        json.cookies.set(cookie)
      })
      return json
    }

    if (!profile.tenant_id) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: getTenantBlockMessage('no_tenant') }, { status: 403 })
    }

    const tenantRow = Array.isArray(profile.tenants) ? profile.tenants[0] : profile.tenants
    const access = evaluateTenantAccess({
      status: tenantRow?.status ?? 'passive',
      subscription_end: tenantRow?.subscription_end ?? null,
      has_overdue_payment: false,
    })

    if (!access.allowed) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: access.message }, { status: 403 })
    }

    const json = NextResponse.json({ ok: true, redirect: '/dashboard' })
    cookieResponse.cookies.getAll().forEach((c) => json.cookies.set(c.name, c.value, c))
    return json
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Bilinmeyen hata'
    if (msg === 'TIMEOUT') {
      return NextResponse.json(
        {
          error:
            'Supabase\'e bağlanılamadı (zaman aşımı). İnternet/VPN kontrol edin veya birkaç dakika sonra tekrar deneyin.',
        },
        { status: 504 }
      )
    }
    return NextResponse.json({ error: 'Bağlantı hatası. Tekrar deneyin.' }, { status: 500 })
  }
}
