export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import {
  generateOtpCode,
  createMfaToken,
  verifyMfaToken,
} from '@/lib/email-2fa'
import { sendMail, isSmtpConfigured } from '@/lib/mail'

/**
 * Mobil / Bearer MFA challenge — OTP gönderir, mfa_token JSON döner (cookie yok).
 * POST { action: 'challenge' } | { action: 'verify', code, mfa_token }
 */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  let body: { action?: string; code?: string; mfa_token?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const action = body.action || 'challenge'

  if (action === 'verify') {
    const code = body.code?.trim()
    const token = body.mfa_token?.trim()
    if (!code || !token) {
      return NextResponse.json({ error: 'code ve mfa_token gerekli' }, { status: 400 })
    }
    if (!verifyMfaToken(auth.userId, code, token)) {
      return NextResponse.json({ error: 'Kod hatalı veya süresi dolmuş' }, { status: 401 })
    }
    return NextResponse.json({ ok: true, verified: true })
  }

  // challenge
  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  const { data: ts } = await admin
    .from('tenant_settings')
    .select('settings')
    .eq('tenant_id', auth.tenantId)
    .maybeSingle()
  const settings = (ts?.settings ?? {}) as Record<string, unknown>
  const mfaUsers = (settings.email_2fa_users as Record<string, boolean>) || {}
  const mfaEnabled = Boolean(mfaUsers[auth.userId])

  if (!mfaEnabled) {
    return NextResponse.json({ ok: true, required: false })
  }

  const { data: { user } } = await auth.supabase.auth.getUser()
  const email = user?.email
  if (!email) {
    return NextResponse.json({ error: 'E-posta yok' }, { status: 400 })
  }

  const code = generateOtpCode()
  const { token } = createMfaToken(auth.userId, code)
  if (isSmtpConfigured()) {
    await sendMail({
      to: email,
      subject: 'AURA İntegra giriş kodu',
      html: `<p>Giriş doğrulama kodunuz: <strong>${code}</strong></p><p>10 dakika geçerlidir.</p>`,
    })
  } else if (process.env.NODE_ENV === 'development') {
    console.info('[email-2fa] OTP', code)
  }

  return NextResponse.json({
    ok: true,
    required: true,
    mfa_token: token,
    email_hint: email.replace(/(.{2}).+(@.+)/, '$1***$2'),
    message:
      !isSmtpConfigured() && process.env.NODE_ENV === 'development'
        ? 'Dev: kod konsola yazıldı veya 000000 kullanın'
        : 'Doğrulama kodu e-postanıza gönderildi',
  })
}
