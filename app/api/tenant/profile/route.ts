import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { requireTenantOwner } from '@/lib/supabase/tenant-auth'
import { normalizePortalSlug } from '@/lib/portal-url'

export const dynamic = 'force-dynamic'

type ProfilePayload = {
  full_name?: string
  phone?: string
  company_name?: string
  city?: string
  tax_number?: string
  portal_slug?: string
}

export async function PUT(req: NextRequest) {
  const auth = await requireTenantOwner()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const admin = getServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY gerekli' }, { status: 503 })
  }

  const body = await req.json() as ProfilePayload
  const profilePatch: Record<string, string> = {}
  const tenantPatch: Record<string, string> = {}

  if (body.full_name != null) profilePatch.full_name = body.full_name.trim()
  if (body.phone != null) tenantPatch.phone = body.phone.trim()
  if (body.company_name != null) {
    tenantPatch.company_name = body.company_name.trim()
    tenantPatch.shop_name = body.company_name.trim()
  }
  if (body.city != null) tenantPatch.city = body.city.trim()
  if (body.tax_number != null) tenantPatch.tax_number = body.tax_number.trim()
  if (body.portal_slug != null) {
    tenantPatch.portal_slug = normalizePortalSlug(body.portal_slug)
  }

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await admin
      .from('user_profiles')
      .update(profilePatch)
      .eq('id', auth.userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (Object.keys(tenantPatch).length > 0) {
    if (tenantPatch.portal_slug) {
      const { data: taken } = await admin
        .from('tenants')
        .select('id, company_name')
        .eq('portal_slug', tenantPatch.portal_slug)
        .neq('id', auth.tenantId)
        .maybeSingle()
      if (taken) {
        return NextResponse.json(
          {
            error: `Bu slug başka bir bayide kullanılıyor (${taken.company_name}). Farklı bir slug seçin.`,
          },
          { status: 409 },
        )
      }
    }

    const { error } = await admin
      .from('tenants')
      .update(tenantPatch)
      .eq('id', auth.tenantId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
