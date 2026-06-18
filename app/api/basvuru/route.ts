export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import { verifyTurnstileToken } from '@/lib/turnstile'

const PLAN_LABELS: Record<string, string> = {
  deneme: '30 Gün Deneme',
  stok_satis: 'Stok & Satış',
  teknik_servis: 'Teknik Servis',
  finans: 'Finans & Analitik',
  starter: 'Stok & Satış',
  pro: 'Teknik Servis',
  enterprise: 'Finans & Analitik',
}

function getSupabaseForInsert() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (url && serviceKey) {
    return createClient(url, serviceKey)
  }
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (url && anonKey) {
    return createClient(url, anonKey)
  }
  return null
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

    const captchaOk = await verifyTurnstileToken(turnstile_token, ip)
    if (!captchaOk) {
      const msg = process.env.TURNSTILE_SECRET_KEY
        ? 'Güvenlik doğrulaması başarısız'
        : 'CAPTCHA yapılandırması eksik (TURNSTILE_SECRET_KEY)'
      return NextResponse.json({ success: false, error: msg }, { status: 400 })
    }

    const supabase = getSupabaseForInsert()
    if (!supabase) {
      return NextResponse.json({ success: false, error: 'Sunucu yapılandırması eksik' }, { status: 503 })
    }

    const planLabel = paket ? (PLAN_LABELS[String(paket)] ?? String(paket)) : null
    const monthlyLabel = aylik_servis ? String(aylik_servis) : null
    const extraNote = monthlyLabel ? `Aylık servis hacmi: ${monthlyLabel}` : ''
    const fullMessage = [mesaj, extraNote].filter(Boolean).join('\n').trim() || null

    const { data, error } = await supabase
      .from('bayi_basvurulari')
      .insert({
        company_name: firma_adi.trim(),
        contact_name: yetkili_adi.trim(),
        email: email.trim().toLowerCase(),
        phone: telefon.trim(),
        city: sehir?.trim() || null,
        device_types: Array.isArray(servis_turleri) ? servis_turleri : [],
        monthly_service_count: monthlyLabel,
        plan_interest: planLabel,
        message: fullMessage,
        status: 'beklemede',
      })
      .select('id')
      .single()

    if (error) {
      console.error('Basvuru DB error:', error.message)
      return NextResponse.json({
        success: false,
        error: 'Başvuru kaydedilemedi. Lütfen daha sonra tekrar deneyin.',
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      id: (data as any)?.id,
      message: 'Başvurunuz başarıyla alındı.',
    })
  } catch (err) {
    console.error('Basvuru API error:', err)
    return NextResponse.json({ error: 'İşlem sırasında bir hata oluştu.' }, { status: 500 })
  }
}
