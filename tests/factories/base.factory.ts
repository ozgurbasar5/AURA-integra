/**
 * AURA İntegra — Base Factory
 *
 * Tüm factory'lerin miras aldığı temel yardımcılar.
 * Supabase service client kullanarak test veritabanına kayıt yazar.
 *
 * Gerçek DB şemasına dayalı — uydurma kolon veya ilişki yoktur.
 * Tablo yapıları supabase_migration.sql + incremental migration'lardan alınmıştır.
 *
 * İlişki haritası:
 *   subscription_plans (bağımsız)
 *   └── tenants (plan_id → subscription_plans)
 *       ├── user_profiles (tenant_id → tenants, id → auth.users)
 *       ├── branches (tenant_id → tenants)
 *       ├── customers (tenant_id → tenants)
 *       ├── suppliers (tenant_id → tenants)
 *       ├── parts (tenant_id → tenants, supplier_id → suppliers)
 *       ├── products (tenant_id → tenants)
 *       ├── accounts (tenant_id → tenants)
 *       ├── service_orders (tenant_id, customer_id, branch_id, technician_id)
 *       │   ├── service_status_history (order_id → service_orders)
 *       │   ├── service_parts_used (order_id, part_id)
 *       │   ├── service_expenses (service_order_id)
 *       │   └── warranties (order_id → service_orders)
 *       ├── stock_movements (tenant_id, part_id, product_id, created_by)
 *       ├── financial_transactions (tenant_id, account_id, service_id, created_by)
 *       ├── sales (tenant_id, customer_id, sold_by)
 *       └── ... (diğer tenant-scoped tablolar)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { RealisticData } from '../helpers/realistic-data'

// ─── Genel Tipler ───────────────────────────────────────────────────────────

/** Factory'nin insert sonrası döndürdüğü kayıt */
export type Created<T> = T & { id: string; created_at: string }

/** Factory context — tüm factory'lerin paylaştığı bağlam */
export interface FactoryContext {
  /** Service role Supabase client (RLS bypass) */
  client: SupabaseClient
  /** Aktif tenant ID */
  tenantId: string
  /** Aktif user ID (created_by gibi alanlar için) */
  userId?: string
}

// ─── Insert Helper ──────────────────────────────────────────────────────────

/**
 * Tek kayıt ekler ve eklenen kaydı döndürür.
 * Hata durumunda anlamlı mesaj fırlatır.
 */
export async function insertOne<T extends Record<string, unknown>>(
  ctx: FactoryContext,
  table: string,
  data: T,
): Promise<Created<T>> {
  const { data: inserted, error } = await ctx.client
    .from(table)
    .insert(data as never)
    .select()
    .single()

  if (error) {
    throw new Error(
      `Factory insert hatası [${table}]: ${error.message}\n` +
      `Data: ${JSON.stringify(data, null, 2).slice(0, 500)}`
    )
  }

  return inserted as Created<T>
}

/**
 * Toplu kayıt ekler ve eklenen kayıtları döndürür.
 */
export async function insertMany<T extends Record<string, unknown>>(
  ctx: FactoryContext,
  table: string,
  data: T[],
): Promise<Created<T>[]> {
  if (data.length === 0) return []

  // Supabase tek seferde çok büyük batch'leri kaldıramayabilir
  const BATCH_SIZE = 500
  const results: Created<T>[] = []

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE)
    const { data: inserted, error } = await ctx.client
      .from(table)
      .insert(batch as never[])
      .select()

    if (error) {
      throw new Error(
        `Factory batch insert hatası [${table}] (batch ${Math.floor(i / BATCH_SIZE) + 1}): ${error.message}\n` +
        `Batch boyutu: ${batch.length}`
      )
    }

    if (Array.isArray(inserted)) {
      results.push(...(inserted as Created<T>[]))
    }
  }

  return results
}

// ─── Subscription Plan Factory ──────────────────────────────────────────────

export interface CreatePlanInput {
  name?: string
  price?: number
  max_users?: number
  max_branches?: number
  features?: string[]
  is_active?: boolean
}

/**
 * Abonelik planı oluşturur (bağımsız — tenant gerektirmez).
 */
export async function createPlan(
  client: SupabaseClient,
  overrides: CreatePlanInput = {},
) {
  const data = {
    name: overrides.name ?? `Test Plan ${RealisticData.randomInt(1, 999)}`,
    price: overrides.price ?? 499,
    max_users: overrides.max_users ?? 10,
    max_branches: overrides.max_branches ?? 5,
    features: overrides.features ?? ['Teknik Servis', 'Stok', 'Finans', 'Raporlar'],
    is_active: overrides.is_active ?? true,
  }

  const { data: inserted, error } = await client
    .from('subscription_plans')
    .insert(data)
    .select()
    .single()

  if (error) {
    throw new Error(`Plan oluşturma hatası: ${error.message}`)
  }

  return inserted as Created<typeof data>
}

/**
 * Mevcut bir planı ID ile getirir veya yoksa yeni oluşturur.
 */
export async function getOrCreatePlan(
  client: SupabaseClient,
): Promise<{ id: string }> {
  const { data } = await client
    .from('subscription_plans')
    .select('id')
    .eq('is_active', true)
    .limit(1)
    .single()

  if (data) return data as { id: string }
  return createPlan(client)
}

// ─── Tam Test Ortamı Kurulumu ───────────────────────────────────────────────

export interface TestEnvironmentSetup {
  tenant: Created<Record<string, unknown>>
  branch: Created<Record<string, unknown>>
  accounts: Created<Record<string, unknown>>[]
}

/**
 * Tek komutla tam bir tenant + branch + accounts oluşturur.
 * Factory'lerin temel bağlamını (FactoryContext) kurar.
 */
export async function setupTestEnvironment(
  client: SupabaseClient,
  tenantOverrides: Record<string, unknown> = {},
): Promise<TestEnvironmentSetup & { ctx: FactoryContext }> {
  const { createTenant } = await import('./tenant.factory')
  const tenant = await createTenant(client, tenantOverrides)

  const ctx: FactoryContext = {
    client,
    tenantId: tenant.id as string,
  }

  const { createBranch } = await import('./branch.factory')
  const { branch } = await createBranch(ctx)
  const { createDefaultAccounts } = await import('./account.factory')
  const accounts = await createDefaultAccounts(ctx)

  return { tenant, branch, accounts, ctx }
}


