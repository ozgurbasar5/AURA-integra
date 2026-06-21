export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { resolveTenantByPortalSlug } from '@/lib/portal-tenant'

type RouteParams = { params: { slug: string } }

export async function GET(_req: Request, { params }: RouteParams) {
  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  const tenant = await resolveTenantByPortalSlug(admin, params.slug)
  if (!tenant) {
    return NextResponse.json({ error: 'Portal bulunamadı' }, { status: 404 })
  }

  const { data, error } = await admin
    .from('showcase_devices')
    .select('id, brand, model, sell_price, condition, cosmetic_score, battery_health, color, storage, showcase')
    .eq('tenant_id', tenant.id)
    .eq('showcase', true)
    .neq('status', 'satildi')
    .order('created_at', { ascending: false })
    .limit(12)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    shop_name: tenant.company_name,
    items: (data ?? []).map(d => ({
      id: d.id,
      title: `${d.brand} ${d.model}`.trim(),
      price: Number(d.sell_price) || 0,
      condition: d.condition,
      storage: d.storage,
      color: d.color,
    })),
  })
}
