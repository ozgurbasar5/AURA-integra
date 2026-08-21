/**
 * AURA İntegra — Ödeme & Finans İşlemleri (Payment / Financial Transaction) Factory
 *
 * Gelir/Gider/Kısmi Ödeme/İade finansal hareket kayıtları oluşturur.
 * Tablo: `financial_transactions`
 *
 * Özellikler:
 * - Desteklenen Tipler: `gelir` (income), `gider` (expense)
 * - Desteklenen Kategoriler: `Servis Teslim`, `Satış`, `Cari Borç`, `İade`, `Kısmi Ödeme`, `Kira`, `Maaş`, vb.
 * - Auto-tenant graph resolution & hesap (account) bağlama
 * - N+1 engellemek için batch insert desteği
 */

import { insertOne, insertMany, setupTestEnvironment, type FactoryContext, type Created } from './base.factory'
import { RealisticData } from '../helpers/realistic-data'

export type TransactionType = 'gelir' | 'gider'

export interface CreateFinancialTransactionInput {
  tenantId?: string
  account_id?: string
  accountId?: string
  type?: TransactionType
  description?: string
  category?: string
  amount?: number
  payment_method?: 'nakit' | 'kredi_karti' | 'havale' | 'veresiye'
  transaction_date?: string
  customer_name?: string
  order_no?: string
  service_id?: string
  serviceId?: string
  financial_posted?: boolean
  created_by?: string
  reference_id?: string
}

/**
 * Tek bir finansal işlem kaydı (gelir/gider/iade/kısmi ödeme) oluşturur.
 */
export async function createFinancialTransaction(
  ctx?: Partial<FactoryContext>,
  overrides: CreateFinancialTransactionInput = {},
): Promise<{ transaction: Created<Record<string, unknown>>; ctx: FactoryContext }> {
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
  const type = overrides.type ?? 'gelir'
  const amount = overrides.amount ?? (type === 'gelir' ? RealisticData.serviceFee() : RealisticData.randomDecimal(50, 1000))
  const category = overrides.category ?? (type === 'gelir' ? 'Servis Teslim' : RealisticData.expenseCategory())

  if (amount <= 0) {
    throw new Error('Finansal işlem tutarı 0 veya negatif olamaz.')
  }

  const data = {
    tenant_id: tenantId,
    account_id: overrides.account_id ?? overrides.accountId ?? null,
    type,
    description: overrides.description ?? `Finans işlemi [${type.toUpperCase()}] — ${category}`,
    category,
    amount,
    payment_method: overrides.payment_method ?? RealisticData.paymentMethod(),
    transaction_date: overrides.transaction_date ?? new Date().toISOString(),
    customer_name: overrides.customer_name ?? RealisticData.fullName(),
    order_no: overrides.order_no ?? null,
    service_id: overrides.service_id ?? overrides.serviceId ?? null,
    financial_posted: overrides.financial_posted ?? true,
    created_by: overrides.created_by ?? effectiveCtx.userId ?? null,
    reference_id: overrides.reference_id ?? null,
  }

  const transaction = await insertOne(effectiveCtx, 'financial_transactions', data)
  return { transaction, ctx: effectiveCtx }
}

/**
 * N+1 query oluşturmadan toplu finansal işlem kaydı oluşturur (batch insert).
 */
export async function createFinancialTransactions(
  ctx: FactoryContext,
  count: number,
  overrides: CreateFinancialTransactionInput = {},
): Promise<Created<Record<string, unknown>>[]> {
  if (count <= 0) return []

  const transactions = Array.from({ length: count }, (_, i) => {
    const type = overrides.type ?? (i % 2 === 0 ? 'gelir' : 'gider')
    const amount = overrides.amount ?? (type === 'gelir' ? RealisticData.serviceFee() : RealisticData.randomDecimal(50, 1000))

    return {
      tenant_id: overrides.tenantId ?? ctx.tenantId,
      account_id: overrides.account_id ?? null,
      type,
      description: overrides.description ?? `Batch ${type} işlemi ${i + 1}`,
      category: overrides.category ?? (type === 'gelir' ? 'Servis Teslim' : 'Gider'),
      amount,
      payment_method: overrides.payment_method ?? RealisticData.paymentMethod(),
      transaction_date: overrides.transaction_date ?? new Date().toISOString(),
      customer_name: overrides.customer_name ?? RealisticData.fullName(),
      order_no: overrides.order_no ?? null,
      service_id: overrides.service_id ?? null,
      financial_posted: overrides.financial_posted ?? true,
      created_by: overrides.created_by ?? ctx.userId ?? null,
      reference_id: overrides.reference_id ?? null,
    }
  })

  return insertMany(ctx, 'financial_transactions', transactions)
}
