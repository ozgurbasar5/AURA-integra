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

describe('API Test: /api/service-orders/[id]/deliver', () => {
  const validOrderId = '33333333-3333-4333-8333-333333333333'

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

    const { POST } = await import('@/app/api/service-orders/[id]/deliver/route')
    const req = createMockNextRequest(`http://localhost/api/service-orders/${validOrderId}/deliver`, {
      method: 'POST',
      body: { service_fee: 1500, payment_method: 'nakit' },
    })
    const res = await POST(req, { params: { id: validOrderId } })
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

    const { POST } = await import('@/app/api/service-orders/[id]/deliver/route')
    const req = createMockNextRequest(`http://localhost/api/service-orders/${validOrderId}/deliver`, {
      method: 'POST',
      body: { service_fee: 1500, payment_method: 'nakit' },
    })
    const res = await POST(req, { params: { id: validOrderId } })
    await assertForbidden(res)
  })

  it('servis ücreti (service_fee) verilmezse veya 0/negatif ise 400 döner', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      userId: 'user-admin',
      tenantId: 'tenant-1',
      role: 'tenant_admin',
    })

    const { POST } = await import('@/app/api/service-orders/[id]/deliver/route')
    const req = createMockNextRequest(`http://localhost/api/service-orders/${validOrderId}/deliver`, {
      method: 'POST',
      body: { service_fee: 0 }, // 0 ücret!
    })
    const res = await POST(req, { params: { id: validOrderId } })
    await assertBadRequest(res, 'service_fee gerekli')
  })

  it('zaten teslim edilmiş iş emri için mükerrer teslimatta 409 Conflict döner', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      userId: 'user-admin',
      tenantId: 'tenant-1',
      role: 'tenant_admin',
    })

    const mockAdmin = {
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: { id: validOrderId, status: 'teslim', metadata: {} },
                error: null,
              }),
            }),
          }),
        }),
      }),
    }

    vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

    const { POST } = await import('@/app/api/service-orders/[id]/deliver/route')
    const req = createMockNextRequest(`http://localhost/api/service-orders/${validOrderId}/deliver`, {
      method: 'POST',
      body: { service_fee: 1500, payment_method: 'nakit' },
    })
    const res = await POST(req, { params: { id: validOrderId } })
    await assertConflict(res, 'Bu iş zaten teslim edilmiş')
  })

  it('yetkili muhasebe rolü ile teslim edildiğinde 200 döner ve finans & garanti üretir', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      userId: 'user-accountant',
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
          finance_tx_id: 'tx-123',
          total_expense: 500,
          net_profit: 1000,
          profit_margin: 66.7,
          kasa_balance: 8500,
          warranty_id: 'war-123',
          delivered_at: new Date().toISOString(),
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
    expect(body.finance_tx_id).toBe('tx-123')
    expect(body.warranty_id).toBe('war-123')
    expect(body.service_fee).toBe(1500)
  })
})
