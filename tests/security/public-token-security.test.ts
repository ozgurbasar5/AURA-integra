import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockNextRequest,
  assertStatus,
  assertConflict,
} from '../api/helpers/api-client'
import { getServiceClient } from '@/lib/supabase/service'

vi.mock('@/lib/supabase/service', () => ({
  getServiceClient: vi.fn(),
}))

vi.mock('@/lib/public-rate-limit', () => ({
  enforcePublicRateLimit: vi.fn().mockResolvedValue(null),
}))

describe('Security: Public Token & PII Data Exposure Defense', () => {
  beforeEach(() => {
    vi.mocked(getServiceClient).mockReset()
  })

  it('1. Rastgele / Sahte Token ile sorgulama yapıldığında 404 döner (Brute Force / Enumeration Defense)', async () => {
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
    const req = createMockNextRequest('http://localhost/api/public/approve/random-forged-token')
    const res = await GET(req, { params: { token: 'random-forged-token' } })
    await assertStatus(res, 404)
  })

  it('2. Public Token GET endpointi hassas iç verileri (internal purchase cost, profit, technician id) sızdırmaz', async () => {
    const mockOrder = {
      id: 'order-123',
      order_no: 'SRV-001',
      device_brand: 'Apple',
      device_model: 'iPhone 13',
      status: 'teklif_bekliyor',
      estimated_cost: 1500,
      approval_amount: 1500,
      approval_desc: 'Ekran ve batarya değişimi',
      customers: {
        full_name: 'Ahmet Yılmaz',
        phone: '05551234567',
      },
    }

    const mockAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: mockOrder, error: null }),
          }),
        }),
      }),
    }
    vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

    const { GET } = await import('@/app/api/public/approve/[token]/route')
    const req = createMockNextRequest('http://localhost/api/public/approve/valid-safe-token')
    const res = await GET(req, { params: { token: 'valid-safe-token' } })
    const body = await assertStatus(res, 200)

    const data = body.data as Record<string, unknown>
    // Görüntülenmesi gerekenler:
    expect(data.device_brand).toBe('Apple')
    expect(data.approval_amount).toBe(1500)

    // SIZDIRILMAMASI GEREKENLER:
    expect(data.purchase_cost).toBeUndefined()
    expect(data.net_profit).toBeUndefined()
    expect(data.technician_commission).toBeUndefined()
    expect(data.supplier_id).toBeUndefined()
  })

  it('3. Token Replay Attack: Zaten onaylanmış token ile tekrar onay gönderildiğinde 409 Conflict ile reddedilir', async () => {
    const mockAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { id: 'order-123', approval_status: 'approved' }, // Zaten onaylanmış
              error: null,
            }),
          }),
        }),
      }),
    }
    vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

    const { PATCH } = await import('@/app/api/public/approve/[token]/route')
    const req = createMockNextRequest('http://localhost/api/public/approve/valid-safe-token', {
      method: 'PATCH',
      body: { approved: true },
    })
    const res = await PATCH(req, { params: { token: 'valid-safe-token' } })
    await assertConflict(res, 'Zaten yanıtlandı')
  })
})
