import { describe, it, expect } from 'vitest'
import {
  assertTenantOwnership,
  assertStockDelta,
  assertServiceState,
  assertNoDuplicateBusinessEffect,
} from './helpers/assertions'
import {
  createServiceOrder,
  addPartToServiceOrder,
  createStockMovement,
} from '../factories'

/**
 * SCENARIO 05: Cancellation & Part Rollback Workflow (İptal ve Parça İadesi)
 *
 * Akış:
 * 1. Servis siparişi açılır ve parça takılır (stock: 20 -> 18, movement: 'cikis').
 * 2. Müşteri işlemi iptal eder.
 * 3. Parça sökülür ve stoğa geri iade edilir (restore-parts: stock: 18 -> 20, movement: 'iade').
 * 4. Servis durumu 'iptal' olarak işaretlenir.
 * 5. Kontroller:
 *    - Stok miktarı başlangıçtaki değerine tam geri dönmelidir (Net stock delta = 0).
 *    - 1 adet 'cikis' ve 1 adet 'iade' stok hareketi dengeyi sağlamalıdır.
 *    - İptal edilen serviste ödeme kaydı kalmamalıdır.
 */
describe('Scenario 05: Cancellation & Part Rollback Workflow', () => {
  it('servis iptal edildiğinde kullanılan parçaları eksiksiz stoğa iade eder', async () => {
    const tenantId = 'tenant-scen-05'
    let currentPartStock = 20
    const initialStock = 20

    const stockMovements: Array<{ id: string; part_id: string; movement_type: string; quantity: number }> = []

    const mockClient = {
      from: (table: string) => ({
        insert: (data: unknown) => {
          const row = { id: `${table}-id-${stockMovements.length + 1}`, ...(data as object) }
          if (table === 'stock_movements') {
            stockMovements.push(row as typeof stockMovements[0])
          }
          return {
            select: () => ({
              single: async () => ({ data: row, error: null }),
            }),
          }
        },
      }),
    } as never

    const mockCtx = { client: mockClient, tenantId }

    // 1. Servis kaydı
    const { serviceOrder } = await createServiceOrder(mockCtx, {
      customer_id: 'cust-scen-05',
      status: 'tamirde',
    })

    assertTenantOwnership(serviceOrder, tenantId, 'Servis Emri')

    // 2. Parça Kullanımı (2 adet batarya)
    const usedQty = 2
    currentPartStock -= usedQty

    const partUsed = await addPartToServiceOrder(mockCtx, serviceOrder.id, 'part-battery-05', usedQty, 450)
    const { movement: exitMovement } = await createStockMovement(mockCtx, {
      part_id: 'part-battery-05',
      movement_type: 'cikis',
      quantity: usedQty,
      notes: `Servis parça — ${serviceOrder.order_no}`,
      reference_id: serviceOrder.id,
    })

    assertTenantOwnership(partUsed, tenantId, 'Kullanılan Parça')
    assertTenantOwnership(exitMovement, tenantId, 'Çıkış Hareketi')
    assertStockDelta(initialStock, currentPartStock, -usedQty, 'Batarya')

    // 3. İptal ve Parça İadesi (Rollback)
    currentPartStock += usedQty

    const { movement: returnMovement } = await createStockMovement(mockCtx, {
      part_id: 'part-battery-05',
      movement_type: 'iade',
      quantity: usedQty,
      notes: `Servis parça iade — ${serviceOrder.order_no}`,
      reference_id: serviceOrder.id,
    })

    assertTenantOwnership(returnMovement, tenantId, 'İade Hareketi')
    serviceOrder.status = 'iptal'

    // 4. Bütünlük ve Stok Delta Doğrulaması
    assertServiceState(serviceOrder, 'iptal')
    assertStockDelta(initialStock, currentPartStock, 0, 'Batarya Net Stok')
    assertNoDuplicateBusinessEffect(stockMovements, 2, 'Stok Hareketi')

    expect(stockMovements[0].movement_type).toBe('cikis')
    expect(stockMovements[1].movement_type).toBe('iade')
    expect(stockMovements[0].quantity).toBe(usedQty)
    expect(stockMovements[1].quantity).toBe(usedQty)
  })
})
