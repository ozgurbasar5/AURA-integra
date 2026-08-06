export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const qr = url.searchParams.get('qr')
  const imei = url.searchParams.get('imei')
  const tenantId = url.searchParams.get('shop')

  if (!qr && (!imei || !tenantId)) {
    return NextResponse.json({ error: 'QR token veya IMEI + Dükkan kodu gerekli' }, { status: 400 })
  }

  const supabase = getServiceClient()
  if (!supabase) return NextResponse.json({ error: 'Servis geçici olarak kapalı' }, { status: 503 })

  let query = supabase.from('warranties').select(`
    id, customer_name, device_brand, device_model, imei, 
    start_date, end_date, warranty_months, covered_parts, 
    exclusion_reasons, status, terms
  `)

  if (qr) {
    query = query.eq('qr_token', qr)
  } else if (imei && tenantId) {
    query = query.eq('imei', imei).eq('tenant_id', tenantId)
  }

  const { data, error } = await query.single()

  if (error || !data) {
    return NextResponse.json({ error: 'Garanti kaydı bulunamadı' }, { status: 404 })
  }

  // Yalnızca müşteriye gösterilecek güvenli veriler döndürülüyor
  return NextResponse.json({ ok: true, data })
}
