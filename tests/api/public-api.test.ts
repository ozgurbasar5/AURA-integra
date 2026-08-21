import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockNextRequest,
  assertStatus,
  assertConflict,
} from './helpers/api-client'
import { getServiceClient } from '@/lib/supabase/service'

vi.mock('@/lib/supabase/service', () => ({
  getServiceClient: vi.fn(),
}))

vi.mock('@/lib/public-rate-limit', () => ({
  enforcePublicRateLimit: vi.fn().mockResolvedValue(null),
}))

describe('API Test: /api/public/approve/[token] (Müşteri Teklif Onay Portalı)', () => {
  const validToken = 'valid-token-abc-123'
  const expiredToken = 'expired-token-xyz-789'

  beforeEach(() => {
    vi.mocked(getServiceClient).mockReset()
  })

  describe('GET /api/public/approve/[token]', () => {
    it('geçersiz token için 404 döner', async () => {
      const mockAdmin = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: null, error: null }),
            }),
          }),
        }),
      }
      vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

      const { GET } = await import('@/app/api/public/approve/[token]/route')
      const req = createMockNextRequest('http://localhost/api/public/approve/non-existent')
      const res = await GET(req, { params: { token: 'non-existent' } })
      await assertStatus(res, 404)
    })

    it('süresi dolmuş link için 410 Gone döner', async () => {
      const expiredDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
      const mockAdmin = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'order-1', approval_expires_at: expiredDate },
                error: null,
              }),
            }),
          }),
        }),
      }
      vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

      const { GET } = await import('@/app/api/public/approve/[token]/route')
      const req = createMockNextRequest(`http://localhost/api/public/approve/${expiredToken}`)
      const res = await GET(req, { params: { token: expiredToken } })
      await assertStatus(res, 410)
    })
  })

  describe('PATCH /api/public/approve/[token]', () => {
    it('müşteri onayladığında (approved: true) durum onaylandi olur ve 200 döner', async () => {
      const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const mockAdmin = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'order-1', approval_status: 'pending', approval_expires_at: futureDate },
                error: null,
              }),
            }),
          }),
          update: (fields: Record<string, unknown>) => ({
            eq: () => ({
              or: () => ({
                select: () => ({
                  maybeSingle: async () => ({
                    data: { id: 'order-1', ...fields },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
          insert: async () => ({ data: {}, error: null }),
        }),
      }
      vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

      const { PATCH } = await import('@/app/api/public/approve/[token]/route')
      const req = createMockNextRequest(`http://localhost/api/public/approve/${validToken}`, {
        method: 'PATCH',
        body: { approved: true },
      })
      const res = await PATCH(req, { params: { token: validToken } })
      const body = await assertStatus(res, 200)
      expect(body.ok).toBe(true)
      expect(body.approved).toBe(true)
    })

    it('zaten yanıtlanmış bir teklife mükerrer istek geldiğinde 409 Conflict döner', async () => {
      const mockAdmin = {
        from: () => ({
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: 'order-1', approval_status: 'approved' }, // Zaten onaylanmış!
                error: null,
              }),
            }),
          }),
        }),
      }
      vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

      const { PATCH } = await import('@/app/api/public/approve/[token]/route')
      const req = createMockNextRequest(`http://localhost/api/public/approve/${validToken}`, {
        method: 'PATCH',
        body: { approved: true },
      })
      const res = await PATCH(req, { params: { token: validToken } })
      await assertConflict(res, 'Zaten yanıtlandı')
    })
  })
})
