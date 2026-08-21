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

describe('API Test: /api/tenant/customers', () => {
  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
  })

  describe('GET /api/tenant/customers', () => {
    it('oturum yoksa 401 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: false,
        status: 401,
        message: 'Oturum bulunamadı',
      })

      const { GET } = await import('@/app/api/tenant/customers/route')
      const res = await GET()
      await assertUnauthorized(res)
    })

    it('müşteri listesini döner', async () => {
      const mockCustomers = [
        { id: 'c-1', full_name: 'Ahmet Yılmaz', phone: '05551234567', total_spent: 1500 },
        { id: 'c-2', full_name: 'Ayşe Demir', phone: '05329876543', total_spent: 3200 },
      ]

      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: mockCustomers, error: null, count: 2 }),
                range: async () => ({ data: mockCustomers, error: null, count: 2 }),
              }),
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

      const { GET } = await import('@/app/api/tenant/customers/route')
      const res = await GET()
      const body = await assertStatus(res, 200)
      expect(body.items).toHaveLength(2)
    })
  })

  describe('POST /api/tenant/customers', () => {
    it('viewer rolü müşteri ekleyemez (403 Forbidden)', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-viewer',
        tenantId: 'tenant-1',
        role: 'viewer',
      })

      const { POST } = await import('@/app/api/tenant/customers/route')
      const req = createMockNextRequest('http://localhost/api/tenant/customers', {
        method: 'POST',
        body: { name: 'Mehmet Kaya', phone: '05441112233' },
      })
      const res = await POST(req)
      await assertForbidden(res)
    })

    it('isim veya telefon boşsa 400 Bad Request döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-admin',
        tenantId: 'tenant-1',
        role: 'tenant_admin',
      })

      const { POST } = await import('@/app/api/tenant/customers/route')
      const req = createMockNextRequest('http://localhost/api/tenant/customers', {
        method: 'POST',
        body: { name: '', phone: '' },
      })
      const res = await POST(req)
      await assertBadRequest(res, 'Ad ve telefon zorunlu')
    })
  })
})
