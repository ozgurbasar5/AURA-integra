import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

type BrandingPayload = {
  shop_name?: string
  shop_phone?: string
  shop_address?: string
  shop_logo?: string
  portal_slug?: string
  company_name?: string
}

function mapTenantRow(row: Record<string, unknown>) {
  return {
    shopName: String(row.shop_name || row.company_name || 'AURA İntegra'),
    shopPhone: String(row.shop_phone || row.phone || ''),
    shopAddress: String(row.shop_address || row.address || ''),
    shopLogo: row.shop_logo ? String(row.shop_logo) : null,
    portalSlug: String(row.portal_slug || ''),
  }
}

/** GET — public: ?slug=demo | authenticated: own tenant */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim()
  const admin = getServiceClient()

  if (slug) {
    if (!admin) {
      return NextResponse.json({ error: 'Servis kullanılamıyor' }, { status: 503 })
    }
    const { data, error } = await admin
      .from('tenants')
      .select('company_name, phone, address, shop_name, shop_phone, shop_address, shop_logo, portal_slug')
      .eq('portal_slug', slug)
      .maybeSingle()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Bayi bulunamadı' }, { status: 404 })
    }
    return NextResponse.json(mapTenantRow(data as Record<string, unknown>))
  }

  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single()

  if (!profile?.tenant_id || !admin) {
    return NextResponse.json({ error: 'Profil bulunamadı' }, { status: 403 })
  }

  const { data, error } = await admin
    .from('tenants')
    .select('company_name, phone, address, shop_name, shop_phone, shop_address, shop_logo, portal_slug')
    .eq('id', profile.tenant_id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(mapTenantRow(data as Record<string, unknown>))
}

/** PUT — authenticated tenant branding sync */
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

  const admin = getServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY gerekli' }, { status: 503 })
  }

  const body = await req.json() as BrandingPayload
  const patch: Record<string, string> = {}

  if (body.shop_name != null) {
    patch.shop_name = body.shop_name
    patch.company_name = body.company_name ?? body.shop_name
  }
  if (body.shop_phone != null) patch.shop_phone = body.shop_phone
  if (body.shop_address != null) patch.shop_address = body.shop_address
  if (body.shop_logo != null) patch.shop_logo = body.shop_logo
  if (body.portal_slug != null) patch.portal_slug = body.portal_slug.toLowerCase().replace(/[^a-z0-9-]/g, '')

  const { data, error } = await admin
    .from('tenants')
    .update(patch)
    .eq('id', profile.tenant_id)
    .select('company_name, phone, address, shop_name, shop_phone, shop_address, shop_logo, portal_slug')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message, hint: 'Supabase migration dosyasını çalıştırın' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, branding: mapTenantRow(data as Record<string, unknown>) })
}
