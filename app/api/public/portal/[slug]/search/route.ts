export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { resolveTenantByPortalSlug } from '@/lib/portal-tenant'
import {
  filterOrdersByTrackingQuery,
  mapDbOrderToPortalHit,
  trackingQueryMatchesOrder,
} from '@/lib/tracking-search'

type RouteParams = { params: { slug: string } }

const ORDER_SELECT = `
  id, order_no, status, device_brand, device_model, imei,
  estimated_cost, created_at, estimated_delivery, fault_description,
  customer_name, customer_phone,
  customers ( full_name, phone )
`

export async function GET(req: NextRequest, { params }: RouteParams) {
  const q = req.nextUrl.searchParams.get('q')?.trim()
  if (!q) return NextResponse.json({ results: [] })

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Servis kullanılamıyor' }, { status: 503 })

  const tenant = await resolveTenantByPortalSlug(admin, params.slug)
  if (!tenant) {
    return NextResponse.json(
      {
        error: 'Bayi bulunamadı',
        hint: 'Ayarlar → Müşteri Portali bölümünden slug kaydedin ve Kaydet\'e basın.',
      },
      { status: 404 },
    )
  }

  const flags = tenant.feature_flags ?? {}
  if (flags.portal === false) {
    return NextResponse.json({ error: 'Portal kapalı' }, { status: 403 })
  }

  const safe = q.replace(/[%_\\]/g, '\\$&')
  const pattern = `%${safe}%`
  const merged = new Map<string, Record<string, unknown>>()

  async function addRows(rows: Record<string, unknown>[] | null) {
    for (const row of rows ?? []) merged.set(String(row.id), row)
  }

  const { data: byOrderNo } = await admin
    .from('service_orders')
    .select(ORDER_SELECT)
    .eq('tenant_id', tenant.id)
    .ilike('order_no', pattern)
    .order('created_at', { ascending: false })
    .limit(20)
  await addRows(byOrderNo as Record<string, unknown>[] | null)

  const qDigits = q.replace(/\D/g, '')
  if (merged.size === 0 || qDigits.length >= 4) {
    const { data: byImei } = await admin
      .from('service_orders')
      .select(ORDER_SELECT)
      .eq('tenant_id', tenant.id)
      .ilike('imei', pattern)
      .order('created_at', { ascending: false })
      .limit(20)
    await addRows(byImei as Record<string, unknown>[] | null)
  }

  if (merged.size === 0 && qDigits.length >= 10) {
    const { data: byPhone } = await admin
      .from('service_orders')
      .select(ORDER_SELECT)
      .eq('tenant_id', tenant.id)
      .ilike('customer_phone', `%${qDigits.slice(-10)}%`)
      .order('created_at', { ascending: false })
      .limit(20)
    await addRows(byPhone as Record<string, unknown>[] | null)
  }

  if (merged.size === 0) {
    const { data: byName } = await admin
      .from('service_orders')
      .select(ORDER_SELECT)
      .eq('tenant_id', tenant.id)
      .ilike('customer_name', pattern)
      .order('created_at', { ascending: false })
      .limit(20)
    await addRows(byName as Record<string, unknown>[] | null)
  }

  let rows = [...merged.values()]

  if (rows.length === 0 || needsNormalizedScan(q, rows)) {
    const { data: recent } = await admin
      .from('service_orders')
      .select(ORDER_SELECT)
      .eq('tenant_id', tenant.id)
      .order('created_at', { ascending: false })
      .limit(200)

    const normalizedHits = filterOrdersByTrackingQuery(recent ?? [], q)
    for (const row of normalizedHits) merged.set(String(row.id), row as Record<string, unknown>)
    rows = [...merged.values()]
  }

  rows = filterOrdersByTrackingQuery(rows, q).slice(0, 10)

  return NextResponse.json({
    tenant: {
      name: tenant.company_name,
      phone: tenant.phone,
    },
    results: rows.map(r => mapDbOrderToPortalHit(r)),
  })
}

function needsNormalizedScan(q: string, rows: Record<string, unknown>[]): boolean {
  if (!rows.length) return true
  return rows.every(r => !trackingQueryMatchesOrder(q, String(r.order_no ?? '')))
}
