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

    it('geçerli payload ile sipariş oluşturulduğunda 201 Created döner', async () => {
      const createdOrder = {
        id: 'order-new-1',
        order_no: 'SRV-2026-001',
        tenant_id: 'tenant-1',
        customer_id: 'cust-1',
        device_brand: 'Apple',
        device_model: 'iPhone 14 Pro',
        status: 'alindi',
      }

      const mockSupabase = {
        rpc: async () => ({ data: 'SRV-2026-001', error: null }),
        from: () => ({
          insert: () => ({
            select: () => ({
              single: async () => ({ data: createdOrder, error: null }),
            }),
          }),
        }),
      }

      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: mockSupabase as never,
        userId: 'user-tech',
        tenantId: 'tenant-1',
        role: 'teknisyen',
      })

      const { POST } = await import('@/app/api/service-orders/route')
      const req = createMockNextRequest('http://localhost/api/service-orders', {
        method: 'POST',
        body: {
          customer_id: 'cust-1',
          device_brand: 'Apple',
          device_model: 'iPhone 14 Pro',
          fault_description: 'Ekran kırık',
        },
      })
      const res = await POST(req)
      const body = await assertStatus(res, 201)
      expect((body.data as typeof createdOrder).order_no).toBe('SRV-2026-001')
      expect((body.data as typeof createdOrder).status).toBe('alindi')
    })
  })
})
