import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockNextRequest,
  assertStatus,
} from '../api/helpers/api-client'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'

vi.mock('@/lib/supabase/tenant-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase/tenant-auth')>('@/lib/supabase/tenant-auth')
  return {
    ...actual,
    requireTenantAuth: vi.fn(),
  }
})

describe('Security: Mass Assignment & Privileged Field Protection', () => {
  const authenticTenantId = 'tenant-real-123'
  const authenticUserId = 'user-tech-123'

  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
  })

  it('POST /api/service-orders: İstemciden gelen sahte privileged alanlar (financial_posted, net_profit, tenant_id) DB insert verisine sızmaz', async () => {
    let capturedRow: Record<string, unknown> | null = null

    const mockSupabase = {
      rpc: async () => ({ data: 'SRV-SAFE-001', error: null }),
      from: () => ({
        insert: (data: Record<string, unknown>) => {
          capturedRow = data
          return {
            select: () => ({
              single: async () => ({ data: { id: 'order-1', ...data }, error: null }),
            }),
          }
        },
      }),
    }

    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: mockSupabase as never,
      userId: authenticUserId,
      tenantId: authenticTenantId,
      role: 'teknisyen',
    })

    const { POST } = await import('@/app/api/service-orders/route')
    const req = createMockNextRequest('http://localhost/api/service-orders', {
      method: 'POST',
      body: {
        customer_id: 'cust-1',
        device_brand: 'Apple',
        device_model: 'iPhone 13',
        fault_description: 'Batarya arızası',
        // ── KÖTÜ NİYETLİ MASS ASSIGNMENT ALANLARI ──
        tenant_id: 'malicious-tenant-999',
        financial_posted: true,
        net_profit: 999999,
        status: 'teslim', // Doğrudan teslim statüsüne atlamaya çalışma
      },
    })

    const res = await POST(req)
    await assertStatus(res, 201)

    expect(capturedRow).not.toBeNull()
    // 1. tenant_id güvenli auth context'inden alınmış olmalı
    expect((capturedRow as unknown as { tenant_id: string }).tenant_id).toBe(authenticTenantId)
    expect((capturedRow as unknown as { tenant_id: string }).tenant_id).not.toBe('malicious-tenant-999')

    // 2. Privileged alanlar (financial_posted, net_profit) DB satırına eklenmemeli
    expect((capturedRow as unknown as Record<string, unknown>).financial_posted).toBeUndefined()
    expect((capturedRow as unknown as Record<string, unknown>).net_profit).toBeUndefined()
  })
})
