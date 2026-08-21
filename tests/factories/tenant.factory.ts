/**
 * AURA İntegra — Bayi (Tenant) Factory
 *
 * Gerçek DB şemasına dayalı tenant ve tam tenant grafiği oluşturur.
 * Tablo: `tenants`
 *
 * RELATION GRAPH:
 *   Subscription Plan
 *   └── Tenant
 *       ├── Branch (Merkez Şube)
 *       ├── Accounts (Kasa + Banka + POS)
 *       └── Technician / User (Varsayılan Personel)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { getOrCreatePlan, insertMany, type FactoryContext, type Created } from './base.factory'
import { createBranch } from './branch.factory'
import { createDefaultAccounts } from './account.factory'
import { createTechnician } from './technician.factory'
import { RealisticData } from '../helpers/realistic-data'

export interface CreateTenantInput {
  company_name?: string
  contact_name?: string
  email?: string
  phone?: string
  city?: string
  address?: string
  tax_number?: string
  plan_id?: string
  status?: 'active' | 'passive' | 'suspended' | 'trial'
  portal_slug?: string
  shop_name?: string
}

export interface TenantGraphResult {
  tenant: Created<Record<string, unknown>>
  branch: Created<Record<string, unknown>>
  accounts: Created<Record<string, unknown>>[]
  technician?: Created<Record<string, unknown>>
  ctx: FactoryContext
}

/**
 * Tek bir tenant (bayi) kaydı oluşturur.
 */
export async function createTenant(
  client: SupabaseClient,
  overrides: CreateTenantInput = {},
): Promise<Created<Record<string, unknown>>> {
  const plan = overrides.plan_id
    ? { id: overrides.plan_id }
    : await getOrCreatePlan(client)

  const companyName = overrides.company_name ?? RealisticData.companyName()
  const contactName = overrides.contact_name ?? RealisticData.fullName()
  const city = overrides.city ?? RealisticData.city()

  const data = {
    company_name: companyName,
    contact_name: contactName,
    email: overrides.email ?? RealisticData.email(contactName),
    phone: overrides.phone ?? RealisticData.phone(),
    city,
    address: overrides.address ?? RealisticData.address(city),
    tax_number: overrides.tax_number ?? RealisticData.vkn(),
    plan_id: plan.id,
    status: overrides.status ?? 'active',
    subscription_start: new Date().toISOString(),
    subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    portal_slug: overrides.portal_slug ?? overrides.shop_name ?? RealisticData.shopName(),
    shop_name: overrides.shop_name ?? companyName,
  }

  const { data: inserted, error } = await client
    .from('tenants')
    .insert(data)
    .select()
    .single()

  if (error) {
    throw new Error(`Tenant oluşturma hatası: ${error.message}`)
  }

  return inserted as Created<Record<string, unknown>>
}

/**
 * Tek komutla tam bir izole tenant grafiği oluşturur:
 * Tenant → Branch → Default Accounts (Kasa/Banka/POS) → Technician
 */
export async function createTenantGraph(
  client: SupabaseClient,
  overrides: CreateTenantInput = {},
  options: { createTechnician?: boolean } = { createTechnician: true },
): Promise<TenantGraphResult> {
  const tenant = await createTenant(client, overrides)

  const ctx: FactoryContext = {
    client,
    tenantId: tenant.id as string,
  }

  const { branch } = await createBranch(ctx)
  const accounts = await createDefaultAccounts(ctx)

  let technician: Created<Record<string, unknown>> | undefined
  if (options.createTechnician) {
    try {
      const techRes = await createTechnician(ctx)
      technician = techRes.technician
    } catch {
      // Opsiyonel auth/user_profile
    }
  }

  return {
    tenant,
    branch,
    accounts,
    technician,
    ctx,
  }
}

/**
 * N+1 query oluşturmadan toplu tenant kaydı oluşturur (batch insert).
 */
export async function createTenants(
  client: SupabaseClient,
  count: number,
  overrides: CreateTenantInput = {},
): Promise<Created<Record<string, unknown>>[]> {
  if (count <= 0) return []

  const plan = overrides.plan_id
    ? { id: overrides.plan_id }
    : await getOrCreatePlan(client)

  const tenants = Array.from({ length: count }, () => {
    const companyName = overrides.company_name ?? RealisticData.companyName()
    const contactName = overrides.contact_name ?? RealisticData.fullName()
    const city = overrides.city ?? RealisticData.city()

    return {
      company_name: companyName,
      contact_name: contactName,
      email: RealisticData.email(contactName),
      phone: overrides.phone ?? RealisticData.phone(),
      city,
      address: overrides.address ?? RealisticData.address(city),
      tax_number: overrides.tax_number ?? RealisticData.vkn(),
      plan_id: plan.id,
      status: overrides.status ?? 'active',
      subscription_start: new Date().toISOString(),
      subscription_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      portal_slug: RealisticData.shopName(),
      shop_name: companyName,
    }
  })

  const dummyCtx: FactoryContext = { client, tenantId: '' }
  return insertMany(dummyCtx, 'tenants', tenants)
}
