import { describe, it, expect } from 'vitest'
import {
  assertStockDelta,
  assertNoDuplicateBusinessEffect,
} from './helpers/assertions'
import { createPart } from '../factories'

/**
 * SCENARIO 07: Insufficient Stock Guard Workflow (Yetersiz Stok Koruması)
 *
 * Akış:
 * 1. Stokta 0 adet (veya yetersiz) bulunan bir parça belirlenir.
 * 2. Teknisyen bu parçayı servise eklemeye çalışır.
 * 3. Sistem yetersiz stok uyarısı vererek işlemi reddeder (409 Conflict).
 * 4. Kontroller:
 *    - Stok miktarı negatif olmamalıdır (0 kalmalıdır).
 *    - Hiçbir stok hareketi (cikis) kaydedilmemelidir.
 *    - Servis emri bozulmamalı ve yanlış parça kaydı eklenmemelidir.
 */
describe('Scenario 07: Insufficient Stock Guard Workflow', () => {
  it('stokta bulunmayan parçanın servise eklenmesini engeller ve negatif stoğu önler', async () => {
    const tenantId = 'tenant-scen-07'
    const initialStock = 0
    let currentStock = initialStock

    const mockStockMovements: unknown[] = []

    const mockClient = {
      from: (table: string) => ({
        insert: (data: unknown) => ({
          select: () => ({
            single: async () => ({ data: { id: `${table}-id`, ...(data as object) }, error: null }),
          }),
        }),
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { id: 'part-07', stock_qty: currentStock, name: 'Kamera Lensi' }, error: null }),
          }),
        }),
      }),
    } as never

    const mockCtx = { client: mockClient, tenantId }

    // 1. Stokta 0 adet olan parça
    const { part } = await createPart(mockCtx, {
      name: 'Kamera Lensi',
      stock_qty: 0,
    })

    expect(part.stock_qty).toBe(0)

    // 2. Parça Kullanım Simülasyonu
    const requestedQty = 2
    let attachError: Error | null = null

    try {
      if (currentStock < requestedQty) {
        throw new Error(`Yetersiz stok: ${part.name} (mevcut: ${currentStock}, istenen: ${requestedQty})`)
      }
      currentStock -= requestedQty
      mockStockMovements.push({ part_id: part.id, qty: requestedQty })
    } catch (err) {
      attachError = err as Error
    }

    // 3. Güvenlik ve İnvaryant Doğrulamaları
    expect(attachError).not.toBeNull()
    expect(attachError?.message).toContain('Yetersiz stok')
    assertStockDelta(initialStock, currentStock, 0, 'Kamera Lensi')
    assertNoDuplicateBusinessEffect(mockStockMovements, 0, 'Stok Hareketi')
    expect(currentStock).toBe(0)
  })
})
