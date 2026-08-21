import { describe, it, expect } from 'vitest'
import {
  computeTenantAdminKpis,
  collectAdminAlerts,
  performUniversalSearch,
} from '@/lib/admin-center'

describe('Admin 2.0 Control Center Engine', () => {
  it('computes tenant admin KPIs correctly', async () => {
    const mockSupabase: any = {
      from: (table: string) => {
        const queryObj: any = {
          select: (_fields: string, opts?: any) => {
            queryObj._count = opts?.count === 'exact'
            return queryObj
          },
          eq: () => queryObj,
          then: (resolve: any) => {
            if (queryObj._count) {
              return resolve({ count: 4, data: null })
            }
            if (table === 'service_orders') {
              return resolve({
                data: [
                  { id: '1', status: 'pending', delivered_at: null },
                  { id: '2', status: 'repairing', delivered_at: null },
                  { id: '3', status: 'delivered', delivered_at: new Date().toISOString() },
                ],
              })
            }
            if (table === 'accounts') {
              return resolve({
                data: [
                  { balance: 5000, is_active: true },
                  { balance: 2500, is_active: true },
                  { balance: 1000, is_active: false },
                ],
              })
            }
            if (table === 'parts') {
              return resolve({
                data: [
                  { id: 'p1', stock_quantity: 1, min_stock_threshold: 3 },
                  { id: 'p2', stock_quantity: 10, min_stock_threshold: 3 },
                ],
              })
            }
            return resolve({ data: [] })
          },
        }
        return queryObj
      },
    }

    const kpis = await computeTenantAdminKpis(mockSupabase, 'tenant-uuid-1')

    expect(kpis.servicesActive).toBe(2)
    expect(kpis.servicesDeliveredToday).toBe(1)
    expect(kpis.totalAccountsBalance).toBe(7500) // only active accounts
    expect(kpis.criticalStockCount).toBe(1) // p1 has 1 <= 3
    expect(kpis.quotesPending).toBe(4)
  })

  it('collects alerts for low stock and pending quotes', async () => {
    const mockSupabase: any = {
      from: (table: string) => {
        const queryObj: any = {
          select: (_fields: string, opts?: any) => {
            queryObj._count = opts?.count === 'exact'
            return queryObj
          },
          eq: () => queryObj,
          lte: () => queryObj,
          limit: () => {
            if (table === 'parts') {
              return Promise.resolve({
                data: [{ id: 'p1', name: 'iPhone 13 Ekran', stock_quantity: 1 }],
              })
            }
            return Promise.resolve({ data: [] })
          },
          then: (resolve: any) => {
            if (table === 'service_orders') {
              return resolve({ count: 3, data: null })
            }
            if (table === 'warranties') {
              return resolve({ count: 2, data: null })
            }
            return resolve({ count: 0, data: [] })
          },
        }
        return queryObj
      },
    }

    const alerts = await collectAdminAlerts(mockSupabase, 'tenant-uuid-1')
    expect(alerts.length).toBe(3)
    expect(alerts.some(a => a.id === 'low-stock')).toBe(true)
    expect(alerts.some(a => a.id === 'pending-quotes')).toBe(true)
    expect(alerts.some(a => a.id === 'warranty-active')).toBe(true)
  })

  it('performs universal search across multiple entities', async () => {
    const mockSupabase: any = {
      from: (table: string) => ({
        select: () => ({
          eq: () => ({
            or: () => ({
              limit: () => {
                if (table === 'service_orders') {
                  return Promise.resolve({
                    data: [
                      {
                        id: 'srv-1',
                        order_no: 'SRV-1001',
                        customer_name: 'Ahmet Yılmaz',
                        device_model: 'iPhone 13',
                        status: 'repairing',
                      },
                    ],
                  })
                }
                if (table === 'parts') {
                  return Promise.resolve({
                    data: [
                      {
                        id: 'prt-1',
                        name: 'iPhone 13 Batarya',
                        part_code: 'BAT-13',
                        stock_quantity: 12,
                        sale_price: 950,
                      },
                    ],
                  })
                }
                if (table === 'customers') {
                  return Promise.resolve({
                    data: [
                      {
                        id: 'cst-1',
                        name: 'Ahmet Yılmaz',
                        phone: '05551112233',
                        city: 'İstanbul',
                      },
                    ],
                  })
                }
                return Promise.resolve({ data: [] })
              },
            }),
          }),
        }),
      }),
    }

    const results = await performUniversalSearch(mockSupabase, 'tenant-uuid-1', 'iPhone')
    expect(results.length).toBe(3)
    expect(results.find(r => r.type === 'service')?.title).toContain('SRV-1001')
    expect(results.find(r => r.type === 'part')?.title).toBe('iPhone 13 Batarya')
  })
})
