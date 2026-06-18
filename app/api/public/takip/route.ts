export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { resolveTenantByPortalSlug } from '@/lib/portal-tenant'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'
import {
  fetchOrderStatusHistory,
  searchTenantOrders,
  toPublicOrderHits,
} from '@/lib/public-tracking'

export async function GET(req: NextRequest) {
  const ip = getClientIp(req)
  const rl = await checkRateLimit(`takip:${ip}`, 30, 15 * 60 * 1000)
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Çok fazla sorgu. Lütfen bekleyin.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } },
    )
  }

  const shop = req.nextUrl.searchParams.get('shop')?.trim()
  const q = req.nextUrl.searchParams.get('q')?.trim()

  if (!shop) {
    return NextResponse.json(
      { error: 'Bayi linki gerekli (shop parametresi)' },
      { status: 400 },
    )
  }
  if (!q) {
    return NextResponse.json({ error: 'Sorgu gerekli' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Servis kullanılamıyor' }, { status: 503 })

  const tenant = await resolveTenantByPortalSlug(admin, shop)
  if (!tenant) {
    return NextResponse.json({ error: 'Bayi bulunamadı' }, { status: 404 })
  }

  const flags = tenant.feature_flags ?? {}
  if (flags.portal === false) {
    return NextResponse.json({ error: 'Portal kapalı' }, { status: 403 })
  }

  const rows = await searchTenantOrders(admin, tenant.id, q, 5)
  if (!rows.length) {
    return NextResponse.json({ found: false })
  }

  const order = toPublicOrderHits([rows[0]])[0]
  const history = await fetchOrderStatusHistory(admin, order.id)

  return NextResponse.json({
    found: true,
    tenant: {
      name: tenant.company_name,
      phone: tenant.phone,
    },
    order,
    history,
  })
}
