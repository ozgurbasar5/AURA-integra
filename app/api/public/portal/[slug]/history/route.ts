export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { PUBLIC_STATUS_LABELS, mapDbStatusToPublic } from '@/lib/erp-features'
import { resolveTenantByPortalSlug } from '@/lib/portal-tenant'
import { enforcePublicRateLimit } from '@/lib/public-rate-limit'
import { safeClientMessage } from '@/lib/api-error'
import { isUuid } from '@/lib/supabase/tenant-auth'

type RouteParams = { params: { slug: string } }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const limited = await enforcePublicRateLimit(req, 'portal-history', 40, 15 * 60 * 1000)
  if (limited) return limited

  const orderId = req.nextUrl.searchParams.get('order_id')?.trim()
  if (!orderId || !isUuid(orderId)) {
    return NextResponse.json({ error: 'Geçerli order_id zorunlu' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Servis kullanılamıyor' }, { status: 503 })

  const tenant = await resolveTenantByPortalSlug(admin, params.slug)
  if (!tenant) return NextResponse.json({ error: 'Bayi bulunamadı' }, { status: 404 })

  const flags = tenant.feature_flags ?? {}
  if (flags.portal === false) {
    return NextResponse.json({ error: 'Portal kapalı' }, { status: 403 })
  }

  const { data: order } = await admin
    .from('service_orders')
    .select('id, tenant_id')
    .eq('id', orderId)
    .eq('tenant_id', tenant.id)
    .maybeSingle()

  if (!order) return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 })

  const { data: history, error } = await admin
    .from('service_status_history')
    .select('status, note, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: safeClientMessage(error) }, { status: 500 })

  return NextResponse.json({
    history: (history ?? []).map(h => {
      const pub = mapDbStatusToPublic(String(h.status))
      return {
        status: h.status,
        status_label: PUBLIC_STATUS_LABELS[pub] ?? PUBLIC_STATUS_LABELS[String(h.status)] ?? String(h.status),
        note: h.note ?? '',
        created_at: h.created_at,
      }
    }),
  })
}
