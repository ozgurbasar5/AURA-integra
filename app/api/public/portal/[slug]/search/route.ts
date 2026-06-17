export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { resolveTenantByPortalSlug } from '@/lib/portal-tenant'
import { searchTenantOrders, toPublicOrderHits } from '@/lib/public-tracking'

type RouteParams = { params: { slug: string } }

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

  const rows = await searchTenantOrders(admin, tenant.id, q, 10)

  return NextResponse.json({
    tenant: {
      name: tenant.company_name,
      phone: tenant.phone,
    },
    results: toPublicOrderHits(rows),
  })
}
