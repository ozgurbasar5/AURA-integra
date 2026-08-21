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

describe('API Test: /api/service-orders/[id]/deliver (Kasa 2.0 Service Delivery Finance)', () => {
  const validOrderId = '55555555-5555-4555-8555-555555555555'
  const validAccountId = '66666666-6666-4666-8666-666666666666'

  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
    vi.mocked(getServiceClient).mockReset()
  })

  it('1. Oturum yoksa 401 döner', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: false,
      status: 401,
      message: 'Oturum bulunamadı',
    })

    const { POST } = await import('@/app/api/service-orders/[id]/deliver/route')
    const req = createMockNextRequest(`http://localhost/api/service-orders/${validOrderId}/deliver`, {
      method: 'POST',
      body: { service_fee: 2000, payment_method: 'nakit' },
    })
    const res = await POST(req, { params: { id: validOrderId } })
    await assertUnauthorized(res)
  })

  it('2. Yetkisiz teknisyen rolü için 403 döner', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      userId: 'user-tech',
      tenantId: 'tenant-1',
      role: 'teknisyen',
    })

    const { POST } = await import('@/app/api/service-orders/[id]/deliver/route')
    const req = createMockNextRequest(`http://localhost/api/service-orders/${validOrderId}/deliver`, {
      method: 'POST',
      body: { service_fee: 2000, payment_method: 'nakit' },
    })
    const res = await POST(req, { params: { id: validOrderId } })
    await assertForbidden(res, 'Teslim / finans yetkisi yok')
  })

  it('3. Açık vardiya olmadan servis teslimi yapılır, hesap bakiyesi artar ve garanti üretilir', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      userId: 'user-srv',
      tenantId: 'tenant-1',
      role: 'muhasebe',
    })

    const mockAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: validOrderId, status: 'hazir', metadata: {} },
                error: null,
              }),
              single: async () => ({
                data: { id: validOrderId, status: 'teslim' },
                error: null,
              }),
            }),
          }),
        }),
      }),
      rpc: async () => ({
        data: {
          ok: true,
          finance_tx_id: 'tx-srv-789',
          account_id: validAccountId,
          account_balance: 14500,
          service_fee: 2000,
          total_expense: 400,
          net_profit: 1600,
          profit_margin: 80,
          warranty_id: 'war-srv-789',
          delivered_at: new Date().toISOString(),
          cash_shift_id: null, // Vardiya yok!
        },
        error: null,
      }),
    }

    vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

    const { POST } = await import('@/app/api/service-orders/[id]/deliver/route')
    const req = createMockNextRequest(`http://localhost/api/service-orders/${validOrderId}/deliver`, {
      method: 'POST',
      body: {
        service_fee: 2000,
        payment_method: 'nakit',
        warranty_months: 12,
      },
    })
    const res = await POST(req, { params: { id: validOrderId } })
    const body = await assertStatus(res, 200)

    expect(body.ok).toBe(true)
    expect(body.finance_tx_id).toBe('tx-srv-789')
    expect(body.account_id).toBe(validAccountId)
    expect(body.account_balance).toBe(14500)
    expect(body.warranty_id).toBe('war-srv-789')
    expect(body.cash_shift_id).toBeNull() // Vardiya bağımsızlığı teyit edildi
  })

  it('4. Banka havalesi ile servis teslimi: Banka hesabı güncellenir', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      userId: 'user-srv',
      tenantId: 'tenant-1',
      role: 'muhasebe',
    })

    const bankAccountId = '77777777-7777-4777-8777-777777777777'

    const mockAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: validOrderId, status: 'hazir', metadata: {} },
                error: null,
              }),
              single: async () => ({
                data: { id: validOrderId, status: 'teslim' },
                error: null,
              }),
            }),
          }),
        }),
      }),
      rpc: async () => ({
        data: {
          ok: true,
          finance_tx_id: 'tx-srv-bank',
          account_id: bankAccountId,
          account_balance: 65000,
          service_fee: 5000,
          total_expense: 1000,
          net_profit: 4000,
          profit_margin: 80,
          warranty_id: 'war-srv-bank',
          delivered_at: new Date().toISOString(),
          cash_shift_id: null,
        },
        error: null,
      }),
    }

    vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

    const { POST } = await import('@/app/api/service-orders/[id]/deliver/route')
    const req = createMockNextRequest(`http://localhost/api/service-orders/${validOrderId}/deliver`, {
      method: 'POST',
      body: {
        service_fee: 5000,
        payment_method: 'havale',
        account_id: bankAccountId,
      },
    })
    const res = await POST(req, { params: { id: validOrderId } })
    const body = await assertStatus(res, 200)

    expect(body.ok).toBe(true)
    expect(body.account_id).toBe(bankAccountId)
    expect(body.account_balance).toBe(65000)
  })
})
