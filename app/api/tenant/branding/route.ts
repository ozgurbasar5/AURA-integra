import { NextRequest, NextResponse } from 'next/server'
import { normalizePortalSlug } from '@/lib/portal-url'
import { resolveTenantByPortalSlug } from '@/lib/portal-tenant'
import { getServiceClient } from '@/lib/supabase/service'
import { requireTenantAuth, requireTenantOwner } from '@/lib/supabase/tenant-auth'

export const dynamic = 'force-dynamic'

type BrandingPayload = {
  shop_name?: string
  shop_phone?: string
  shop_address?: string
  shop_logo?: string
  portal_slug?: string
  company_name?: string
}

const BRANDING_SELECT_FULL =
  'company_name, phone, address, shop_name, shop_phone, shop_address, shop_logo, portal_slug'
const BRANDING_SELECT_LEGACY = 'company_name, phone, address, shop_name, shop_logo, portal_slug'

function isMissingColumnError(msg: string): boolean {
  return /could not find.*column|schema cache/i.test(msg)
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

async function selectTenantBranding(
  admin: NonNullable<ReturnType<typeof getServiceClient>>,
  filter: { column: 'portal_slug' | 'id'; value: string },
) {
  let result = await admin
    .from('tenants')
    .select(BRANDING_SELECT_FULL)
    .eq(filter.column, filter.value)
    .maybeSingle()

  if (result.error && isMissingColumnError(result.error.message)) {
    result = await admin
      .from('tenants')
      .select(BRANDING_SELECT_LEGACY)
      .eq(filter.column, filter.value)
      .maybeSingle()
  }

  return result
}

function buildBrandingPatch(body: BrandingPayload): Record<string, string> {
  const patch: Record<string, string> = {}

  if (body.shop_name != null) {
    patch.shop_name = body.shop_name
    patch.company_name = body.company_name ?? body.shop_name
  }
  if (body.shop_phone != null) {
    patch.shop_phone = body.shop_phone
    patch.phone = body.shop_phone
  }
  if (body.shop_address != null) {
    patch.shop_address = body.shop_address
    patch.address = body.shop_address
  }
  if (body.shop_logo != null) patch.shop_logo = body.shop_logo
  if (body.portal_slug != null) {
    patch.portal_slug = normalizePortalSlug(body.portal_slug)
  }

  return patch
}

async function updateTenantBranding(
  admin: NonNullable<ReturnType<typeof getServiceClient>>,
  tenantId: string,
  body: BrandingPayload,
) {
  const patch = buildBrandingPatch(body)

  let result = await admin
    .from('tenants')
    .update(patch)
    .eq('id', tenantId)
    .select(BRANDING_SELECT_FULL)
    .single()

  if (result.error && isMissingColumnError(result.error.message)) {
    const legacyPatch = { ...patch }
    delete legacyPatch.shop_address
    delete legacyPatch.shop_phone
    result = await admin
      .from('tenants')
      .update(legacyPatch)
      .eq('id', tenantId)
      .select(BRANDING_SELECT_LEGACY)
      .single()
  }

  return result
}

/** GET — public: ?slug=demo | authenticated: own tenant */
export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('slug')?.trim()
  const admin = getServiceClient()

  if (slug) {
    if (!admin) {
      return NextResponse.json({ error: 'Servis kullanılamıyor' }, { status: 503 })
    }
    const tenant = await resolveTenantByPortalSlug(admin, slug)
    if (!tenant) {
      return NextResponse.json({ error: 'Bayi bulunamadı' }, { status: 404 })
    }
    const { data, error } = await selectTenantBranding(admin, { column: 'id', value: tenant.id })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    if (!data) {
      return NextResponse.json({ error: 'Bayi bulunamadı' }, { status: 404 })
    }
    return NextResponse.json(mapTenantRow(data as Record<string, unknown>))
  }

  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!admin) return NextResponse.json({ error: 'Servis kullanılamıyor' }, { status: 503 })

  const { data, error } = await selectTenantBranding(admin, { column: 'id', value: auth.tenantId })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(mapTenantRow(data as Record<string, unknown>))
}

/** PUT — authenticated tenant branding sync */
export async function PUT(req: NextRequest) {
  const auth = await requireTenantOwner()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const admin = getServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY gerekli' }, { status: 503 })
  }

  const body = await req.json() as BrandingPayload
  const { data, error } = await updateTenantBranding(admin, auth.tenantId, body)

  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        hint: 'Supabase SQL Editor\'de supabase/migrations/20260620_ensure_tenant_branding.sql dosyasını çalıştırın',
      },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, branding: mapTenantRow(data as Record<string, unknown>) })
}
