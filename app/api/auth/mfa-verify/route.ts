export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import {
  MFA_PENDING_COOKIE,
  MFA_TOKEN_COOKIE,
  MFA_VERIFIED_COOKIE,
  generateOtpCode,
  createMfaToken,
  verifyMfaToken,
  mfaCookieOptions,
} from '@/lib/email-2fa'
import { sendMail, isSmtpConfigured } from '@/lib/mail'

/** OTP doğrula — başarılıysa MFA verified cookie */
export async function POST(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkRateLimit(`mfa-verify:${ip}`, 8, 15 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Çok fazla deneme. Lütfen bekleyin.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase yapılandırması eksik' }, { status: 500 })
  }

  let body: { code?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const code = body.code?.trim()
  if (!code) return NextResponse.json({ error: 'Kod gerekli' }, { status: 400 })

  let cookieResponse = NextResponse.next({ request: req })
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value))
        cookieResponse = NextResponse.next({ request: req })
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Oturum yok' }, { status: 401 })

  const token = req.cookies.get(MFA_TOKEN_COOKIE)?.value
  if (!token) return NextResponse.json({ error: 'Doğrulama süresi doldu. Tekrar giriş yapın.' }, { status: 400 })

  if (!verifyMfaToken(user.id, code, token)) {
    return NextResponse.json({ error: 'Kod hatalı veya süresi dolmuş' }, { status: 401 })
  }

  const json = NextResponse.json({ ok: true, redirect: '/dashboard' })
  cookieResponse.cookies.getAll().forEach((c) => json.cookies.set(c))
  json.cookies.set(MFA_VERIFIED_COOKIE, '1', mfaCookieOptions(60 * 60 * 12))
  json.cookies.set(MFA_PENDING_COOKIE, '', { ...mfaCookieOptions(0), maxAge: 0 })
  json.cookies.set(MFA_TOKEN_COOKIE, '', { ...mfaCookieOptions(0), maxAge: 0 })
  return json
}

/** OTP yeniden gönder */
export async function PUT(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ error: 'Supabase yapılandırması eksik' }, { status: 500 })
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => req.cookies.getAll(),
      setAll() {},
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (!user?.email) return NextResponse.json({ error: 'Oturum yok' }, { status: 401 })

  if (!req.cookies.get(MFA_PENDING_COOKIE)?.value) {
    return NextResponse.json({ error: 'Bekleyen MFA yok' }, { status: 400 })
  }

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
  } else {
    return NextResponse.json({ error: 'SMTP yapılandırılmamış' }, { status: 503 })
  }

  const res = NextResponse.json({
    ok: true,
    message: process.env.NODE_ENV === 'development' && !isSmtpConfigured()
      ? 'Dev: kod konsola yazıldı (veya 000000)'
      : 'Kod e-posta ile gönderildi',
  })
  res.cookies.set(MFA_TOKEN_COOKIE, token, mfaCookieOptions(600))
  res.cookies.set(MFA_PENDING_COOKIE, '1', mfaCookieOptions(600))
  return res
}
