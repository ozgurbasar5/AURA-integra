export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getEfaturaSandboxStatus } from '@/lib/efatura/provider'
import { getWhatsAppProvider, getWhatsAppProviderLabel } from '@/lib/whatsapp/provider'

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const smtpConfigured = Boolean(
    process.env.SMTP_HOST?.trim() && process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim(),
  )
  const smsConfigured = Boolean(
    process.env.NETGSM_USERCODE?.trim() || process.env.NETGSM_USCODE?.trim(),
  )
  const encryptionKey = Boolean(process.env.APP_ENCRYPTION_KEY?.trim())
  const efatura = getEfaturaSandboxStatus()
  const wa = getWhatsAppProvider()

  const checks = [
    {
      id: 'smtp',
      label: 'SMTP (e-posta 2FA / cron)',
      ok: smtpConfigured,
      detail: smtpConfigured ? 'Yapılandırılmış' : 'SMTP_HOST / USER / PASS eksik',
    },
    {
      id: 'sms',
      label: 'SMS (Netgsm)',
      ok: smsConfigured || encryptionKey,
      detail: smsConfigured
        ? 'Platform Netgsm env var'
        : encryptionKey
          ? 'Tenant SMS şifreleme anahtarı hazır (bayi ayarı gerekli)'
          : 'Netgsm veya APP_ENCRYPTION_KEY eksik',
    },
    {
      id: 'whatsapp',
      label: 'WhatsApp',
      ok: wa.id === 'meta_cloud',
      detail: getWhatsAppProviderLabel(),
    },
    {
      id: 'efatura',
      label: 'e-Fatura (opsiyonel)',
      // Stub = bilinçli opsiyonel; ürün çekirdeği için zorunlu değil
      ok: efatura.configured || efatura.provider === 'stub',
      detail: efatura.configured
        ? efatura.label
        : efatura.provider === 'stub'
          ? 'Opsiyonel — test modu; GİB’e gerçek gönderim yok (NES/Logo bağlanınca aktif)'
          : `Yapılandırma eksik: ${efatura.missing.join(', ')}`,
    },
  ]

  const coreHealthy = checks.filter(c => c.id !== 'efatura' && c.id !== 'whatsapp').every(c => c.ok)

  return NextResponse.json({
    ok: true,
    healthy: coreHealthy,
    checks,
    efatura: { ...efatura, optional: true },
  })
}
