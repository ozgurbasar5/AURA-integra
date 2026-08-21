import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockNextRequest,
  assertStatus,
} from './helpers/api-client'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'

vi.mock('@/lib/supabase/tenant-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase/tenant-auth')>('@/lib/supabase/tenant-auth')
  return {
    ...actual,
    requireTenantAuth: vi.fn(),
  }
})

describe('API Test: Tenant Isolation & Penetration Prevention', () => {
  const tenantA = 'tenant-aaa-111'
  const tenantB = 'tenant-bbb-222'

  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
  })

  it('Tenant A kullanıcısı istek gövdesine (body) Tenant B ID koysa bile sunucu Tenant A üzerinde işlem yapar', async () => {
    let capturedInsertData: Record<string, unknown> | null = null

    const mockSupabase = {
      rpc: async () => ({ data: 'SRV-TEST-001', error: null }),
      from: () => ({
        insert: (data: Record<string, unknown>) => {
          capturedInsertData = data
          return {
            select: () => ({
              single: async () => ({ data: { id: 'order-1', ...data }, error: null }),
            }),
          }
        },
      }),
    }

    // Tenant A olarak oturum açılmış
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: mockSupabase as never,
      userId: 'user-tenant-a',
      tenantId: tenantA,
      role: 'tenant_admin',
    })

    const { POST } = await import('@/app/api/service-orders/route')
    // Body içine kötü niyetli şekilde tenant_id: tenantB konuluyor!
    const req = createMockNextRequest('http://localhost/api/service-orders', {
      method: 'POST',
      body: {
        tenant_id: tenantB, // Saldırı denemesi!
        customer_id: 'cust-1',
        device_brand: 'Apple',
        device_model: 'iPhone 15',
      },
    })

    const res = await POST(req)
    await assertStatus(res, 201)

    // Sunucu tarafında tenant_id'nin Tenant A olarak zorlandığı doğrulanmalı!
    expect(capturedInsertData).not.toBeNull()
    expect((capturedInsertData as unknown as { tenant_id: string }).tenant_id).toBe(tenantA)
    expect((capturedInsertData as unknown as { tenant_id: string }).tenant_id).not.toBe(tenantB)
  })

  it('Tenant A kullanıcısı Tenant B verilerine listelemede erişemez (tenantQuery filtresi)', async () => {
    let appliedFilterTenantId: string | null = null

    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: (column: string, value: string) => {
            if (column === 'tenant_id') {
              appliedFilterTenantId = value
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
      userId: 'user-tenant-a',
      tenantId: tenantA,
      role: 'tenant_admin',
    })

    const { GET } = await import('@/app/api/service-orders/route')
    const req = createMockNextRequest('http://localhost/api/service-orders')
    const res = await GET(req)
    await assertStatus(res, 200)

    // Veritabanı sorgusunda tenant_id filtresinin Tenant A olduğu doğrulanmalı
    expect(appliedFilterTenantId).toBe(tenantA)
    expect(appliedFilterTenantId).not.toBe(tenantB)
  })
})
