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

describe('API Test: /api/tenant/warranties & claims', () => {
  const validWarrantyId = '44444444-4444-4444-8444-444444444444'

  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
  })

  describe('POST /api/tenant/warranties (Garanti Belgesi Üretimi)', () => {
    it('oturum yoksa 401 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: false,
        status: 401,
        message: 'Oturum bulunamadı',
      })

      const { POST } = await import('@/app/api/tenant/warranties/route')
      const req = createMockNextRequest('http://localhost/api/tenant/warranties', {
        method: 'POST',
        body: { customer_id: 'c-1', device_brand: 'Apple', device_model: 'iPhone 13' },
      })
      const res = await POST(req)
      await assertUnauthorized(res)
    })

    it('müşteri veya cihaz bilgisi eksikse 400 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-tech',
        tenantId: 'tenant-1',
        role: 'teknisyen',
      })

      const { POST } = await import('@/app/api/tenant/warranties/route')
      const req = createMockNextRequest('http://localhost/api/tenant/warranties', {
        method: 'POST',
        body: { customer_id: '', device_brand: '' },
      })
      const res = await POST(req)
      await assertBadRequest(res, 'Müşteri ve cihaz zorunlu')
    })
  })

  describe('POST /api/tenant/warranties/[id]/claim (Garanti Talebi)', () => {
    it('sorun açıklaması eksikse 400 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-tech',
        tenantId: 'tenant-1',
        role: 'teknisyen',
      })

      const { POST } = await import('@/app/api/tenant/warranties/[id]/claim/route')
      const req = createMockNextRequest(`http://localhost/api/tenant/warranties/${validWarrantyId}/claim`, {
        method: 'POST',
        body: { issue_description: '' },
      })
      const res = await POST(req, { params: { id: validWarrantyId } })
      await assertBadRequest(res, 'Sorun açıklaması zorunludur')
    })

    it('garanti belgesi bulunamazsa 404 döner', async () => {
      const mockSupabase = {
        from: () => ({
          select: () => ({
            eq: () => ({
              eq: () => ({
                single: async () => ({ data: null, error: { message: 'Not found' } }),
                maybeSingle: async () => ({ data: null, error: null }),
              }),
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

      const { POST } = await import('@/app/api/tenant/warranties/[id]/claim/route')
      const req = createMockNextRequest(`http://localhost/api/tenant/warranties/${validWarrantyId}/claim`, {
        method: 'POST',
        body: { issue_description: 'Ekran dokunmatiği çalışmıyor' },
      })
      const res = await POST(req, { params: { id: validWarrantyId } })
      await assertStatus(res, 404)
    })
  })
})
