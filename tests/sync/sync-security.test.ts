import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/tenant-auth', () => ({
  requireTenantAuth: vi.fn(),
  isUuid: (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val),
}))

vi.mock('@/lib/supabase/service', () => ({
  getServiceClient: vi.fn(),
}))

import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { GET } from '@/app/api/tenant/sync/route'

describe('Sync Security & Tenant Isolation', () => {
  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
    vi.mocked(getServiceClient).mockReset()
  })

  it('1. Sync never accepts client-provided tenant_id and relies strictly on session', async () => {
    const authenticatedTenantId = 'tenant-auth-secured-99'
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      tenantId: authenticatedTenantId,
      userId: 'user-1',
      role: 'tenant_admin',
      supabase: {} as never,
    } as never)

    const eqSpies: { column: string; val: unknown }[] = []

    const mockAdmin = {
      from: vi.fn().mockImplementation((_table: string) => {
        const chain: Record<string, unknown> = {}
        chain.select = vi.fn().mockReturnValue(chain)
        chain.eq = vi.fn().mockImplementation((col: string, val: unknown) => {
          eqSpies.push({ column: col, val })
          return chain
        })
        chain.order = vi.fn().mockReturnValue(chain)
        chain.limit = vi.fn().mockResolvedValue({ data: [], error: null })
        chain.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
        return chain
      }),
    }
    vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

    // Attacker tries to inject tenant_id via query params
    const maliciousReq = new NextRequest('http://localhost:3000/api/tenant/sync?tenant_id=victim-tenant-id')
    const res = await GET(maliciousReq)
    expect(res.status).toBe(200)

    const json = await res.json()
    expect(json.tenantId).toBe(authenticatedTenantId)

    // Verify all queries were scoped with the authenticated tenant ID, not the query param
    const scopedCalls = eqSpies.filter(s => s.column === 'tenant_id' || s.column === 'id')
    expect(scopedCalls.length).toBeGreaterThan(0)
    for (const call of scopedCalls) {
      expect(call.val).toBe(authenticatedTenantId)
    }
  })

  it('2. Blocked / inactive user cannot sync', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: false,
      status: 403,
      message: 'Hesabınız pasif durumda',
    } as never)

    const req = new NextRequest('http://localhost:3000/api/tenant/sync')
    const res = await GET(req)
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error).toBe('Hesabınız pasif durumda')
  })
})
