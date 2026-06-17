import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/tenant-auth', () => ({
  requireTenantAuth: vi.fn(),
  isUuid: vi.fn(() => true),
}))

import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { POST } from '@/app/api/tenant/push/route'

describe('push unknown module', () => {
  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
  })

  it('returns 400 for unknown module', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      tenantId: 't1',
      userId: 'u1',
      role: 'tenant_admin',
    })

    const req = new NextRequest('http://localhost/api/tenant/push', {
      method: 'POST',
      body: JSON.stringify({ module: 'unknownModuleXYZ', items: [] }),
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toContain('unknownModuleXYZ')
  })
})
