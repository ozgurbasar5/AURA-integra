import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/tenant-auth', () => ({
  requireTenantAuth: vi.fn(),
  isUuid: vi.fn(() => true),
}))

import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { POST } from '@/app/api/tenant/push/route'
import { isKnownPushModule, isPushDisabledModule } from '@/lib/api-role-guard'

describe('push disabled modules', () => {
  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: { from: vi.fn() } as never,
      tenantId: 't1',
      userId: 'u1',
      role: 'tenant_admin',
    })
  })

  it('API-first modules are push-disabled', () => {
    for (const mod of ['serviceOrders', 'stock', 'sales', 'transactions', 'cashShifts', 'kasaBalance', 'appointments', 'warranties', 'invoices', 'purchases', 'customers']) {
      expect(isPushDisabledModule(mod)).toBe(true)
      expect(isKnownPushModule(mod)).toBe(false)
    }
  })

  it('returns 400 for deprecated kasaBalance module', async () => {
    const req = new NextRequest('http://localhost/api/tenant/push', {
      method: 'POST',
      body: JSON.stringify({ module: 'kasaBalance', balance: 100 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for stock bulk push', async () => {
    const req = new NextRequest('http://localhost/api/tenant/push', {
      method: 'POST',
      body: JSON.stringify({ module: 'stock', items: [] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toMatch(/API-first|Bilinmeyen/)
  })
})
