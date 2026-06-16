export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'

type RouteParams = { params: { slug: string } }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ results: [] })

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Servis kullanılamıyor' }, { status: 503 })

  const { data: tenant } = await admin
    .from('tenants')
    .select('id, company_name, phone, feature_flags, portal_slug')
    .eq('portal_slug', params.slug)
    .maybeSingle()

  if (!tenant) return NextResponse.json({ error: 'Bayi bulunamadı' }, { status: 404 })

  const flags = (tenant.feature_flags as Record<string, boolean>) ?? {}
  if (flags.portal === false) {
    return NextResponse.json({ error: 'Portal kapalı' }, { status: 403 })
  }

  const pattern = `%${q.replace(/[%_\\]/g, '\\$&')}%`

  const { data, error } = await admin
    .from('service_orders')
    .select(`
      id, order_no, status, device_brand, device_model,
      estimated_cost, created_at, eta, description,
      customers ( full_name, phone )
    `)
    .eq('tenant_id', tenant.id)
    .or(`order_no.ilike.${pattern}`)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const phoneDigits = q.replace(/\D/g, '')
  let rows = data ?? []

  if (rows.length === 0 && phoneDigits.length >= 10) {
    const { data: byPhone } = await admin
      .from('service_orders')
      .select(`
        id, order_no, status, device_brand, device_model,
        estimated_cost, created_at, eta, description,
        customers!inner ( full_name, phone )
      `)
      .eq('tenant_id', tenant.id)
      .ilike('customers.phone', `%${phoneDigits.slice(-10)}%`)
      .order('created_at', { ascending: false })
      .limit(20)
    rows = byPhone ?? []
  }

  if (rows.length === 0) {
    const { data: byName } = await admin
      .from('service_orders')
      .select(`
        id, order_no, status, device_brand, device_model,
        estimated_cost, created_at, eta, description,
        customers!inner ( full_name, phone )
      `)
      .eq('tenant_id', tenant.id)
      .ilike('customers.full_name', pattern)
      .order('created_at', { ascending: false })
      .limit(20)
    rows = byName ?? []
  }

  return NextResponse.json({
    tenant: { name: tenant.company_name, phone: tenant.phone },
    results: rows.map(r => {
      const cust = r.customers as { full_name?: string; phone?: string } | null
      return {
        id: r.id,
        order_no: r.order_no,
        status: r.status,
        device_brand: r.device_brand,
        device_model: r.device_model,
        customer_name: cust?.full_name ?? '',
        customer_phone: cust?.phone ?? '',
        estimated_cost: r.estimated_cost,
        created_at: r.created_at,
        eta: r.eta,
        description: r.description,
      }
    }),
  })
}
