export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'

/** Mobil / etiket — tenant + kullanıcı özeti */
export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { data: profile } = await auth.supabase
    .from('user_profiles')
    .select('id, full_name, role, tenant_id')
    .eq('id', auth.userId)
    .maybeSingle()

  const { data: tenant } = await auth.supabase
    .from('tenants')
    .select('id, shop_name, company_name, phone, city, portal_slug')
    .eq('id', auth.tenantId)
    .maybeSingle()

  return NextResponse.json({
    ok: true,
    user_id: auth.userId,
    tenant_id: auth.tenantId,
    role: auth.role,
    full_name: profile?.full_name ?? null,
    shop_name: tenant?.shop_name ?? tenant?.company_name ?? null,
    company_name: tenant?.company_name ?? null,
    phone: tenant?.phone ?? null,
    city: tenant?.city ?? null,
    portal_slug: tenant?.portal_slug ?? null,
  })
}
