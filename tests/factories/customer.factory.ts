/**
 * AURA İntegra — Müşteri (Customer) Factory
 *
 * Gerçek DB şemasına dayalı müşteri kayıtları oluşturur.
 * Tablo: `customers`
 *
 * Özellikler:
 * - Otomatik Tenant graph auto-resolution (tenantId yoksa otomatik oluşturur)
 * - Güvenli varsayılan değerler
 * - Override desteği
 * - N+1 sorgusunu önleyen yüksek performanslı batch insert (`createCustomers`)
 */

import { insertOne, insertMany, setupTestEnvironment, type FactoryContext, type Created } from './base.factory'
import { RealisticData } from '../helpers/realistic-data'

export interface CreateCustomerInput {
  tenantId?: string
  full_name?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  notes?: string
  segment?: string
  customer_type?: 'bireysel' | 'kurumsal'
  sms_allowed?: boolean
  email_allowed?: boolean
  company_name?: string
  satisfaction_avg?: number
  kvkk_consent_date?: string
}

/**
 * Tek bir müşteri kaydı oluşturur.
 * Eğer ctx.tenantId veya overrides.tenantId yoksa, otomatik olarak test ortamı (Tenant+Branch+Accounts) kurar.
 */
export async function createCustomer(
  ctx?: Partial<FactoryContext>,
  overrides: CreateCustomerInput = {},
): Promise<{ customer: Created<Record<string, unknown>>; ctx: FactoryContext }> {
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
  const fullName = overrides.full_name ?? RealisticData.fullName()
  const customerType = overrides.customer_type ?? 'bireysel'
  const city = overrides.city ?? RealisticData.city()

  if (overrides.satisfaction_avg !== undefined && (overrides.satisfaction_avg < 0 || overrides.satisfaction_avg > 5)) {
    throw new Error('Müşteri memnuniyet puanı 0-5 arasında olmalıdır.')
  }

  const data = {
    tenant_id: tenantId,
    full_name: fullName,
    phone: overrides.phone ?? RealisticData.phone(),
    email: overrides.email ?? RealisticData.email(fullName),
    address: overrides.address ?? RealisticData.address(city),
    city,
    notes: overrides.notes ?? null,
    segment: overrides.segment ?? 'Standart',
    customer_type: customerType,
    sms_allowed: overrides.sms_allowed ?? true,
    email_allowed: overrides.email_allowed ?? true,
    company_name: overrides.company_name ?? (customerType === 'kurumsal' ? RealisticData.companyName() : null),
    satisfaction_avg: overrides.satisfaction_avg ?? 5.0,
    kvkk_consent_date: overrides.kvkk_consent_date ?? new Date().toISOString().split('T')[0],
  }

  const customer = await insertOne(effectiveCtx, 'customers', data)
  return { customer, ctx: effectiveCtx }
}

/**
 * N+1 query oluşturmadan toplu müşteri kaydı oluşturur (batch insert).
 */
export async function createCustomers(
  ctx: FactoryContext,
  count: number,
  overrides: CreateCustomerInput = {},
): Promise<Created<Record<string, unknown>>[]> {
  if (count <= 0) return []

  const customers = Array.from({ length: count }, () => {
    const fullName = overrides.full_name ?? RealisticData.fullName()
    const customerType = overrides.customer_type ?? 'bireysel'
    const city = overrides.city ?? RealisticData.city()

    return {
      tenant_id: overrides.tenantId ?? ctx.tenantId,
      full_name: fullName,
      phone: overrides.phone ?? RealisticData.phone(),
      email: overrides.email ?? RealisticData.email(fullName),
      address: overrides.address ?? RealisticData.address(city),
      city,
      notes: overrides.notes ?? null,
      segment: overrides.segment ?? 'Standart',
      customer_type: customerType,
      sms_allowed: overrides.sms_allowed ?? true,
      email_allowed: overrides.email_allowed ?? true,
      company_name: overrides.company_name ?? (customerType === 'kurumsal' ? RealisticData.companyName() : null),
      satisfaction_avg: overrides.satisfaction_avg ?? 5.0,
      kvkk_consent_date: overrides.kvkk_consent_date ?? new Date().toISOString().split('T')[0],
    }
  })

  return insertMany(ctx, 'customers', customers)
}
