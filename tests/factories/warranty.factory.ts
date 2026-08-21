/**
 * AURA İntegra — Garanti & Garanti Talebi (Warranty & Claim) Factory
 *
 * Gerçek DB şemasına dayalı garanti ve garanti talep kayıtları oluşturur.
 * Tablolar: `warranties`, `warranty_claims`
 *
 * RELATION GRAPH:
 *   Service Order (Teslim edilmiş)
 *   └── Warranty (Garanti Belgesi / QR Token / SLA)
 *       └── Warranty Claims (Garanti Kapsamında Tekrar Başvuru)
 */

import { insertOne, insertMany, setupTestEnvironment, type FactoryContext, type Created } from './base.factory'
import { RealisticData } from '../helpers/realistic-data'

export interface CreateWarrantyInput {
  tenantId?: string
  order_id?: string
  customer_name?: string
  order_no?: string
  imei?: string
  device_brand?: string
  device_model?: string
  warranty_months?: number
  start_date?: string
  end_date?: string
  covered_parts?: string[]
  terms?: string
  status?: 'aktif' | 'doldu' | 'iptal' | 'kullanildi'
  invoice_no?: string
  sla_days?: number
  notify_before_days?: number
  claim_status?: 'yok' | 'talep_var' | 'onaylandi' | 'reddedildi'
}

export interface CreateWarrantyClaimInput {
  tenantId?: string
  warranty_id?: string
  issue_description?: string
  technician_notes?: string
  resolution?: string
  resolution_amount?: number
  status?: 'open' | 'in_review' | 'resolved' | 'rejected'
  reported_at?: string
}

/**
 * Tek bir garanti belgesi kaydı oluşturur.
 */
export async function createWarranty(
  ctx?: Partial<FactoryContext>,
  overrides: CreateWarrantyInput = {},
): Promise<{ warranty: Created<Record<string, unknown>>; ctx: FactoryContext }> {
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
  const brand = overrides.device_brand ?? RealisticData.deviceBrand()
  const model = overrides.device_model ?? RealisticData.deviceModel(brand)
  const months = overrides.warranty_months ?? 3

  const startDate = overrides.start_date ?? new Date().toISOString().split('T')[0]
  const end = new Date(new Date(startDate).getTime() + months * 30 * 24 * 60 * 60 * 1000)
  const endDate = overrides.end_date ?? end.toISOString().split('T')[0]

  const data = {
    tenant_id: tenantId,
    order_id: overrides.order_id ?? null,
    customer_name: overrides.customer_name ?? RealisticData.fullName(),
    order_no: overrides.order_no ?? RealisticData.orderNo(),
    imei: overrides.imei ?? RealisticData.imei(),
    device_brand: brand,
    device_model: model,
    warranty_months: months,
    start_date: startDate,
    end_date: endDate,
    covered_parts: overrides.covered_parts ?? ['Ekran', 'Batarya', 'İşçilik'],
    terms: overrides.terms ?? 'Sıvı teması ve fiziksel kırılma garanti dışıdır.',
    status: overrides.status ?? 'aktif',
    invoice_no: overrides.invoice_no ?? `INV-${RealisticData.randomInt(10000, 99999)}`,
    sla_days: overrides.sla_days ?? 0,
    notify_before_days: overrides.notify_before_days ?? 7,
    claim_status: overrides.claim_status ?? 'yok',
  }

  const warranty = await insertOne(effectiveCtx, 'warranties', data)
  return { warranty, ctx: effectiveCtx }
}

/**
 * Bir garantiye ait garanti talebi (claim) oluşturur.
 */
export async function createWarrantyClaim(
  ctx?: Partial<FactoryContext>,
  overrides: CreateWarrantyClaimInput = {},
): Promise<{ claim: Created<Record<string, unknown>>; ctx: FactoryContext }> {
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
  let warrantyId = overrides.warranty_id

  if (!warrantyId) {
    const { warranty } = await createWarranty(effectiveCtx)
    warrantyId = warranty.id as string
  }

  const data = {
    tenant_id: tenantId,
    warranty_id: warrantyId,
    issue_description: overrides.issue_description ?? RealisticData.faultDescription(),
    technician_notes: overrides.technician_notes ?? 'Garanti kapsamında inceleme yapıldı.',
    resolution: overrides.resolution ?? null,
    resolution_amount: overrides.resolution_amount ?? 0,
    status: overrides.status ?? 'open',
    reported_at: overrides.reported_at ?? new Date().toISOString(),
  }

  const claim = await insertOne(effectiveCtx, 'warranty_claims', data)
  return { claim, ctx: effectiveCtx }
}

/**
 * N+1 query oluşturmadan toplu garanti kaydı oluşturur (batch insert).
 */
export async function createWarranties(
  ctx: FactoryContext,
  count: number,
  overrides: CreateWarrantyInput = {},
): Promise<Created<Record<string, unknown>>[]> {
  if (count <= 0) return []

  const warranties = Array.from({ length: count }, () => {
    const brand = overrides.device_brand ?? RealisticData.deviceBrand()
    const model = overrides.device_model ?? RealisticData.deviceModel(brand)
    const months = overrides.warranty_months ?? 3
    const startDate = overrides.start_date ?? new Date().toISOString().split('T')[0]
    const end = new Date(new Date(startDate).getTime() + months * 30 * 24 * 60 * 60 * 1000)
    const endDate = overrides.end_date ?? end.toISOString().split('T')[0]

    return {
      tenant_id: overrides.tenantId ?? ctx.tenantId,
      order_id: overrides.order_id ?? null,
      customer_name: overrides.customer_name ?? RealisticData.fullName(),
      order_no: overrides.order_no ?? RealisticData.orderNo(),
      imei: overrides.imei ?? RealisticData.imei(),
      device_brand: brand,
      device_model: model,
      warranty_months: months,
      start_date: startDate,
      end_date: endDate,
      covered_parts: overrides.covered_parts ?? ['Ekran', 'İşçilik'],
      terms: overrides.terms ?? 'Standart parça ve işçilik garantisi.',
      status: overrides.status ?? 'aktif',
      invoice_no: overrides.invoice_no ?? `INV-${RealisticData.randomInt(10000, 99999)}`,
      sla_days: overrides.sla_days ?? 0,
      notify_before_days: overrides.notify_before_days ?? 7,
      claim_status: overrides.claim_status ?? 'yok',
    }
  })

  return insertMany(ctx, 'warranties', warranties)
}
