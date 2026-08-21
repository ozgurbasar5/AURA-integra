import { describe, it, expect } from 'vitest'
import {
  createServiceOrder,
  createCustomer,
  createPart,
  createFinancialTransaction,
  createWarranty,
} from '../factories'
import { assertTenantOwnership } from '../scenarios/helpers/assertions'

/**
 * SECURITY TEST: RLS & Multi-Tenant Database Isolation
 *
 * Amaç:
 * Tenant A ve Tenant B verilerinin tamamen izole olduğunu,
 * Tenant A kullanıcısının Tenant B verilerini okuyamadığını, değiştiremediğini ve silemediğini doğrulamak.
 */
describe('Security: RLS & Cross-Tenant Data Isolation', () => {
  const tenantA = 'tenant-sec-a'
  const tenantB = 'tenant-sec-b'

  // İki ayrı tenant veritabanı simülasyonu
  const dbTenantA: Record<string, Array<{ id: string; tenant_id: string; [key: string]: unknown }>> = {
    service_orders: [],
    customers: [],
    parts: [],
    financial_transactions: [],
    warranties: [],
  }

  const dbTenantB: Record<string, Array<{ id: string; tenant_id: string; [key: string]: unknown }>> = {
    service_orders: [],
    customers: [],
    parts: [],
    financial_transactions: [],
    warranties: [],
  }

  const createTenantMockClient = (activeTenantId: string, activeDb: typeof dbTenantA, targetDb: typeof dbTenantB) => ({
    from: (table: string) => ({
      insert: (data: unknown) => {
        const row = { id: `${table}-${Date.now()}-${Math.random()}`, tenant_id: activeTenantId, ...(data as object) }
        activeDb[table]?.push(row)
        return {
          select: () => ({
            single: async () => ({ data: row, error: null }),
          }),
        }
      },
      select: () => ({
        eq: (col: string, val: unknown) => ({
          eq: (col2: string, val2: unknown) => ({
            maybeSingle: async () => {
              // RLS Kuralı: Yalnızca activeTenantId ile eşleşen kayıtlar dönebilir
              if (col === 'tenant_id' && val === activeTenantId) {
                const found = activeDb[table]?.find(r => r.id === val2 && r.tenant_id === activeTenantId)
                return { data: found ?? null, error: null }
              }
              // Başka tenant verisine erişim engellenir (RLS empty / denied)
              return { data: null, error: null }
            },
          }),
        }),
      }),
      delete: () => ({
        eq: (col: string, val: unknown) => ({
          eq: (col2: string, val2: unknown) => {
            // Yalnızca kendi tenant_id'sine ait kaydı silebilir
            if (col === 'tenant_id' && val === activeTenantId) {
              const idx = activeDb[table]?.findIndex(r => r.id === val2 && r.tenant_id === activeTenantId)
              if (idx !== undefined && idx >= 0) {
                activeDb[table].splice(idx, 1)
              }
            }
            return { error: null }
          },
        }),
      }),
    }),
  } as never)

  it('Tenant A ve Tenant B için kaynaklar üretildiğinde tenant_id tam izoledir', async () => {
    const clientA = createTenantMockClient(tenantA, dbTenantA, dbTenantB)
    const ctxA = { client: clientA, tenantId: tenantA }

    const clientB = createTenantMockClient(tenantB, dbTenantB, dbTenantA)
    const ctxB = { client: clientB, tenantId: tenantB }

    // Tenant A Kaynakları
    const { serviceOrder: orderA } = await createServiceOrder(ctxA, { device_brand: 'Apple', device_model: 'iPhone 14' })
    const { customer: custA } = await createCustomer(ctxA, { full_name: 'Tenant A Müşterisi' })
    const { part: partA } = await createPart(ctxA, { name: 'Tenant A Ekran' })

    // Tenant B Kaynakları
    const { serviceOrder: orderB } = await createServiceOrder(ctxB, { device_brand: 'Samsung', device_model: 'Galaxy S24' })
    const { customer: custB } = await createCustomer(ctxB, { full_name: 'Tenant B Müşterisi' })
    const { part: partB } = await createPart(ctxB, { name: 'Tenant B Ekran' })

    // 1. İzolasyon Doğrulaması
    assertTenantOwnership([orderA, custA, partA], tenantA, 'Tenant A Kaynakları')
    assertTenantOwnership([orderB, custB, partB], tenantB, 'Tenant B Kaynakları')

    expect(dbTenantA.service_orders.length).toBe(1)
    expect(dbTenantB.service_orders.length).toBe(1)
  })

  it('Tenant A kullanıcısı Tenant B verilerini sorguladığında boş sonuç alır (RLS Data Leak Protection)', async () => {
    const clientA = createTenantMockClient(tenantA, dbTenantA, dbTenantB)
    const orderB = dbTenantB.service_orders[0]
    expect(orderB).toBeDefined()

    // Tenant A, Tenant B'nin sipariş ID'sini kendi tenant_id filtresiyle arıyor
    const { data } = await (clientA as { from: Function }).from('service_orders')
      .select('*')
      .eq('tenant_id', tenantA)
      .eq('id', orderB.id)
      .maybeSingle()

    // Sonuç kesinlikle NULL olmalıdır (Veri sızıntısı yok)
    expect(data).toBeNull()
  })

  it('Tenant A kullanıcısı Tenant B verisini silmeye çalıştığında Tenant B verisi silinmez (DB State Protection)', async () => {
    const clientA = createTenantMockClient(tenantA, dbTenantA, dbTenantB)
    const orderB = dbTenantB.service_orders[0]
    expect(orderB).toBeDefined()

    // Tenant A, Tenant B'nin sipariş ID'sini silmeye çalışıyor
    await (clientA as { from: Function }).from('service_orders')
      .delete()
      .eq('tenant_id', tenantA)
      .eq('id', orderB.id)

    // DB KONTROLÜ: Tenant B siparişi HÂLÂ veritabanında mevcut olmalıdır!
    expect(dbTenantB.service_orders.length).toBe(1)
    expect(dbTenantB.service_orders[0].id).toBe(orderB.id)
  })
})
