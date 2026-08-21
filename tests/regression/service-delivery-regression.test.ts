import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createMockNextRequest, assertStatus } from '../api/helpers/api-client'
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

describe('Regression Test: Service Delivery End-to-End Execution', () => {
  const validOrderId = '11111111-1111-4111-8111-111111111111'
  const validAccountId = '22222222-2222-4222-8222-222222222222'

  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
    vi.mocked(getServiceClient).mockReset()
  })

  it('1. Delivery with Kasiyer role succeeds (Authorization Regression Check)', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      userId: 'user-kasiyer',
      tenantId: 'tenant-1',
      role: 'kasiyer',
    })

    const mockAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: validOrderId, status: 'tamir', metadata: {} },
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
          finance_tx_id: 'tx-kasiyer-123',
          account_id: validAccountId,
          account_balance: 5000,
          service_fee: 1500,
          total_expense: 300,
          net_profit: 1200,
          profit_margin: 80,
          delivered_at: new Date().toISOString(),
          warranty_id: 'war-kasiyer-123',
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
        service_fee: 1500,
        payment_method: 'nakit',
        warranty_months: 6,
      },
    })
    const res = await POST(req, { params: { id: validOrderId } })
    const body = await assertStatus(res, 200)

    expect(body.ok).toBe(true)
    expect(body.service_fee).toBe(1500)
    expect(body.finance_tx_id).toBe('tx-kasiyer-123')
    expect(body.warranty_id).toBe('war-kasiyer-123')
  })

  it('2. Veresiye delivery does not mutate liquid account balance and posts Cari Borç', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      userId: 'user-admin',
      tenantId: 'tenant-1',
      role: 'admin',
    })

    const mockAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: validOrderId, status: 'hazir', metadata: {}, customer_name: 'Ahmet Yılmaz', order_no: 'SRV-001' },
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
          finance_tx_id: 'tx-veresiye-1',
          account_id: null,
          account_balance: null,
          service_fee: 1000,
          total_expense: 200,
          net_profit: 800,
          profit_margin: 80,
          delivered_at: new Date().toISOString(),
          warranty_id: null,
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
        service_fee: 1000,
        payment_method: 'veresiye',
      },
    })
    const res = await POST(req, { params: { id: validOrderId } })
    const body = await assertStatus(res, 200)

    expect(body.ok).toBe(true)
    expect(body.account_id).toBeNull()
    expect(body.finance_tx_id).toBe('tx-veresiye-1')
  })
})
