import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'

/**
 * e-Fatura GİB Webhook — NES / Logo entegratöründen gelen durum bildirimleri.
 * Güvenlik: EFATURA_WEBHOOK_SECRET veya CRON_SECRET header doğrulaması.
 */
export async function POST(req: Request) {
  try {
    // ── Auth: webhook secret doğrulama ──
    const secret = process.env.EFATURA_WEBHOOK_SECRET || process.env.CRON_SECRET
    if (secret) {
      const auth = req.headers.get('authorization')?.trim()
      const xSecret = req.headers.get('x-webhook-secret')?.trim()
      if (auth !== `Bearer ${secret}` && xSecret !== secret) {
        return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
      }
    } else if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { ok: false, error: 'EFATURA_WEBHOOK_SECRET yapılandırılmamış' },
        { status: 503 }
      )
    }

    const body = await req.json()
    const { gib_reference, status, message } = body

    if (!gib_reference || !status) {
      return NextResponse.json(
        { ok: false, error: 'Eksik parametreler (gib_reference, status)' },
        { status: 400 }
      )
    }

    // ── Status eşleme ──
    let dbStatus = 'submitted'
    if (status === 'APPROVED' || status === 'ONAYLANDI') {
      dbStatus = 'onaylandi'
    } else if (status === 'REJECTED' || status === 'HATALI') {
      dbStatus = 'failed'
    }

    // ── Supabase güncelleme ──
    const supabase = getServiceClient()
    if (!supabase) {
      console.error('[efatura-webhook] Service client oluşturulamadı')
      return NextResponse.json({ ok: false, error: 'Veritabanı bağlantısı yok' }, { status: 503 })
    }

    const { error: updateError } = await supabase
      .from('efatura_queue')
      .update({
        status: dbStatus,
        gib_reference,
        error_message: message || null,
        updated_at: new Date().toISOString(),
      })
      .eq('gib_reference', gib_reference)

    if (updateError) {
      console.error('[efatura-webhook] DB update error:', updateError)
      return NextResponse.json({ ok: false, error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      message: 'e-Fatura GİB durumu başarıyla güncellendi',
      gib_reference,
      status: dbStatus,
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    console.error('[efatura-webhook] Unhandled error:', message)
    return NextResponse.json({ ok: false, error: message }, { status: 500 })
  }
}

