/**
 * AURA İntegra — Hesap / Kasa (Account) Factory
 *
 * Gerçek DB şemasına dayalı kasa/banka/pos hesapları oluşturur.
 * Tablo: `accounts`
 *
 * Alanlar:
 * - `id`: UUID PRIMARY KEY
 * - `tenant_id`: UUID NOT NULL (FK -> tenants)
 * - `name`: TEXT NOT NULL
 * - `type`: TEXT CHECK (type IN ('kasa', 'banka', 'pos'))
 * - `balance`: NUMERIC(12,2) DEFAULT 0
 * - `currency`: TEXT DEFAULT 'TRY'
 * - `is_active`: BOOLEAN DEFAULT TRUE
 */

import { insertOne, insertMany, setupTestEnvironment, type FactoryContext, type Created } from './base.factory'

export type AccountType = 'kasa' | 'banka' | 'pos'

export interface CreateAccountInput {
  tenantId?: string
  name?: string
  type?: AccountType
  balance?: number
  currency?: string
  is_active?: boolean
}

/**
 * Tek bir hesap (kasa/banka/pos) kaydı oluşturur.
 */
export async function createAccount(
  ctx?: Partial<FactoryContext>,
  overrides: CreateAccountInput = {},
): Promise<{ account: Created<Record<string, unknown>>; ctx: FactoryContext }> {
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
  const type = overrides.type ?? 'kasa'

  const data = {
    tenant_id: tenantId,
    name: overrides.name ?? (type === 'kasa' ? 'Merkez Kasa' : type === 'banka' ? 'Banka Hesabı' : 'POS Hesabı'),
    type,
    balance: overrides.balance ?? 0,
    currency: overrides.currency ?? 'TRY',
    is_active: overrides.is_active ?? true,
  }

  const account = await insertOne(effectiveCtx, 'accounts', data)
  return { account, ctx: effectiveCtx }
}

/**
 * Tenant için standart varsayılan hesapları oluşturur (Kasa + Banka + POS).
 */
export async function createDefaultAccounts(
  ctx: FactoryContext,
): Promise<Created<Record<string, unknown>>[]> {
  const accounts = [
    {
      tenant_id: ctx.tenantId,
      name: 'Nakit Kasa',
      type: 'kasa',
      balance: 0,
      currency: 'TRY',
      is_active: true,
    },
    {
      tenant_id: ctx.tenantId,
      name: 'Banka Hesabı',
      type: 'banka',
      balance: 0,
      currency: 'TRY',
      is_active: true,
    },
    {
      tenant_id: ctx.tenantId,
      name: 'POS Hesabı',
      type: 'pos',
      balance: 0,
      currency: 'TRY',
      is_active: true,
    },
  ]

  return insertMany(ctx, 'accounts', accounts)
}

/**
 * N+1 query oluşturmadan toplu hesap kaydı oluşturur (batch insert).
 */
export async function createAccounts(
  ctx: FactoryContext,
  count: number,
  overrides: CreateAccountInput = {},
): Promise<Created<Record<string, unknown>>[]> {
  if (count <= 0) return []

  const accounts = Array.from({ length: count }, (_, i) => {
    const type = overrides.type ?? (i % 3 === 0 ? 'kasa' : i % 3 === 1 ? 'banka' : 'pos')
    return {
      tenant_id: overrides.tenantId ?? ctx.tenantId,
      name: overrides.name ?? `${type.toUpperCase()} Hesabı ${i + 1}`,
      type,
      balance: overrides.balance ?? 0,
      currency: overrides.currency ?? 'TRY',
      is_active: overrides.is_active ?? true,
    }
  })

  return insertMany(ctx, 'accounts', accounts)
}
