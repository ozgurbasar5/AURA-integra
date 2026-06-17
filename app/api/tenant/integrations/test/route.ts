export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantOwner } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { sendSms } from '@/lib/notification-service'
import { getTenantSmsCredentials } from '@/lib/tenant-sms'

/** Entegrasyon bağlantı testi */
export async function POST(req: NextRequest) {
  const auth = await requireTenantOwner()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  let body: { integration?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const integration = body.integration || 'sms'

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
    const ok = !!(process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD)
    return NextResponse.json({
      ok,
      integration: 'smtp',
      message: ok ? 'SMTP yapılandırması mevcut' : 'SMTP_EMAIL / SMTP_PASSWORD eksik',
    })
  }

  return NextResponse.json({ error: 'Bilinmeyen entegrasyon' }, { status: 400 })
}
