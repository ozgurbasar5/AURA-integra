export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { sendMail, isSmtpConfigured } from '@/lib/mail'
import { sendSms } from '@/lib/notification-service'
import { getTenantSmsCredentials, logSmsToDb } from '@/lib/tenant-sms'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canWriteTenantData } from '@/lib/api-role-guard'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request)
    const rl = await checkRateLimit(`notify:${ip}`, 20, 15 * 60 * 1000)
    if (!rl.ok) {
      return NextResponse.json(
        { error: 'Çok fazla bildirim isteği. Lütfen bekleyin.' },
        { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
      )
    }

    const auth = await requireTenantAuth()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status })
    }

    if (!canWriteTenantData(auth.role)) {
      return NextResponse.json({ error: 'Bu işlem için yetkiniz yok' }, { status: 403 })
    }

    const supabase = auth.supabase
    const tenantId = auth.tenantId

    const body = await request.json()
    const { to, subject, type, data, message } = body

    if (message && !type) {
      const { data: tenant } = await supabase
        .from('tenants')
        .select('feature_flags')
        .eq('id', tenantId)
        .single()
      const flags = (tenant?.feature_flags as Record<string, boolean>) ?? {}
      if (flags.sms === false) {
        return NextResponse.json({ error: 'SMS özelliği bu bayi için kapalı.' }, { status: 403 })
      }

      const credentials = await getTenantSmsCredentials(tenantId)
      const smsResult = await sendSms({ to, message, tenantId, credentials })

      await logSmsToDb({
        tenantId,
        recipient: to,
        message,
        status: smsResult.status,
        providerRef: smsResult.providerRef,
        errorMessage: smsResult.error,
      })

      return NextResponse.json({ success: smsResult.ok, status: smsResult.status, error: smsResult.error })
    }

    if (!to) {
      return NextResponse.json({ error: 'Alıcı zorunludur.' }, { status: 400 })
    }

    if (!isSmtpConfigured()) {
      return NextResponse.json({ error: 'E-posta yapılandırması eksik.' }, { status: 500 })
    }

    if (!type) {
      return NextResponse.json({ error: 'type veya message gerekli' }, { status: 400 })
    }

    let htmlContent = ''
    const customerName = escapeHtml(data?.customerName || 'Müşteri')
    const device = escapeHtml(data?.device || 'Cihaz')
    const price = escapeHtml(String(data?.price || '0'))
    const islem = escapeHtml(data?.islem || '-')

    if (type === 'hazir') {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; color: #333; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
          <h2 style="color: #d97706;">Cihazınız Teslime Hazır! 🚀</h2>
          <p>Sayın <strong>${customerName}</strong>,</p>
          <p>Servisimize bıraktığınız <strong>${device}</strong> cihazınızın işlemleri tamamlanmıştır.</p>
          <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <tr style="background: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Cihaz Durumu:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; color: green; font-weight: bold;">HAZIR / TAMAMLANDI</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Yapılan İşlem:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd;">${islem}</td>
            </tr>
            <tr style="background: #f9f9f9;">
              <td style="padding: 10px; border: 1px solid #ddd;"><strong>Toplam Tutar:</strong></td>
              <td style="padding: 10px; border: 1px solid #ddd; font-size: 1.2em; font-weight: bold;">${price} TL</td>
            </tr>
          </table>
          <p>Cihazınızı dilediğiniz zaman servisimizden teslim alabilirsiniz.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
          <p style="font-size: 12px; color: #777;">Bu mail Aura Bilişim tarafından otomatik gönderilmiştir.</p>
        </div>
      `
    } else if (type === 'fiyat_onayi') {
      htmlContent = `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2 style="color: #2563eb;">Fiyat Onayı Bekleniyor</h2>
          <p>Sayın ${customerName}, ${device} cihazınız için arıza tespiti yapılmıştır.</p>
          <p><strong>Onarım Tutarı: ${price} TL</strong></p>
          <p>Onaylamak için lütfen bu maili cevaplayınız veya bizi arayınız.</p>
        </div>
      `
    } else {
      return NextResponse.json({ error: 'Geçersiz bildirim türü.' }, { status: 400 })
    }

    const mailResult = await sendMail({
      to,
      subject: subject || 'Cihaz Durum Bilgilendirmesi',
      html: htmlContent,
      fromName: 'Aura Bilişim Servis',
    })

    if (!mailResult.ok) {
      console.error('Mail hatası:', mailResult.error)
      return NextResponse.json({ success: false, error: mailResult.error ?? 'Mail gönderilemedi' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Mail gönderildi' })
  } catch (error) {
    console.error('Mail hatası:', error)
    return NextResponse.json({ success: false, error: 'Mail gönderilemedi' }, { status: 500 })
  }
}