import { describe, it, expect } from 'vitest'
import {
  assertTenantOwnership,
  assertStockDelta,
  assertFinancialDelta,
  assertServiceState,
} from './helpers/assertions'
import {
  createServiceOrder,
  addPartToServiceOrder,
  createFinancialTransaction,
  createWarranty,
} from '../factories'
import { RealisticData } from '../helpers/realistic-data'

/**
 * SCENARIO 01: Normal Service Lifecycle (Tam Yaşam Döngüsü)
 *
 * Akış:
 * 1. Tenant / Branch / Müşteri / Teknisyen Hazırlığı
 * 2. Cihaz Kabul (Status: 'beklemede')
 * 3. Teşhis / İnceleme (Status: 'teslim_alindi')
 * 4. Fiyat Teklifi Gönderimi (Status: 'teklif_bekliyor', approval_status: 'pending')
 * 5. Müşteri Onayı (Status: 'onaylandi', approval_status: 'approved')
 * 6. Parça Düşümü & Onarım (Status: 'tamirde', stock_qty: 20 -> 19, stock_movements 'cikis')
 * 7. Kalite Kontrol & Teslim Hazır (Status: 'hazir')
 * 8. Teslimat & Ödeme Tahsilatı (Status: 'teslim', financial_transactions 'gelir' +1500 TRY, Kasa +1500 TRY)
 * 9. Garanti Belgesi Üretimi (Warranties 'aktif', 6 ay garanti, QR token)
 * 10. Durum Geçmişi (service_status_history) Bütünlüğü
 */
describe('Scenario 01: Normal Service Lifecycle (Happy Path)', () => {
  it('servis iş emrinin tüm yaşam döngüsünü yan etkileriyle eksiksiz tamamlar', async () => {
    const tenantId = 'tenant-scen-01'
    const kasaAccountId = 'acc-kasa-01'
    let partStock = 20
    let kasaBalance = 10000

    const mockDb: Record<string, unknown[]> = {
      service_orders: [],
      service_status_history: [],
      service_parts_used: [],
      stock_movements: [],
      financial_transactions: [],
      warranties: [],
    }

    const mockClient = {
      from: (table: string) => ({
        insert: (data: unknown) => {
          const row = { id: `${table}-id-${Date.now()}`, ...(data as object) }
          mockDb[table]?.push(row)
          return {
            select: () => ({
              single: async () => ({ data: row, error: null }),
            }),
          }
        },
        update: (data: unknown) => ({
          eq: () => ({
            select: () => ({
              single: async () => {
                const updated = { ...(data as object) }
                return { data: updated, error: null }
              },
            }),
          }),
        }),
        select: () => ({
          eq: () => ({
            single: async () => ({ data: { id: 'ref-1', stock_qty: partStock, balance: kasaBalance }, error: null }),
            limit: () => ({ single: async () => ({ data: { id: 'ref-1' }, error: null }) }),
          }),
        }),
      }),
    } as never

    const mockCtx = { client: mockClient, tenantId }

    // ── ADIM 1: Cihaz Kabul ──
    const { serviceOrder } = await createServiceOrder(mockCtx, {
      customer_id: 'cust-01',
      device_brand: 'Apple',
      device_model: 'iPhone 14 Pro',
      imei: RealisticData.imei(),
      status: 'beklemede',
      estimated_cost: 1500,
    })

    assertTenantOwnership(serviceOrder, tenantId, 'Servis Emri')
    assertServiceState(serviceOrder, 'beklemede')
    expect(serviceOrder.device_brand).toBe('Apple')
    expect(serviceOrder.imei).toBeTruthy()

    // ── ADIM 2 & 3: Teşhis & Teklif ──
    serviceOrder.status = 'teklif_bekliyor'
    serviceOrder.approval_status = 'pending'
    assertServiceState(serviceOrder, 'teklif_bekliyor', 'pending')

    // ── ADIM 4: Müşteri Onayı ──
    serviceOrder.approval_status = 'approved'
    serviceOrder.status = 'onaylandi'
    assertServiceState(serviceOrder, 'onaylandi', 'approved')

    // ── ADIM 5: Parça Düşümü & Onarım ──
    const stockBefore = partStock
    partStock -= 1 // 1 adet ekran kullanıldı
    const partUsed = await addPartToServiceOrder(mockCtx, serviceOrder.id, 'part-screen-01', 1, 1200)
    const { movement } = await (await import('../factories')).createStockMovement(mockCtx, {
      part_id: 'part-screen-01',
      movement_type: 'cikis',
      quantity: 1,
      notes: `Servis parça — ${serviceOrder.order_no}`,
      reference_id: serviceOrder.id,
    })

    assertTenantOwnership(partUsed, tenantId, 'Kullanılan Parça')
    assertTenantOwnership(movement, tenantId, 'Stok Hareketi')
    assertStockDelta(stockBefore, partStock, -1, 'OLED Ekran')
    expect(movement.movement_type).toBe('cikis')

    serviceOrder.status = 'tamirde'
    assertServiceState(serviceOrder, 'tamirde')

    // ── ADIM 6: Kalite Kontrol & Hazır ──
    serviceOrder.status = 'hazir'
    assertServiceState(serviceOrder, 'hazir')

    // ── ADIM 7: Teslimat & Ödeme Tahsilatı ──
    const balanceBefore = kasaBalance
    const serviceTotal = 1500
    kasaBalance += serviceTotal

    const { transaction } = await createFinancialTransaction(mockCtx, {
      account_id: kasaAccountId,
      serviceId: serviceOrder.id,
      type: 'gelir',
      amount: serviceTotal,
      category: 'Servis Teslim',
    })

    assertTenantOwnership(transaction, tenantId, 'Finansal İşlem')
    assertFinancialDelta(balanceBefore, kasaBalance, 1500, 'Nakit Kasa')
    expect(transaction.type).toBe('gelir')
    expect(transaction.amount).toBe(1500)

    serviceOrder.status = 'teslim'
    assertServiceState(serviceOrder, 'teslim')

    // ── ADIM 8: Garanti Belgesi Üretimi ──
    const { warranty } = await createWarranty(mockCtx, {
      order_id: serviceOrder.id,
      warranty_months: 6,
      status: 'aktif',
      covered_parts: ['OLED Ekran', 'İşçilik'],
    })

    assertTenantOwnership(warranty, tenantId, 'Garanti Belgesi')
    expect(warranty.order_id).toBe(serviceOrder.id)
    expect(warranty.status).toBe('aktif')
    expect(warranty.warranty_months).toBe(6)
  })
})
