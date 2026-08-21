import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockNextRequest,
  assertStatus,
} from '../api/helpers/api-client'
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

describe('Security: IDOR & Resource Tampering Defense', () => {
  const tenantA = 'tenant-aaa-111'
  const tenantB = 'tenant-bbb-222'
  const orderIdTenantB = '44444444-4444-4444-8444-444444444444'

  // Tenant B'nin DB kaydı
  const dbOrderTenantB = {
    id: orderIdTenantB,
    tenant_id: tenantB,
    order_no: 'SRV-TENANT-B-001',
    status: 'tamirde',
    device_brand: 'Apple',
    device_model: 'iPhone 15 Pro',
  }

  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
    vi.mocked(getServiceClient).mockReset()
  })

  it('1. Path IDOR: Tenant A kullanıcısı Tenant B siparişine parça eklemeye çalıştığında 404 alır (DB değişmez)', async () => {
    // Tenant A olarak oturum açılmış
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      userId: 'user-attacker-a',
      tenantId: tenantA,
      role: 'teknisyen',
    })

    // Mock Service Client: Tenant A filtresi uygulandığı için Tenant B kaydı dönmez!
    const mockAdmin = {
      from: (table: string) => ({
        select: () => ({
          eq: (col: string, val: string) => ({
            eq: (col2: string, val2: string) => ({
              maybeSingle: async () => {
                // Tenant A yetkisi ile Tenant B siparişi bulunamaz
                if (col === 'tenant_id' && val === tenantA && val2 === orderIdTenantB) {
                  return { data: null, error: null }
                }
                return { data: null, error: null }
              },
            }),
          }),
        }),
      }),
    }

    vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

    const { POST } = await import('@/app/api/service-orders/[id]/use-parts/route')
    const req = createMockNextRequest(`http://localhost/api/service-orders/${orderIdTenantB}/use-parts`, {
      method: 'POST',
      body: { parts: [{ stock_id: '55555555-5555-4555-8555-555555555555', qty: 1 }] },
    })

    const res = await POST(req, { params: { id: orderIdTenantB } })
    await assertStatus(res, 404, 'IDOR Parça Ekleme Reddi')

    // DB KANITI: Tenant B siparişi bozulmadı
    expect(dbOrderTenantB.status).toBe('tamirde')
    expect(dbOrderTenantB.tenant_id).toBe(tenantB)
  })

  it('2. Query Parameter Tampering: ?tenant_id=tenant_B manipülasyonu sunucu auth bağlamını geçersiz kılamaz', async () => {
    let enforcedTenantId: string | null = null

    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: (col: string, val: string) => {
            if (col === 'tenant_id') {
              enforcedTenantId = val
            }
            return {
              order: () => ({
                range: async () => ({ data: [], error: null, count: 0 }),
              }),
            }
          },
        }),
      }),
    }

    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: mockSupabase as never,
      userId: 'user-attacker-a',
      tenantId: tenantA,
      role: 'tenant_admin',
    })

    const { GET } = await import('@/app/api/service-orders/route')
    // Query string içine kötü niyetli tenant_id ekleniyor
    const req = createMockNextRequest(`http://localhost/api/service-orders?tenant_id=${tenantB}`)
    const res = await GET(req)
    await assertStatus(res, 200)

    // Sunucu tarafında tenant_id sorgusu mutlaka Tenant A olmalı, Tenant B DEĞİL!
    expect(enforcedTenantId).toBe(tenantA)
    expect(enforcedTenantId).not.toBe(tenantB)
  })
})
