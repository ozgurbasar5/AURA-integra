import type { SupabaseClient } from '@supabase/supabase-js'
import { getPlanLevel, type PlanLevel } from './plan-tiers'

export async function getTenantPlanLevel(
  supabase: SupabaseClient,
  tenantId: string,
): Promise<PlanLevel> {
  const { data } = await supabase
    .from('tenants')
    .select('plan_name')
    .eq('id', tenantId)
    .single()
  return getPlanLevel(data?.plan_name)
}

export async function requireTenantPlanLevel(
  supabase: SupabaseClient,
  tenantId: string,
  minLevel: PlanLevel,
): Promise<{ ok: true; level: PlanLevel } | { ok: false; status: number; message: string }> {
  const level = await getTenantPlanLevel(supabase, tenantId)
  if (level < minLevel) {
    return { ok: false, status: 403, message: 'Bu özellik için paket seviyeniz yetersiz.' }
  }
  return { ok: true, level }
}
