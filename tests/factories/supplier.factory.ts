/**
 * AURA İntegra — Tedarikçi (Supplier) Factory
 *
 * Gerçek DB şemasına dayalı tedarikçi kayıtları oluşturur.
 * Tablo: `suppliers`
 *
 * Özellikler:
 * - Auto-tenant graph resolution
 * - Collision-free iletişim bilgileri
 * - Batch insert desteği
 */

import { insertOne, insertMany, setupTestEnvironment, type FactoryContext, type Created } from './base.factory'
import { RealisticData } from '../helpers/realistic-data'

export interface CreateSupplierInput {
  tenantId?: string
  name?: string
  company_name?: string
  contact_name?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  notes?: string
  category?: string
  is_active?: boolean
}

/**
 * Tek bir tedarikçi kaydı oluşturur.
 */
export async function createSupplier(
  ctx?: Partial<FactoryContext>,
  overrides: CreateSupplierInput = {},
): Promise<{ supplier: Created<Record<string, unknown>>; ctx: FactoryContext }> {
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
  const supplierName = overrides.name ?? overrides.company_name ?? RealisticData.supplierName()
  const contactName = overrides.contact_name ?? RealisticData.fullName()
  const city = overrides.city ?? RealisticData.city()

  const data = {
    tenant_id: tenantId,
    name: supplierName,
    company_name: supplierName, // backward compatibility
    contact_name: contactName,
    phone: overrides.phone ?? RealisticData.phone(),
    email: overrides.email ?? RealisticData.email(contactName),
    address: overrides.address ?? RealisticData.address(city),
    city,
    notes: overrides.notes ?? null,
    category: overrides.category ?? RealisticData.partCategory(),
    is_active: overrides.is_active ?? true,
  }

  const supplier = await insertOne(effectiveCtx, 'suppliers', data)
  return { supplier, ctx: effectiveCtx }
}

/**
 * N+1 query oluşturmadan toplu tedarikçi kaydı oluşturur (batch insert).
 */
export async function createSuppliers(
  ctx: FactoryContext,
  count: number,
  overrides: CreateSupplierInput = {},
): Promise<Created<Record<string, unknown>>[]> {
  if (count <= 0) return []

  const suppliers = Array.from({ length: count }, () => {
    const companyName = overrides.company_name ?? RealisticData.supplierName()
    const contactName = overrides.contact_name ?? RealisticData.fullName()
    const city = overrides.city ?? RealisticData.city()

    return {
      tenant_id: overrides.tenantId ?? ctx.tenantId,
      company_name: companyName,
      contact_name: contactName,
      phone: overrides.phone ?? RealisticData.phone(),
      email: overrides.email ?? RealisticData.email(contactName),
      address: overrides.address ?? RealisticData.address(city),
      city,
      notes: overrides.notes ?? null,
      category: overrides.category ?? RealisticData.partCategory(),
      is_active: overrides.is_active ?? true,
    }
  })

  return insertMany(ctx, 'suppliers', suppliers)
}
