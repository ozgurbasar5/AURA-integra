import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizePortalSlug, suggestPortalSlug } from './portal-url'

export type PortalTenantRow = {
  id: string
  company_name: string
  phone: string | null
  portal_slug: string | null
  feature_flags: Record<string, boolean> | null
}

const TENANT_SELECT = 'id, company_name, phone, portal_slug, feature_flags'

/** portal_slug veya normalize company_name ile bayi bul */
export async function resolveTenantByPortalSlug(
  admin: SupabaseClient,
  rawSlug: string,
): Promise<PortalTenantRow | null> {
  const slug = normalizePortalSlug(rawSlug)
  if (!slug) return null

  const { data: bySlug } = await admin
    .from('tenants')
    .select(TENANT_SELECT)
    .eq('portal_slug', slug)
    .maybeSingle()

  if (bySlug) {
    return bySlug as PortalTenantRow
  }

  const { data: tenants } = await admin
    .from('tenants')
    .select(TENANT_SELECT)
    .limit(200)

  if (!tenants?.length) return null

  const match = (tenants as PortalTenantRow[]).find(t => {
    const fromCompany = suggestPortalSlug(t.company_name || '')
    return fromCompany === slug || normalizePortalSlug(t.company_name || '') === slug
  })

  return match ?? null
}
