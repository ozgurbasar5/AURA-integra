import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockNextRequest,
  assertStatus,
  assertBadRequest,
  assertConflict,
  assertUnauthorized,
  assertForbidden,
} from './helpers/api-client'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'

vi.mock('@/lib/supabase/tenant-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase/tenant-auth')>('@/lib/supabase/tenant-auth')
  return {
    ...actual,
    requireTenantAuth: vi.fn(),
  }
})

vi.mock('@/lib/supabase/service', () => ({
  getServiceClient: vi.fn(),
}))

describe('API Test: /api/service-orders/[id]/use-parts & restore-parts', () => {
  const validOrderId = '11111111-1111-4111-8111-111111111111'
  const validPartId = '22222222-2222-4222-8222-222222222222'

  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
    vi.mocked(getServiceClient).mockReset()
  })

  describe('POST /api/service-orders/[id]/use-parts', () => {
    it('oturum yoksa 401 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: false,
        status: 401,
        message: 'Oturum bulunamadı',
      })

      const { POST } = await import('@/app/api/service-orders/[id]/use-parts/route')
      const req = createMockNextRequest(`http://localhost/api/service-orders/${validOrderId}/use-parts`, {
        method: 'POST',
        body: { parts: [{ stock_id: validPartId, qty: 1 }] },
      })
      const res = await POST(req, { params: { id: validOrderId } })
      await assertUnauthorized(res)
    })

    it('viewer rolü için 403 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-viewer',
        tenantId: 'tenant-1',
        role: 'viewer',
      })

      const { POST } = await import('@/app/api/service-orders/[id]/use-parts/route')
      const req = createMockNextRequest(`http://localhost/api/service-orders/${validOrderId}/use-parts`, {
        method: 'POST',
        body: { parts: [{ stock_id: validPartId, qty: 1 }] },
      })
      const res = await POST(req, { params: { id: validOrderId } })
      await assertForbidden(res)
    })

    it('geçersiz sipariş id verildiğinde 400 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-tech',
        tenantId: 'tenant-1',
        role: 'teknisyen',
      })

      const { POST } = await import('@/app/api/service-orders/[id]/use-parts/route')
      const req = createMockNextRequest('http://localhost/api/service-orders/invalid-uuid/use-parts', {
        method: 'POST',
        body: { parts: [{ stock_id: validPartId, qty: 1 }] },
      })
      const res = await POST(req, { params: { id: 'invalid-uuid' } })
      await assertBadRequest(res, 'Geçersiz sipariş id')
    })

    it('teslim edilmiş iş emrine (status: teslim) parça eklenmeye çalışıldığında 409 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-tech',
        tenantId: 'tenant-1',
        role: 'teknisyen',
      })

      const mockAdmin = {
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  if (table === 'service_orders') {
                    return { data: { id: validOrderId, status: 'teslim', order_no: 'SRV-001' }, error: null }
                  }
                  return { data: null, error: null }
                },
              }),
            }),
          }),
        }),
      }

      vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

      const { POST } = await import('@/app/api/service-orders/[id]/use-parts/route')
      const req = createMockNextRequest(`http://localhost/api/service-orders/${validOrderId}/use-parts`, {
        method: 'POST',
        body: { parts: [{ stock_id: validPartId, qty: 1 }] },
      })
      const res = await POST(req, { params: { id: validOrderId } })
      await assertConflict(res, 'Teslim edilmiş işe parça eklenemez')
    })

    it('stok miktarı yetersiz olduğunda 409 Conflict döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-tech',
        tenantId: 'tenant-1',
        role: 'teknisyen',
      })

      const mockAdmin = {
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  if (table === 'service_orders') {
                    return { data: { id: validOrderId, status: 'tamirde', order_no: 'SRV-001', metadata: {} }, error: null }
                  }
                  if (table === 'parts') {
                    return { data: { id: validPartId, name: 'Ekran', stock_qty: 0 }, error: null } // 0 stok!
                  }
                  return { data: null, error: null }
                },
              }),
            }),
          }),
        }),
      }

      vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

      const { POST } = await import('@/app/api/service-orders/[id]/use-parts/route')
      const req = createMockNextRequest(`http://localhost/api/service-orders/${validOrderId}/use-parts`, {
        method: 'POST',
        body: { parts: [{ stock_id: validPartId, qty: 1 }] },
      })
      const res = await POST(req, { params: { id: validOrderId } })
      await assertConflict(res, 'Yetersiz stok')
    })

    it('yeterli stok varsa parçayı düşer ve 200 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-tech',
        tenantId: 'tenant-1',
        role: 'teknisyen',
      })

      const mockAdmin = {
        from: (table: string) => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => {
                  if (table === 'service_orders') {
                    return { data: { id: validOrderId, status: 'tamirde', order_no: 'SRV-001', metadata: {} }, error: null }
                  }
                  if (table === 'parts') {
                    return { data: { id: validPartId, name: 'Ekran', stock_qty: 10, sale_price: 1000 }, error: null }
                  }
                  return { data: null, error: null }
                },
              }),
            }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({
                select: () => ({
                  single: async () => ({ data: { id: validPartId, stock_qty: 9 }, error: null }),
                }),
              }),
            }),
          }),
          insert: async () => ({ data: {}, error: null }),
        }),
      }

      vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

      const { POST } = await import('@/app/api/service-orders/[id]/use-parts/route')
      const req = createMockNextRequest(`http://localhost/api/service-orders/${validOrderId}/use-parts`, {
        method: 'POST',
        body: { parts: [{ stock_id: validPartId, qty: 1 }] },
      })
      const res = await POST(req, { params: { id: validOrderId } })
      const body = await assertStatus(res, 200)
      expect(body.ok).toBe(true)
      expect(body.parts).toHaveLength(1)
    })
  })

  describe('POST /api/service-orders/[id]/restore-parts (Parça İadesi)', () => {
    it('teslim edilmiş iş emrinde parça iadesi engellenir (409 Conflict)', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-tech',
        tenantId: 'tenant-1',
        role: 'teknisyen',
      })

      const mockAdmin = {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({
                  data: { id: validOrderId, status: 'teslim', order_no: 'SRV-001' },
                  error: null,
                }),
              }),
            }),
          }),
        }),
      }

      vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

      const { POST } = await import('@/app/api/service-orders/[id]/restore-parts/route')
      const req = createMockNextRequest(`http://localhost/api/service-orders/${validOrderId}/restore-parts`, {
        method: 'POST',
        body: { stock_id: validPartId, qty: 1 },
      })
      const res = await POST(req, { params: { id: validOrderId } })
      await assertConflict(res, 'Teslim edilmiş işte parça iade edilemez')
    })
  })
})
