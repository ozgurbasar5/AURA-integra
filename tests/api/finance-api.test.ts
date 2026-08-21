import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockNextRequest,
  assertStatus,
  assertBadRequest,
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

describe('API Test: /api/tenant/transactions (Finans & Kasa API)', () => {
  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
    vi.mocked(getServiceClient).mockReset()
  })

  it('oturum yoksa 401 döner', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: false,
      status: 401,
      message: 'Oturum bulunamadı',
    })

    const { POST } = await import('@/app/api/tenant/transactions/route')
    const req = createMockNextRequest('http://localhost/api/tenant/transactions', {
      method: 'POST',
      body: { transaction: { type: 'gelir', amount: 1000, description: 'Servis Geliri' } },
    })
    const res = await POST(req)
    await assertUnauthorized(res)
  })

  it('finans yetkisi olmayan teknisyen rolü için 403 döner', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      userId: 'user-tech',
      tenantId: 'tenant-1',
      role: 'teknisyen',
    })

    const { POST } = await import('@/app/api/tenant/transactions/route')
    const req = createMockNextRequest('http://localhost/api/tenant/transactions', {
      method: 'POST',
      body: { transaction: { type: 'gelir', amount: 1000, description: 'Servis Geliri' } },
    })
    const res = await POST(req)
    await assertForbidden(res, 'Finans yazma yetkisi yok')
  })

  it('gerekli alanlar (type, amount, description) eksikse 400 döner', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      userId: 'user-acc',
      tenantId: 'tenant-1',
      role: 'muhasebe',
    })

    const { POST } = await import('@/app/api/tenant/transactions/route')
    const req = createMockNextRequest('http://localhost/api/tenant/transactions', {
      method: 'POST',
      body: { transaction: { type: '', amount: 0, description: '' } },
    })
    const res = await POST(req)
    await assertBadRequest(res, 'transaction.type, amount, description gerekli')
  })

  it('muhasebe rolü ile geçerli nakit işlem kaydedildiğinde 200 döner ve kasa bakiyesini günceller', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      userId: 'user-acc',
      tenantId: 'tenant-1',
      role: 'muhasebe',
    })

    const mockAdmin = {
      from: () => ({
        insert: () => ({
          select: () => ({
            single: async () => ({ data: { id: 'tx-new-123' }, error: null }),
          }),
        }),
      }),
      rpc: async () => ({ data: 12500, error: null }), // Güncel kasa bakiyesi: 12.500 TRY
    }

    vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

    const { POST } = await import('@/app/api/tenant/transactions/route')
    const req = createMockNextRequest('http://localhost/api/tenant/transactions', {
      method: 'POST',
      body: {
        transaction: {
          type: 'gelir',
          amount: 2500,
          description: 'Haftalık Servis Tahsilatı',
          payment_method: 'nakit',
          category: 'Servis',
        },
      },
    })
    const res = await POST(req)
    const body = await assertStatus(res, 200)
    expect(body.ok).toBe(true)
    expect(body.transaction_id).toBe('tx-new-123')
    expect(body.kasa_balance).toBe(12500)
  })
})
