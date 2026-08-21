/**
 * AURA İntegra — Stok Hareketi (Stock Movement) Factory
 *
 * Parça ve perakende ürünlerin stok giriş/çıkış/düzeltme/sayım hareketlerini oluşturur.
 * Tablo: `stock_movements`
 *
 * Desteklenen Hareket Tipleri (movement_type):
 * - `giris`: Stok alımı / Tedarik / Açılış stoku (IN)
 * - `cikis`: Servis kullanımı / POS Satış (OUT)
 * - `duzeltme`: Manuel envanter düzeltmesi (ADJUSTMENT)
 * - `sayim`: Dönem sonu stok sayım ayarı (COUNT/RETURN)
 */

import { insertOne, insertMany, setupTestEnvironment, type FactoryContext, type Created } from './base.factory'
import { createPart } from './part.factory'

export type MovementType = 'giris' | 'cikis' | 'iade' | 'transfer' | 'fire' | 'duzeltme' | 'sayim'

export interface CreateStockMovementInput {
  tenantId?: string
  part_id?: string
  product_id?: string
  movement_type?: MovementType
  quantity?: number
  notes?: string
  reference_id?: string
  created_by?: string
}

/**
 * Tek bir stok hareketi kaydı oluşturur.
 * part_id veya product_id verilmezse otomatik olarak bir part oluşturur.
 */
export async function createStockMovement(
  ctx?: Partial<FactoryContext>,
  overrides: CreateStockMovementInput = {},
): Promise<{ movement: Created<Record<string, unknown>>; ctx: FactoryContext }> {
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
  let partId = overrides.part_id

  if (!partId && !overrides.product_id) {
    const { part } = await createPart(effectiveCtx)
    partId = part.id
  }

  const movementType = overrides.movement_type ?? 'giris'
  const qty = overrides.quantity ?? 10

  const data = {
    tenant_id: tenantId,
    part_id: partId ?? null,
    product_id: overrides.product_id ?? null,
    movement_type: movementType,
    quantity: qty,
    notes: overrides.notes ?? `Stok hareketi [${movementType.toUpperCase()}]`,
    reference_id: overrides.reference_id ?? null,
    created_by: overrides.created_by ?? effectiveCtx.userId ?? null,
  }

  const movement = await insertOne(effectiveCtx, 'stock_movements', data)
  return { movement, ctx: effectiveCtx }
}

/**
 * N+1 query oluşturmadan toplu stok hareketi oluşturur (batch insert).
 */
export async function createStockMovements(
  ctx: FactoryContext,
  count: number,
  overrides: CreateStockMovementInput = {},
): Promise<Created<Record<string, unknown>>[]> {
  if (count <= 0) return []

  let partId = overrides.part_id
  if (!partId && !overrides.product_id) {
    const { part } = await createPart(ctx)
    partId = part.id
  }

  const movements = Array.from({ length: count }, (_, i) => ({
    tenant_id: overrides.tenantId ?? ctx.tenantId,
    part_id: partId ?? null,
    product_id: overrides.product_id ?? null,
    movement_type: overrides.movement_type ?? 'giris',
    quantity: overrides.quantity ?? (i + 1) * 5,
    notes: overrides.notes ?? `Test batch stok hareketi ${i + 1}`,
    reference_id: overrides.reference_id ?? null,
    created_by: overrides.created_by ?? ctx.userId ?? null,
  }))

  return insertMany(ctx, 'stock_movements', movements)
}
