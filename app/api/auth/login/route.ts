import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { isSuperAdminEmail, tenantHasOverduePaymentService, requireSuperAdminFromServiceRole, ensureSuperAdminProfile } from '@/lib/supabase/auth-helpers'
import { getServiceClient } from '@/lib/supabase/service'
import { evaluateTenantAccess, getTenantBlockMessage } from '@/lib/subscription'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import {
  MFA_PENDING_COOKIE,
  MFA_TOKEN_COOKIE,
  MFA_VERIFIED_COOKIE,
  generateOtpCode,
  createMfaToken,
  mfaCookieOptions,
} from '@/lib/email-2fa'
import { sendMail, isSmtpConfigured } from '@/lib/mail'

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
  const ip = getClientIp(request)
  const rl = await checkRateLimit(`login:${ip}`, 10, 15 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Çok fazla giriş denemesi. Lütfen bekleyin.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

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

  const email = body.email?.trim().toLowerCase()
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

    // Süper admin — DB profili doğrulanmadan yönlendirme yok
    if (isSuperAdminEmail(user.email)) {
      const admin = getServiceClient()
      if (!admin) {
        await supabase.auth.signOut()
        return NextResponse.json(
          { error: 'Sunucu yapılandırması eksik (SUPABASE_SERVICE_ROLE_KEY)' },
          { status: 500 },
        )
      }

      let access = await requireSuperAdminFromServiceRole(user)
      if (!access.ok) {
        await ensureSuperAdminProfile(user)
        access = await requireSuperAdminFromServiceRole(user)
      }

      if (!access.ok) {
        await supabase.auth.signOut()
        return NextResponse.json(
          { error: 'Admin yetkisi doğrulanamadı. Destek ile iletişime geçin.' },
          { status: 403 },
        )
      }

      const json = NextResponse.json({ ok: true, redirect: '/admin' })
      cookieResponse.cookies.getAll().forEach((cookie) => {
        json.cookies.set(cookie)
      })
      return json
    }

    // Bayi — şifre doğrulandıktan sonra profil/tenant okuma
    const admin = getServiceClient()
    let profile: { role?: string; is_active?: boolean; tenant_id?: string | null } | null = null

    if (admin) {
      const profileResult = await Promise.race([
        admin
          .from('user_profiles')
          .select('role, is_active, tenant_id')
          .eq('id', user.id)
          .single(),
        new Promise<{ data: null; error: { message: 'timeout' } }>((resolve) =>
          setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), 5000)
        ),
      ])

      if (profileResult.data) {
        profile = profileResult.data
      } else if (email) {
        // Controlled resolution: check if a tenant matches user's verified email
        const { data: matchingTenants } = await admin
          .from('tenants')
          .select('id')
          .ilike('email', email)
          .order('created_at', { ascending: false })
          .limit(1)

        if (matchingTenants && matchingTenants.length > 0) {
          const { data: newProf } = await admin
            .from('user_profiles')
            .upsert(
              {
                id: user.id,
                tenant_id: matchingTenants[0].id,
                role: 'tenant_admin',
                is_active: true,
                full_name: (user.user_metadata?.full_name as string) || email.split('@')[0] || 'Bayi Yöneticisi',
              },
              { onConflict: 'id' }
            )
            .select('role, is_active, tenant_id')
            .single()

          if (newProf) profile = newProf
        } else {
          // Check approved application in bayi_basvurulari
          const { data: basvuru } = await admin
            .from('bayi_basvurulari')
            .select('tenant_id')
            .ilike('email', email)
            .not('tenant_id', 'is', null)
            .order('created_at', { ascending: false })
            .limit(1)

          if (basvuru && basvuru.length > 0 && basvuru[0].tenant_id) {
            const { data: newProf } = await admin
              .from('user_profiles')
              .upsert(
                {
                  id: user.id,
                  tenant_id: basvuru[0].tenant_id,
                  role: 'tenant_admin',
                  is_active: true,
                  full_name: (user.user_metadata?.full_name as string) || email.split('@')[0] || 'Bayi Yöneticisi',
                },
                { onConflict: 'id' }
              )
              .select('role, is_active, tenant_id')
              .single()

            if (newProf) profile = newProf
          }
        }
      }
    } else {
      // Fallback with session client
      const { data: profData } = await supabase
        .from('user_profiles')
        .select('role, is_active, tenant_id')
        .eq('id', user.id)
        .single()
      profile = profData
    }

    if (!profile) {
      await supabase.auth.signOut()
      return NextResponse.json(
        {
          error:
            'Bayi profili bulunamadı. İşletmeniz için henüz bayi kaydı oluşturulmamış. Lütfen bayi başvurusu yapın veya sistem yöneticinizle iletişime geçin.',
        },
        { status: 403 }
      )
    }

    if (profile.is_active === false) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: getTenantBlockMessage('profile_inactive') }, { status: 403 })
    }

    if (profile.role === 'super_admin') {
      let access = await requireSuperAdminFromServiceRole(user)
      if (!access.ok) {
        await ensureSuperAdminProfile(user)
        access = await requireSuperAdminFromServiceRole(user)
      }
      if (!access.ok) {
        await supabase.auth.signOut()
        return NextResponse.json({ error: 'Admin yetkisi doğrulanamadı.' }, { status: 403 })
      }
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

    const dbClient = admin || supabase
    const { data: tenantRow } = await dbClient
      .from('tenants')
      .select('status, subscription_end')
      .eq('id', profile.tenant_id)
      .single()

    const hasOverdue = await tenantHasOverduePaymentService(profile.tenant_id)
    const access = evaluateTenantAccess({
      status: tenantRow?.status ?? 'passive',
      subscription_end: tenantRow?.subscription_end ?? null,
      has_overdue_payment: hasOverdue,
    })

    if (!access.allowed) {
      await supabase.auth.signOut()
      return NextResponse.json({ error: access.message }, { status: 403 })
    }

    // E-posta 2FA — tenant_settings.email_2fa_users[userId]
    const { data: ts } = await dbClient
      .from('tenant_settings')
      .select('settings')
      .eq('tenant_id', profile.tenant_id)
      .maybeSingle()
    const settings = (ts?.settings ?? {}) as Record<string, unknown>
    const mfaUsers = (settings.email_2fa_users as Record<string, boolean>) || {}
    const mfaEnabled = Boolean(mfaUsers[user.id])

    if (mfaEnabled && user.email) {
      const code = generateOtpCode()
      const { token } = createMfaToken(user.id, code)
      if (isSmtpConfigured()) {
        await sendMail({
          to: user.email,
          subject: 'AURA İntegra giriş kodu',
          html: `<p>Giriş doğrulama kodunuz: <strong>${code}</strong></p><p>10 dakika geçerlidir.</p>`,
        })
      } else if (process.env.NODE_ENV === 'development') {
        console.info('[email-2fa] OTP', code)
      }

      const json = NextResponse.json({
        ok: true,
        mfa_required: true,
        email_hint: user.email.replace(/(.{2}).+(@.+)/, '$1***$2'),
        message: !isSmtpConfigured() && process.env.NODE_ENV === 'development'
          ? 'Dev: kod konsola yazıldı veya 000000 kullanın'
          : 'Doğrulama kodu e-postanıza gönderildi',
      })
      cookieResponse.cookies.getAll().forEach((cookie) => {
        json.cookies.set(cookie)
      })
      json.cookies.set(MFA_PENDING_COOKIE, '1', mfaCookieOptions(600))
      json.cookies.set(MFA_TOKEN_COOKIE, token, mfaCookieOptions(600))
      json.cookies.set(MFA_VERIFIED_COOKIE, '', { ...mfaCookieOptions(0), maxAge: 0 })
      return json
    }

    const json = NextResponse.json({ ok: true, redirect: '/dashboard', tenant_id: profile.tenant_id })
    cookieResponse.cookies.getAll().forEach((cookie) => {
      json.cookies.set(cookie)
    })
    json.cookies.set(MFA_VERIFIED_COOKIE, '1', mfaCookieOptions(60 * 60 * 12))
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
