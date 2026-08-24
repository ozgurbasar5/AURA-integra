import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockNextRequest,
  assertStatus,
  assertBadRequest,
  assertUnauthorized,
  assertForbidden,
} from './helpers/api-client'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'

vi.mock('@/lib/supabase/tenant-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase/tenant-auth')>('@/lib/supabase/tenant-auth')
  return {
    ...actual,
    requireTenantAuth: vi.fn(),
  }
})

describe('API Test: /api/service-orders', () => {
  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
  })

  describe('GET /api/service-orders', () => {
    it('oturum yoksa 401 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: false,
        status: 401,
        message: 'Oturum bulunamadı',
      })

      const { GET } = await import('@/app/api/service-orders/route')
      const req = createMockNextRequest('http://localhost/api/service-orders')
      const res = await GET(req)
      await assertUnauthorized(res)
    })

    it('başarılı sorguda sipariş listesi ve pagination metadata döner', async () => {
      const mockOrders = [
        { id: 'order-1', order_no: 'SRV-001', device_brand: 'Apple', device_model: 'iPhone 13', status: 'alindi' },
        { id: 'order-2', order_no: 'SRV-002', device_brand: 'Samsung', device_model: 'Galaxy S22', status: 'tamir' },
      ]

      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              order: () => ({
                range: async () => ({ data: mockOrders, error: null, count: 2 }),
              }),
            }),
            order: () => ({
              range: async () => ({ data: mockOrders, error: null, count: 2 }),
            }),
          }),
        }),
      }

      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: mockSupabase as never,
        userId: 'user-1',
        tenantId: 'tenant-1',
        role: 'teknisyen',
      })

      const { GET } = await import('@/app/api/service-orders/route')
      const req = createMockNextRequest('http://localhost/api/service-orders?limit=10&offset=0')
      const res = await GET(req)
      const body = await assertStatus(res, 200)

      expect(body.data).toHaveLength(2)
      expect(body.pagination).toBeDefined()
      expect((body.pagination as { total: number }).total).toBe(2)
    })
  })

  describe('POST /api/service-orders (Oluşturma & Validasyon)', () => {
    it('oturum yoksa 401 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: false,
        status: 401,
        message: 'Oturum bulunamadı',
      })

      const { POST } = await import('@/app/api/service-orders/route')
      const req = createMockNextRequest('http://localhost/api/service-orders', {
        method: 'POST',
        body: { device_brand: 'Apple', device_model: 'iPhone 13' },
      })
      const res = await POST(req)
      await assertUnauthorized(res)
    })

    it('viewer rolü oluşturmaya çalıştığında 403 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-viewer',
        tenantId: 'tenant-1',
        role: 'viewer',
      })

      const { POST } = await import('@/app/api/service-orders/route')
      const req = createMockNextRequest('http://localhost/api/service-orders', {
        method: 'POST',
        body: { device_brand: 'Apple', device_model: 'iPhone 13' },
      })
      const res = await POST(req)
      await assertForbidden(res)
    })

    it('cihaz marka veya modeli eksikse 400 Bad Request döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-tech',
        tenantId: 'tenant-1',
        role: 'teknisyen',
      })

      const { POST } = await import('@/app/api/service-orders/route')
      const req = createMockNextRequest('http://localhost/api/service-orders', {
        method: 'POST',
        body: {
          customer_id: 'cust-1',
          device_brand: '', // Boş marka!
          device_model: '',
        },
      })
      const res = await POST(req)
      await assertBadRequest(res, 'device_brand ve device_model zorunludur')
    })

    it('müşteri bilgisi (customer_id veya name+phone) yoksa 400 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-tech',
        tenantId: 'tenant-1',
        role: 'teknisyen',
      })

      const { POST } = await import('@/app/api/service-orders/route')
      const req = createMockNextRequest('http://localhost/api/service-orders', {
        method: 'POST',
        body: {
          device_brand: 'Apple',
          device_model: 'iPhone 14 Pro',
        },
      })
      const res = await POST(req)
      await assertBadRequest(res, 'customer_id veya customer_name')
    })

    it('geçersiz customer_id UUID formatı verildiğinde 400 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-tech',
        tenantId: 'tenant-1',
        role: 'teknisyen',
      })

      const { POST } = await import('@/app/api/service-orders/route')
      const req = createMockNextRequest('http://localhost/api/service-orders', {
        method: 'POST',
        body: {
          customer_id: 'gecersiz-uuid-123',
          device_brand: 'Apple',
          device_model: 'iPhone 14 Pro',
        },
      })
      const res = await POST(req)
      await assertBadRequest(res, 'Geçersiz customer_id UUID formatı')
    })

    it('geçersiz technician_id UUID formatı verildiğinde 400 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-tech',
        tenantId: 'tenant-1',
        role: 'teknisyen',
      })

      const { POST } = await import('@/app/api/service-orders/route')
      const req = createMockNextRequest('http://localhost/api/service-orders', {
        method: 'POST',
        body: {
          customer_name: 'Ahmet',
          customer_phone: '05551112233',
          device_brand: 'Apple',
          device_model: 'iPhone 14 Pro',
          technician_id: 'invalid-tech-id',
        },
      })
      const res = await POST(req)
      await assertBadRequest(res, 'Geçersiz technician_id UUID formatı')
    })

    it('geçersiz branch_id UUID formatı verildiğinde 400 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-tech',
        tenantId: 'tenant-1',
        role: 'teknisyen',
      })

      const { POST } = await import('@/app/api/service-orders/route')
      const req = createMockNextRequest('http://localhost/api/service-orders', {
        method: 'POST',
        body: {
          customer_name: 'Ahmet',
          customer_phone: '05551112233',
          device_brand: 'Apple',
          device_model: 'iPhone 14 Pro',
          branch_id: 'invalid-branch-id',
        },
      })
      const res = await POST(req)
      await assertBadRequest(res, 'Geçersiz branch_id UUID formatı')
    })

    it('technician_id: "" ve branch_id: "" boş string gönderildiğinde null olarak normalize edilip başarıyla kaydedilir', async () => {
      let insertedPayload: any = null
      const mockSupabase = {
        rpc: async () => ({ data: 'SRV-2026-002', error: null }),
        from: (table: string) => {
          if (table === 'customers') {
            return {
              select: () => ({
                eq: () => ({
                  or: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: { id: '550e8400-e29b-41d4-a716-446655440000' } }),
                    }),
                  }),
                }),
              }),
            }
          }
          if (table === 'service_orders') {
            return {
              insert: (p: any) => {
                insertedPayload = p
                return {
                  select: () => ({
                    single: async () => ({
                      data: {
                        id: '550e8400-e29b-41d4-a716-446655440001',
                        order_no: 'SRV-2026-002',
                        status: 'alindi',
                        technician_id: null,
                        branch_id: null,
                      },
                      error: null,
                    }),
                  }),
                }
              },
            }
          }
          return {
            insert: () => ({}),
          }
        },
      }

      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: mockSupabase as never,
        userId: '550e8400-e29b-41d4-a716-446655440099',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        role: 'teknisyen',
      })

      const { POST } = await import('@/app/api/service-orders/route')
      const req = createMockNextRequest('http://localhost/api/service-orders', {
        method: 'POST',
        body: {
          customer_name: 'Test Müşteri',
          customer_phone: '05551234567',
          device_brand: 'Samsung',
          device_model: 'S23',
          technician_id: '', // Empty string
          branch_id: '',     // Empty string
        },
      })
      const res = await POST(req)
      const body = await assertStatus(res, 201)
      expect(body.data).toBeDefined()
      expect(insertedPayload.technician_id).toBeNull()
      expect(insertedPayload.branch_id).toBeNull()
    })

    it('customer_id: "" boş string gönderildiğinde telefon üzerinden müşteri çözülüp kaydedilir', async () => {
      let insertedCustomer = false
      const mockSupabase = {
        rpc: async () => ({ data: 'SRV-2026-003', error: null }),
        from: (table: string) => {
          if (table === 'customers') {
            return {
              select: () => ({
                eq: () => ({
                  or: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: null }), // not found -> insert new
                    }),
                  }),
                }),
              }),
              insert: () => {
                insertedCustomer = true
                return {
                  select: () => ({
                    single: async () => ({ data: { id: '550e8400-e29b-41d4-a716-446655440005' }, error: null }),
                  }),
                }
              },
            }
          }
          if (table === 'service_orders') {
            return {
              insert: () => ({
                select: () => ({
                  single: async () => ({
                    data: {
                      id: '550e8400-e29b-41d4-a716-446655440003',
                      order_no: 'SRV-2026-003',
                      status: 'alindi',
                    },
                    error: null,
                  }),
                }),
              }),
            }
          }
          return {
            insert: () => ({}),
          }
        },
      }

      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: mockSupabase as never,
        userId: '550e8400-e29b-41d4-a716-446655440099',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        role: 'teknisyen',
      })

      const { POST } = await import('@/app/api/service-orders/route')
      const req = createMockNextRequest('http://localhost/api/service-orders', {
        method: 'POST',
        body: {
          customer_id: '',
          customer_name: 'Yeni Müşteri',
          customer_phone: '05321112233',
          device_brand: 'Xiaomi',
          device_model: 'Redmi Note 12',
        },
      })
      const res = await POST(req)
      await assertStatus(res, 201)
      expect(insertedCustomer).toBe(true)
    })

    it('Web Kabul payload (waiting_diagnosis, tahmini ücret, IMEI) ile sorunsuz kaydedilir', async () => {
      let finalStatus = ''
      const validCustomerId = '550e8400-e29b-41d4-a716-446655440010'
      const mockSupabase = {
        rpc: async () => ({ data: 'SRV-2026-WEB', error: null }),
        from: (table: string) => {
          if (table === 'customers') {
            return {
              select: () => ({
                eq: () => ({
                  or: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: { id: validCustomerId } }),
                    }),
                  }),
                }),
              }),
            }
          }
          if (table === 'service_orders') {
            return {
              insert: (p: any) => {
                finalStatus = p.status
                return {
                  select: () => ({
                    single: async () => ({
                      data: {
                        id: '550e8400-e29b-41d4-a716-446655440011',
                        order_no: 'SRV-2026-WEB',
                        status: p.status,
                      },
                      error: null,
                    }),
                  }),
                }
              },
            }
          }
          return {
            insert: () => ({}),
          }
        },
      }

      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: mockSupabase as never,
        userId: '550e8400-e29b-41d4-a716-446655440099',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        role: 'tenant_admin',
      })

      const { POST } = await import('@/app/api/service-orders/route')
      const webPayload = {
        customer_name: 'Web Müşteri',
        customer_phone: '05559876543',
        device_brand: 'Apple',
        device_model: 'iPhone 13',
        imei: '358912345678901',
        fault_description: 'Ekran kırık; Ön kontrol yapıldı',
        estimated_cost: 2500,
        status: 'waiting_diagnosis',
      }
      const req = createMockNextRequest('http://localhost/api/service-orders', {
        method: 'POST',
        body: webPayload,
      })
      const res = await POST(req)
      const body = await assertStatus(res, 201)
      expect(body.data).toBeDefined()
      expect(finalStatus).toBe('alindi') // waiting_diagnosis -> alindi (DB status)
    })

    it('Mobile Kabul payload (alindi, Standart model fallback) ile sorunsuz kaydedilir', async () => {
      let finalModel = ''
      let finalStatus = ''
      const validCustomerId = '550e8400-e29b-41d4-a716-446655440020'
      const mockSupabase = {
        rpc: async () => ({ data: 'SRV-2026-MOB', error: null }),
        from: (table: string) => {
          if (table === 'customers') {
            return {
              select: () => ({
                eq: () => ({
                  or: () => ({
                    limit: () => ({
                      maybeSingle: async () => ({ data: { id: validCustomerId } }),
                    }),
                  }),
                }),
              }),
            }
          }
          if (table === 'service_orders') {
            return {
              insert: (p: any) => {
                finalModel = p.device_model
                finalStatus = p.status
                return {
                  select: () => ({
                    single: async () => ({
                      data: {
                        id: '550e8400-e29b-41d4-a716-446655440021',
                        order_no: 'SRV-2026-MOB',
                        status: p.status,
                      },
                      error: null,
                    }),
                  }),
                }
              },
            }
          }
          return {
            insert: () => ({}),
          }
        },
      }

      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: mockSupabase as never,
        userId: '550e8400-e29b-41d4-a716-446655440099',
        tenantId: '550e8400-e29b-41d4-a716-446655440000',
        role: 'teknisyen',
      })

      const { POST } = await import('@/app/api/service-orders/route')
      const mobilePayload = {
        customer_name: 'Mobil Müşteri',
        customer_phone: '05441234567',
        device_brand: 'Samsung',
        device_model: 'Standart',
        fault_description: 'Servis Kabul',
        status: 'alindi',
        customer_id: '',
        technician_id: '',
      }
      const req = createMockNextRequest('http://localhost/api/service-orders', {
        method: 'POST',
        body: mobilePayload,
      })
      const res = await POST(req)
      const body = await assertStatus(res, 201)
      expect(body.data).toBeDefined()
      expect(finalModel).toBe('Standart')
      expect(finalStatus).toBe('alindi')
    })
  })
})
