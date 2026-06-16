export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ error: 'Sorgu gerekli' }, { status: 400 })

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Servis kullanılamıyor' }, { status: 503 })

  const pattern = `%${q.replace(/[%_\\]/g, '\\$&')}%`

  const { data, error } = await admin
    .from('service_orders')
    .select(`
      id, order_no, status, device_brand, device_model, imei,
      estimated_cost, actual_cost, created_at,
      tenants ( company_name, shop_name, phone, portal_slug ),
      customers ( full_name, phone )
    `)
    .or(`order_no.ilike.${pattern},imei.ilike.${pattern}`)
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const phoneDigits = q.replace(/\D/g, '')
  let rows = data ?? []

  if (rows.length === 0 && phoneDigits.length >= 10) {
    const { data: byPhone } = await admin
      .from('service_orders')
      .select(`
        id, order_no, status, device_brand, device_model, imei,
        estimated_cost, actual_cost, created_at,
        tenants ( company_name, shop_name, phone, portal_slug ),
        customers!inner ( full_name, phone )
      `)
      .ilike('customers.phone', `%${phoneDigits.slice(-10)}%`)
      .order('created_at', { ascending: false })
      .limit(5)
    rows = byPhone ?? []
  }

  if (!rows.length) {
    return NextResponse.json({ found: false })
  }

  const order = rows[0]
  const { data: history } = await admin
    .from('service_status_history')
    .select('status, note, created_at')
    .eq('service_order_id', order.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    found: true,
    order,
    history: history ?? [],
  })
}
