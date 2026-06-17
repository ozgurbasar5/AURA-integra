import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { isOwnerRole } from '@/lib/role-access'
import { normalizeTenantRole } from '@/lib/tenant-roles'
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
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id) {
    return NextResponse.json({ error: 'Profil bulunamadı' }, { status: 403 })
  }

  const userRole = normalizeTenantRole(profile.role)
  if (!isOwnerRole(userRole)) {
    return NextResponse.json({ error: 'Bu işlem için yönetici yetkisi gerekli' }, { status: 403 })
  }

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
      .eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (Object.keys(tenantPatch).length > 0) {
    if (tenantPatch.portal_slug) {
      const { data: taken } = await admin
        .from('tenants')
        .select('id, company_name')
        .eq('portal_slug', tenantPatch.portal_slug)
        .neq('id', profile.tenant_id)
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
      .eq('id', profile.tenant_id)
    if (error) {
      // #region agent log
      fetch('http://127.0.0.1:7606/ingest/2904612a-02ec-4ed5-9e0b-19c54a65c5c5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b278b2'},body:JSON.stringify({sessionId:'b278b2',location:'profile/route.ts:updateError',message:'tenant patch failed',data:{tenantId:profile.tenant_id,portalSlug:tenantPatch.portal_slug??null,error:error.message},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
      // #endregion
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    // #region agent log
    if (tenantPatch.portal_slug) {
      fetch('http://127.0.0.1:7606/ingest/2904612a-02ec-4ed5-9e0b-19c54a65c5c5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b278b2'},body:JSON.stringify({sessionId:'b278b2',location:'profile/route.ts:slugSaved',message:'portal_slug saved',data:{tenantId:profile.tenant_id,portalSlug:tenantPatch.portal_slug},timestamp:Date.now(),hypothesisId:'D'})}).catch(()=>{});
    }
    // #endregion
  }

  return NextResponse.json({ ok: true })
}
