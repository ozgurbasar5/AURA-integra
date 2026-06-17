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
    // #region agent log
    fetch('http://127.0.0.1:7606/ingest/2904612a-02ec-4ed5-9e0b-19c54a65c5c5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b278b2'},body:JSON.stringify({sessionId:'b278b2',runId:'post-fix',location:'portal-tenant.ts:bySlug',message:'tenant resolved by portal_slug',data:{slug,tenantId:bySlug.id,companyName:bySlug.company_name},timestamp:Date.now(),hypothesisId:'A'})}).catch(()=>{});
    // #endregion
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

  // #region agent log
  fetch('http://127.0.0.1:7606/ingest/2904612a-02ec-4ed5-9e0b-19c54a65c5c5',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'b278b2'},body:JSON.stringify({sessionId:'b278b2',location:'portal-tenant.ts:companyFallback',message:match?'tenant resolved by company name':'tenant not found',data:{slug,matchTenantId:match?.id??null,matchCompany:match?.company_name??null,scannedCount:tenants.length},timestamp:Date.now(),hypothesisId:'B'})}).catch(()=>{});
  // #endregion

  return match ?? null
}
