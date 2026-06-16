import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { isOwnerRole } from '@/lib/role-access'
import { normalizeTenantRole } from '@/lib/tenant-roles'

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
    tenantPatch.portal_slug = body.portal_slug.toLowerCase().replace(/[^a-z0-9-]/g, '')
  }

  if (Object.keys(profilePatch).length > 0) {
    const { error } = await admin
      .from('user_profiles')
      .update(profilePatch)
      .eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (Object.keys(tenantPatch).length > 0) {
    const { error } = await admin
      .from('tenants')
      .update(tenantPatch)
      .eq('id', profile.tenant_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
