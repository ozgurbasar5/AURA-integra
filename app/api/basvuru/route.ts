export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Public API — auth gerektirmez
export async function POST(request: Request) {
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
    } = body

    if (!firma_adi || !yetkili_adi || !email || !telefon || !kvkk) {
      return NextResponse.json({ error: 'Zorunlu alanlar eksik' }, { status: 400 })
    }

    // Service role (bypass RLS) veya anon key (RLS public_insert_basvuru politikası)
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // bayi_basvurulari tablosuna yaz (SQL şemasındaki alan adlarıyla eşleşir)
    const { data, error } = await supabase
      .from('bayi_basvurulari')
      .insert({
        company_name:          firma_adi,
        contact_name:          yetkili_adi,
        email,
        phone:                 telefon,
        city:                  sehir || null,
        device_types:          servis_turleri || [],
        monthly_service_count: aylik_servis || null,
        plan_interest:         paket || null,
        message:               mesaj || null,
        status:                'beklemede',
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
