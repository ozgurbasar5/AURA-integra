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

describe('Regression Test: Finance and Account Ledger Updates during Delivery', () => {
  const validOrderId = '33333333-3333-4333-8333-333333333333'
  const validAccountId = '44444444-4444-4444-8444-444444444444'

  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
    vi.mocked(getServiceClient).mockReset()
  })

  it('1. Cash payment updates Nakit account and generates ledger entry', async () => {
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
                data: { id: validOrderId, status: 'kalite_kontrol', metadata: {} },
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
          finance_tx_id: 'tx-cash-456',
          account_id: validAccountId,
          account_balance: 12500,
          service_fee: 2500,
          total_expense: 500,
          net_profit: 2000,
          profit_margin: 80,
          delivered_at: new Date().toISOString(),
          warranty_id: 'war-cash-456',
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
        service_fee: 2500,
        payment_method: 'nakit',
        account_id: validAccountId,
      },
    })
    const res = await POST(req, { params: { id: validOrderId } })
    const body = await assertStatus(res, 200)

    expect(body.ok).toBe(true)
    expect(body.finance_tx_id).toBe('tx-cash-456')
    expect(body.account_id).toBe(validAccountId)
    expect(body.account_balance).toBe(12500)
  })

  it('2. Credit card / POS payment updates POS account and ledger entry', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      userId: 'user-admin',
      tenantId: 'tenant-1',
      role: 'admin',
    })

    const posAccountId = '55555555-5555-4555-8555-555555555555'

    const mockAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: validOrderId, status: 'kalite_kontrol', metadata: {} },
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
          finance_tx_id: 'tx-pos-789',
          account_id: posAccountId,
          account_balance: 32000,
          service_fee: 3000,
          total_expense: 400,
          net_profit: 2600,
          profit_margin: 86,
          delivered_at: new Date().toISOString(),
          warranty_id: 'war-pos-789',
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
        service_fee: 3000,
        payment_method: 'kredi_karti',
        account_id: posAccountId,
      },
    })
    const res = await POST(req, { params: { id: validOrderId } })
    const body = await assertStatus(res, 200)

    expect(body.ok).toBe(true)
    expect(body.account_id).toBe(posAccountId)
    expect(body.account_balance).toBe(32000)
  })

  it('3. Direct TS fallback posts income transaction and updates service_orders when RPC is missing', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      userId: 'user-admin',
      tenantId: 'tenant-1',
      role: 'admin',
    })

    const fallbackAccountId = '88888888-8888-4888-8888-888888888888'

    const mockAdmin = {
      from: (table: string) => {
        if (table === 'accounts') {
          return {
            select: () => ({
              eq: async () => ({
                data: [
                  { id: fallbackAccountId, tenant_id: 'tenant-1', name: 'Nakit Kasa', type: 'kasa', balance: 5000, is_default: true, is_active: true }
                ],
                error: null,
              }),
            }),
          }
        }
        if (table === 'service_orders') {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({
                    data: {
                      id: validOrderId,
                      status: 'kalite_kontrol',
                      metadata: {},
                      customer_name: 'Test Müşteri',
                      order_no: 'SRV-888',
                      imei: '358999000111222',
                      device_brand: 'Apple',
                      device_model: 'iPhone 13',
                    },
                    error: null,
                  }),
                  single: async () => ({
                    data: { id: validOrderId, status: 'teslim' },
                    error: null,
                  }),
                }),
              }),
            }),
            update: () => ({
              eq: () => ({
                eq: async () => ({ data: null, error: null }),
              }),
            }),
          }
        }
        if (table === 'financial_transactions') {
          return {
            insert: async () => ({ data: null, error: null }),
          }
        }
        if (table === 'warranties') {
          return {
            insert: async () => ({ data: null, error: null }),
          }
        }
        return {
          select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
        }
      },
      rpc: async (fn: string) => {
        if (fn === 'complete_service_delivery') {
          return { data: null, error: { message: 'function complete_service_delivery does not exist', code: 'PGRST202' } }
        }
        if (fn === 'adjust_account_balance') {
          return { data: 6500, error: null }
        }
        return { data: null, error: null }
      },
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
    expect(body.account_id).toBe(fallbackAccountId)
    expect(body.account_balance).toBe(6500)
    expect(body.warranty_id).toBeDefined()
  })
})
