/**
 * AURA İntegra — Şube (Branch) Factory
 *
 * Gerçek DB şemasına dayalı şube kayıtları oluşturur.
 * Tablo: `branches`
 *
 * Alanlar:
 * - `id`: UUID PRIMARY KEY
 * - `tenant_id`: UUID NOT NULL (FK -> tenants)
 * - `name`: TEXT NOT NULL
 * - `city`: TEXT
 * - `address`: TEXT
 * - `phone`: TEXT
 * - `is_active`: BOOLEAN DEFAULT TRUE
 */

import { insertOne, insertMany, setupTestEnvironment, type FactoryContext, type Created } from './base.factory'
import { RealisticData } from '../helpers/realistic-data'

export interface CreateBranchInput {
  tenantId?: string
  name?: string
  city?: string
  address?: string
  phone?: string
  is_active?: boolean
}

/**
 * Tek bir şube kaydı oluşturur.
 */
export async function createBranch(
  ctx?: Partial<FactoryContext>,
  overrides: CreateBranchInput = {},
): Promise<{ branch: Created<Record<string, unknown>>; ctx: FactoryContext }> {
  let effectiveCtx = ctx as FactoryContext

  if (!effectiveCtx?.tenantId && !overrides.tenantId) {
    if (!effectiveCtx?.client) {
      const { createTestDbClient } = await import('../helpers/test-db')
      const { serviceClient } = createTestDbClient()
      const env = await setupTestEnvironment(serviceClient)
      effectiveCtx = env.ctx
    } else {
      const env = await setupTestEnvironment(effectiveCtx.client)
      effectiveCtx = env.ctx
    }
  }

  const tenantId = overrides.tenantId ?? effectiveCtx.tenantId
  const city = overrides.city ?? RealisticData.city()

  const data = {
    tenant_id: tenantId,
    name: overrides.name ?? `${city} Şubesi`,
    city,
    address: overrides.address ?? RealisticData.address(city),
    phone: overrides.phone ?? RealisticData.phone(),
    is_active: overrides.is_active ?? true,
  }

  const branch = await insertOne(effectiveCtx, 'branches', data)
  return { branch, ctx: effectiveCtx }
}

/**
 * N+1 query oluşturmadan toplu şube kaydı oluşturur (batch insert).
 */
export async function createBranches(
  ctx: FactoryContext,
  count: number,
  overrides: CreateBranchInput = {},
): Promise<Created<Record<string, unknown>>[]> {
  if (count <= 0) return []

  const branches = Array.from({ length: count }, () => {
    const city = overrides.city ?? RealisticData.city()
    return {
      tenant_id: overrides.tenantId ?? ctx.tenantId,
      name: overrides.name ?? `${city} ${RealisticData.randomInt(1, 100)}. Şube`,
      city,
      address: overrides.address ?? RealisticData.address(city),
      phone: overrides.phone ?? RealisticData.phone(),
      is_active: overrides.is_active ?? true,
    }
  })

  return insertMany(ctx, 'branches', branches)
}
