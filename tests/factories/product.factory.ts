/**
 * AURA İntegra — Perakende Ürün (Product) Factory
 *
 * POS ve vitrin satışına uygun ürün kayıtları oluşturur.
 * Tablo: `products`
 *
 * Özellikler:
 * - Auto-tenant graph resolution
 * - Güvenli pozitif stok kontrolü
 * - Collision-free barkod ve ürün kodları
 * - Batch insert desteği
 */

import { insertOne, insertMany, setupTestEnvironment, type FactoryContext, type Created } from './base.factory'
import { RealisticData } from '../helpers/realistic-data'

export interface CreateProductInput {
  tenantId?: string
  name?: string
  code?: string
  barcode?: string
  category?: string
  stock_qty?: number
  min_stock?: number
  purchase_price?: number
  sale_price?: number
  vat_rate?: number
  is_active?: boolean
  allowNegativeStock?: boolean
}

/**
 * Tek bir perakende ürün kaydı oluşturur.
 */
export async function createProduct(
  ctx?: Partial<FactoryContext>,
  overrides: CreateProductInput = {},
): Promise<{ product: Created<Record<string, unknown>>; ctx: FactoryContext }> {
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
  const stockQty = overrides.stock_qty ?? 25

  if (stockQty < 0 && !overrides.allowNegativeStock) {
    throw new Error('Geçersiz ürün stok miktarı. Negatif stok ancak allowNegativeStock: true ile oluşturulabilir.')
  }

  const brand = RealisticData.deviceBrand()
  const model = RealisticData.deviceModel(brand)
  const name = overrides.name ?? `${brand} ${model} Aksesuarı`
  const purchasePrice = overrides.purchase_price ?? RealisticData.randomDecimal(50, 500)
  const salePrice = overrides.sale_price ?? Number((purchasePrice * 1.6).toFixed(2))

  const data = {
    tenant_id: tenantId,
    name,
    code: overrides.code ?? RealisticData.sku('PRD'),
    barcode: overrides.barcode ?? RealisticData.barcode(),
    category: overrides.category ?? 'Aksesuar',
    stock_qty: stockQty,
    min_stock: overrides.min_stock ?? 5,
    purchase_price: purchasePrice,
    sale_price: salePrice,
    vat_rate: overrides.vat_rate ?? 20,
    is_active: overrides.is_active ?? true,
  }

  const product = await insertOne(effectiveCtx, 'products', data)
  return { product, ctx: effectiveCtx }
}

/**
 * N+1 query oluşturmadan toplu ürün kaydı oluşturur (batch insert).
 */
export async function createProducts(
  ctx: FactoryContext,
  count: number,
  overrides: CreateProductInput = {},
): Promise<Created<Record<string, unknown>>[]> {
  if (count <= 0) return []

  const products = Array.from({ length: count }, () => {
    const brand = RealisticData.deviceBrand()
    const model = RealisticData.deviceModel(brand)
    const name = overrides.name ?? `${brand} ${model} Kılıf/Aksesuar`
    const purchasePrice = overrides.purchase_price ?? RealisticData.randomDecimal(50, 500)
    const salePrice = overrides.sale_price ?? Number((purchasePrice * 1.6).toFixed(2))

    return {
      tenant_id: overrides.tenantId ?? ctx.tenantId,
      name,
      code: overrides.code ?? RealisticData.sku('PRD'),
      barcode: overrides.barcode ?? RealisticData.barcode(),
      category: overrides.category ?? 'Aksesuar',
      stock_qty: overrides.stock_qty ?? RealisticData.randomInt(10, 100),
      min_stock: overrides.min_stock ?? 5,
      purchase_price: purchasePrice,
      sale_price: salePrice,
      vat_rate: overrides.vat_rate ?? 20,
      is_active: overrides.is_active ?? true,
    }
  })

  return insertMany(ctx, 'products', products)
}
