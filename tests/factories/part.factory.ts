/**
 * AURA İntegra — Yedek Parça (Part) Factory
 *
 * Gerçek DB şemasına dayalı stok yedek parça ve açılış envanteri kayıtları oluşturur.
 * Tablolar: `parts`, `stock_movements`
 *
 * Özellikler:
 * - Açılış stoku (opening quantity) ve otomatik ilk stok hareketi opsiyonu
 * - Güvenli pozitif stok mantığı (negatif stok ancak allowNegativeStock=true ile kabul edilir)
 * - Auto-tenant graph resolution
 * - Collision-free barcode / code üretimi
 * - N+1 engellemek için batch insert desteği
 */

import { insertOne, insertMany, setupTestEnvironment, type FactoryContext, type Created } from './base.factory'
import { RealisticData } from '../helpers/realistic-data'

export interface CreatePartInput {
  tenantId?: string
  name?: string
  code?: string
  barcode?: string
  category?: string
  stock_qty?: number
  min_stock_qty?: number
  purchase_price?: number
  sale_price?: number
  compatible_models?: string[]
  supplier?: string
  supplier_id?: string
  location?: string
  is_active?: boolean
  allowNegativeStock?: boolean
  createOpeningMovement?: boolean
}

/**
 * Tek bir yedek parça ve opsiyonel açılış stoku kaydı oluşturur.
 */
export async function createPart(
  ctx?: Partial<FactoryContext>,
  overrides: CreatePartInput = {},
): Promise<{ part: Created<Record<string, unknown>>; ctx: FactoryContext }> {
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
  const stockQty = overrides.stock_qty ?? 20

  if (stockQty < 0 && !overrides.allowNegativeStock) {
    throw new Error('Geçersiz stok miktarı. Negatif stok oluşturmak için allowNegativeStock: true bayrağı gereklidir.')
  }

  const category = overrides.category ?? RealisticData.partCategory()
  const name = overrides.name ?? RealisticData.partName(category)
  const purchasePrice = overrides.purchase_price ?? RealisticData.partPrice()
  const salePrice = overrides.sale_price ?? (overrides.purchase_price ? purchasePrice * 1.5 : RealisticData.partSalePrice())

  const data = {
    tenant_id: tenantId,
    name,
    code: overrides.code ?? RealisticData.sku('PRT'),
    barcode: overrides.barcode ?? RealisticData.barcode(),
    category,
    stock_qty: stockQty,
    min_stock_qty: overrides.min_stock_qty ?? 5,
    purchase_price: purchasePrice,
    sale_price: salePrice,
    compatible_models: overrides.compatible_models ?? RealisticData.compatibleBrands(),
    supplier: overrides.supplier ?? RealisticData.supplierName(),
    supplier_id: overrides.supplier_id ?? null,
    location: overrides.location ?? `Raf-${RealisticData.randomInt(1, 10)}-${RealisticData.randomInt(1, 5)}`,
    is_active: overrides.is_active ?? true,
  }

  const part = await insertOne(effectiveCtx, 'parts', data)

  if (overrides.createOpeningMovement && stockQty > 0) {
    try {
      await insertOne(effectiveCtx, 'stock_movements', {
        tenant_id: tenantId,
        part_id: part.id,
        movement_type: 'giris',
        quantity: stockQty,
        notes: 'Açılış stoku (factory)',
        created_by: effectiveCtx.userId ?? null,
      })
    } catch {
      // Stock movement insert opsiyoneldir
    }
  }

  return { part, ctx: effectiveCtx }
}

/**
 * N+1 query oluşturmadan toplu yedek parça kaydı oluşturur (batch insert).
 */
export async function createParts(
  ctx: FactoryContext,
  count: number,
  overrides: CreatePartInput = {},
): Promise<Created<Record<string, unknown>>[]> {
  if (count <= 0) return []

  const parts = Array.from({ length: count }, () => {
    const category = overrides.category ?? RealisticData.partCategory()
    const name = overrides.name ?? RealisticData.partName(category)
    const purchasePrice = overrides.purchase_price ?? RealisticData.partPrice()
    const salePrice = overrides.sale_price ?? (purchasePrice * 1.5)
    const stockQty = overrides.stock_qty ?? RealisticData.randomInt(5, 50)

    return {
      tenant_id: overrides.tenantId ?? ctx.tenantId,
      name,
      code: overrides.code ?? RealisticData.sku('PRT'),
      barcode: overrides.barcode ?? RealisticData.barcode(),
      category,
      stock_qty: stockQty,
      min_stock_qty: overrides.min_stock_qty ?? 5,
      purchase_price: purchasePrice,
      sale_price: salePrice,
      compatible_models: overrides.compatible_models ?? RealisticData.compatibleBrands(),
      supplier: overrides.supplier ?? RealisticData.supplierName(),
      supplier_id: overrides.supplier_id ?? null,
      location: overrides.location ?? `Raf-${RealisticData.randomInt(1, 10)}`,
      is_active: overrides.is_active ?? true,
    }
  })

  return insertMany(ctx, 'parts', parts)
}
