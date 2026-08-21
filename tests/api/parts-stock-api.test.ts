import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockNextRequest,
  assertStatus,
  assertBadRequest,
  assertUnauthorized,
} from './helpers/api-client'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'

vi.mock('@/lib/supabase/tenant-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase/tenant-auth')>('@/lib/supabase/tenant-auth')
  return {
    ...actual,
    requireTenantAuth: vi.fn(),
  }
})

describe('API Test: /api/tenant/parts (Yedek Parça & Envanter API)', () => {
  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
  })

  describe('GET /api/tenant/parts', () => {
    it('oturum yoksa 401 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: false,
        status: 401,
        message: 'Oturum bulunamadı',
      })

      const { GET } = await import('@/app/api/tenant/parts/route')
      const req = createMockNextRequest('http://localhost/api/tenant/parts')
      const res = await GET(req)
      await assertUnauthorized(res)
    })
  })

  describe('POST /api/tenant/parts (Parça Tanımlama)', () => {
    it('parça ismi (name) eksikse 400 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-tech',
        tenantId: 'tenant-1',
        role: 'teknisyen',
      })

      const { POST } = await import('@/app/api/tenant/parts/route')
      const req = createMockNextRequest('http://localhost/api/tenant/parts', {
        method: 'POST',
        body: { name: '', stock_qty: 10 },
      })
      const res = await POST(req)
      await assertBadRequest(res, 'name gerekli')
    })

    it('geçerli parça tanımlandığında 200 döner', async () => {
      const mockPart = {
        id: '11111111-1111-4111-8111-111111111111',
        name: 'iPhone 13 Batarya',
        stock_qty: 25,
        sale_price: 600,
        purchase_price: 300,
      }

      const mockSupabase = {
        from: () => ({
          upsert: () => ({
            select: () => ({
              single: async () => ({ data: mockPart, error: null }),
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

      const { POST } = await import('@/app/api/tenant/parts/route')
      const req = createMockNextRequest('http://localhost/api/tenant/parts', {
        method: 'POST',
        body: { name: 'iPhone 13 Batarya', stock_qty: 25, sale_price: 600, purchase_price: 300 },
      })
      const res = await POST(req)
      const body = await assertStatus(res, 200)
      expect(body.ok).toBe(true)
      expect((body.item as typeof mockPart).name).toBe('iPhone 13 Batarya')
    })
  })

  describe('PATCH /api/tenant/parts (Stok Güncelleme)', () => {
    it('parça ID eksik veya geçersizse 400 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-tech',
        tenantId: 'tenant-1',
        role: 'teknisyen',
      })

      const { PATCH } = await import('@/app/api/tenant/parts/route')
      const req = createMockNextRequest('http://localhost/api/tenant/parts', {
        method: 'PATCH',
        body: { id: 'invalid-id', delta: 5 },
      })
      const res = await PATCH(req)
      await assertBadRequest(res, 'Geçerli part id gerekli')
    })
  })
})
