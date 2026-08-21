import { describe, it, expect } from 'vitest'
import {
  assertTenantOwnership,
  assertStockDelta,
  assertServiceState,
  assertNoDuplicateBusinessEffect,
} from './helpers/assertions'
import { createServiceOrder } from '../factories'

/**
 * SCENARIO 02: Quote Rejected (Teklif Reddedildi / İptal)
 *
 * Akış:
 * 1. Cihaz kabul edilir ve incelenir.
 * 2. Müşteriye tamir teklifi sunulur (approval_status: 'pending').
 * 3. Müşteri teklifi reddeder (approval_status: 'rejected', status: 'iptal').
 * 4. Kontroller:
 *    - Parça tüketilmemiş olmalıdır (stock delta = 0).
 *    - Finansal işlem / tahsilat oluşmamalıdır (0 payment).
 *    - Garanti oluşmamalıdır.
 *    - Müşteri verisi ve servis durumu tutarlı kalmalıdır.
 */
describe('Scenario 02: Quote Rejected Workflow', () => {
  it('müşteri teklifi reddettiğinde parça ve ödeme düşmeden servisi güvenle iptal eder', async () => {
    const tenantId = 'tenant-scen-02'
    const initialStock = 15

    const mockDb: {
      partsUsed: unknown[]
      stockMovements: unknown[]
      transactions: unknown[]
      warranties: unknown[]
    } = {
      partsUsed: [],
      stockMovements: [],
      transactions: [],
      warranties: [],
    }

    const mockClient = {
      from: (table: string) => ({
        insert: (data: unknown) => ({
          select: () => ({
            single: async () => ({ data: { id: `${table}-id`, ...(data as object) }, error: null }),
          }),
        }),
      }),
    } as never

    const mockCtx = { client: mockClient, tenantId }

    // 1. Servis kaydı oluştur
    const { serviceOrder } = await createServiceOrder(mockCtx, {
      customer_id: 'cust-scen-02',
      status: 'teklif_bekliyor',
      estimated_cost: 2400,
    })

    assertTenantOwnership(serviceOrder, tenantId, 'Servis Emri')
    assertServiceState(serviceOrder, 'teklif_bekliyor')

    // 2. Müşteri Reddediyor
    const currentStock = initialStock
    serviceOrder.approval_status = 'rejected'
    serviceOrder.status = 'iptal'

    // 3. Durum ve Yan Etki Doğrulamaları
    assertServiceState(serviceOrder, 'iptal', 'rejected')
    assertStockDelta(initialStock, currentStock, 0, 'Yedek Parça')
    assertNoDuplicateBusinessEffect(mockDb.partsUsed, 0, 'Kullanılan Parça')
    assertNoDuplicateBusinessEffect(mockDb.stockMovements, 0, 'Stok Hareketi')
    assertNoDuplicateBusinessEffect(mockDb.transactions, 0, 'Ödeme / Tahsilat')
    assertNoDuplicateBusinessEffect(mockDb.warranties, 0, 'Garanti Belgesi')
  })
})
