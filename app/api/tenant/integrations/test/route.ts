export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantOwner } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { sendSms } from '@/lib/notification-service'
import { sendMail, isSmtpConfigured } from '@/lib/mail'
import { getTenantSmsCredentials } from '@/lib/tenant-sms'
import { getWhatsAppProvider } from '@/lib/whatsapp/provider'

/** Entegrasyon bağlantı testi — her id kendi adapter'ına gider */
export async function POST(req: NextRequest) {
  const auth = await requireTenantOwner()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  let body: { integration?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const integration = (body.integration || 'sms').toLowerCase()

  if (integration === 'sms') {
    const admin = getServiceClient()
    if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

    const { data: profile } = await admin
      .from('user_profiles')
      .select('phone')
      .eq('id', auth.userId)
      .single()

    const phone = profile?.phone?.trim()
    if (!phone) {
      return NextResponse.json({ error: 'Profil telefonu tanımlı değil' }, { status: 400 })
    }

    const credentials = await getTenantSmsCredentials(auth.tenantId)
    const result = await sendSms({
      to: phone,
      message: 'AURA İntegra SMS test mesajı',
      tenantId: auth.tenantId,
      credentials,
    })

    return NextResponse.json({
      ok: result.ok,
      integration: 'sms',
      status: result.status,
      error: result.error,
    })
  }

  if (integration === 'smtp') {
    if (!isSmtpConfigured()) {
      return NextResponse.json({
        ok: false,
        integration: 'smtp',
        error: 'SMTP_EMAIL / SMTP_PASSWORD eksik',
      })
    }

    const admin = getServiceClient()
    if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

    const { data: profile } = await admin
      .from('user_profiles')
      .select('email')
      .eq('id', auth.userId)
      .single()

    const email = profile?.email?.trim()
    if (!email) {
      return NextResponse.json({ error: 'Profil e-postası tanımlı değil' }, { status: 400 })
    }

    const result = await sendMail({
      to: email,
      subject: 'AURA İntegra SMTP test',
      html: '<p>Bu bir SMTP bağlantı test mesajıdır. Yapılandırma çalışıyor.</p>',
    })

    return NextResponse.json({
      ok: result.ok,
      integration: 'smtp',
      error: result.error,
    })
  }

  if (integration === 'iyzico') {
    const configured = Boolean(process.env.IYZICO_SECRET)
    return NextResponse.json({
      ok: configured,
      integration: 'iyzico',
      message: configured
        ? 'IYZICO_SECRET yapılandırılmış — webhook /api/webhooks/iyzico hazır'
        : undefined,
      error: configured ? undefined : 'IYZICO_SECRET yapılandırılmamış',
    })
  }

  if (integration === 'whatsapp') {
    const provider = getWhatsAppProvider()
    const result = await provider.test()
    return NextResponse.json({
      ok: result.ok,
      integration: 'whatsapp',
      provider: provider.id,
      message: result.message,
      error: result.error,
    })
  }

  if (integration === 'nes') {
    return NextResponse.json({
      ok: false,
      integration: 'nes',
      connected: false,
      error: 'NES Kargo UI’dan kaldırıldı — henüz adapter yok',
    })
  }

  if (integration === 'mikro' || integration === 'logo') {
    return NextResponse.json({
      ok: true,
      integration,
      message: 'CSV dışa aktarım için GET /api/tenant/export/accounting kullanın',
    })
  }

  return NextResponse.json({ error: 'Bilinmeyen entegrasyon' }, { status: 400 })
}
