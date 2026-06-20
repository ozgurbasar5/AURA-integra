export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { getServiceClient } from '@/lib/supabase/service'
import { turnstileErrorMessage, verifyTurnstileToken } from '@/lib/turnstile'

const PLAN_LABELS: Record<string, string> = {
  deneme: '30 Gün Deneme',
  stok_satis: 'Stok & Satış',
  teknik_servis: 'Teknik Servis',
  finans: 'Finans & Analitik',
  starter: 'Stok & Satış',
  pro: 'Teknik Servis',
  enterprise: 'Finans & Analitik',
}

// Public API — auth gerektirmez
export async function POST(request: NextRequest) {
  const ip = getClientIp(request)
  const rl = await checkRateLimit(`basvuru:${ip}`, 5, 60 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json(
      { success: false, error: 'Çok fazla başvuru. Lütfen daha sonra tekrar deneyin.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  try {
    const body = await request.json()

    const {
      firma_adi,
      yetkili_adi,
      email,
      telefon,
      sehir,
      servis_turleri,
      aylik_servis,
      paket,
      mesaj,
      kvkk,
      turnstile_token,
    } = body

    if (!firma_adi || !yetkili_adi || !email || !telefon || !kvkk) {
      return NextResponse.json({ success: false, error: 'Zorunlu alanlar eksik' }, { status: 400 })
    }

    const captcha = await verifyTurnstileToken(turnstile_token)
    if (!captcha.ok) {
      const msg = process.env.TURNSTILE_SECRET_KEY?.trim()
        ? turnstileErrorMessage(captcha.errorCodes)
        : 'CAPTCHA yapılandırması eksik (TURNSTILE_SECRET_KEY)'
      return NextResponse.json({ success: false, error: msg }, { status: 400 })
    }

    const supabase = getServiceClient()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Sunucu yapılandırması eksik' }, { status: 503 })
    }

    const planLabel = paket ? (PLAN_LABELS[String(paket)] ?? String(paket)) : null
    const monthlyLabel = aylik_servis ? String(aylik_servis) : null
    const extraNote = monthlyLabel ? `Aylık servis hacmi: ${monthlyLabel}` : ''
    const deviceNote = Array.isArray(servis_turleri) && servis_turleri.length
      ? `Servis türleri: ${servis_turleri.join(', ')}`
      : ''
    const planNote = planLabel ? `Paket ilgisi: ${planLabel}` : ''
    const fullMessage = [mesaj, extraNote, deviceNote, planNote].filter(Boolean).join('\n').trim() || null

    const coreRow = {
      company_name: firma_adi.trim(),
      contact_name: yetkili_adi.trim(),
      email: email.trim().toLowerCase(),
      phone: telefon.trim(),
      city: sehir?.trim() || null,
      message: fullMessage,
      sirket_adi: firma_adi.trim(),
      yetkili_kisi: yetkili_adi.trim(),
      telefon: telefon.trim(),
    }

    const extendedRow = {
      ...coreRow,
      device_types: Array.isArray(servis_turleri) ? servis_turleri : [],
      monthly_service_count: monthlyLabel,
      plan_interest: planLabel,
      status: 'beklemede' as const,
    }

    let { error } = await supabase.from('bayi_basvurulari').insert(extendedRow)

    if (error && /column|schema cache|invalid input syntax|check constraint|23514|PGRST204/i.test(error.message)) {
      const retry = await supabase.from('bayi_basvurulari').insert({ ...coreRow, status: 'pending' as const })
      error = retry.error
    }

    if (error) {
      console.error('Basvuru DB error:', error.message)
      return NextResponse.json({
        success: false,
        error: 'Başvuru kaydedilemedi. Lütfen daha sonra tekrar deneyin.',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Başvurunuz başarıyla alındı.',
    })
  } catch (err) {
    console.error('Basvuru API error:', err)
    return NextResponse.json({ error: 'İşlem sırasında bir hata oluştu.' }, { status: 500 })
  }
}
