import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/tenant-auth', () => ({
  requireTenantAuth: vi.fn(),
  isUuid: vi.fn(() => true),
}))

import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { POST } from '@/app/api/tenant/push/route'
import { isKnownPushModule } from '@/lib/api-role-guard'

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

  it('serviceOrders is not a known push module', () => {
    expect(isKnownPushModule('serviceOrders')).toBe(false)
    expect(isKnownPushModule('kasaBalance')).toBe(false)
  })

  it('returns 400 for deprecated kasaBalance module', async () => {
    const req = new NextRequest('http://localhost/api/tenant/push', {
      method: 'POST',
      body: JSON.stringify({ module: 'kasaBalance', balance: 100 }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })
})
