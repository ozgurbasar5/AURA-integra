import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/tenant-auth', () => ({
  requireTenantAuth: vi.fn(),
}))

import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { POST } from '@/app/api/notify/route'

describe('notify role guard', () => {
  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
  })

  it('viewer role receives 403', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: {} as never,
      userId: 'u1',
      tenantId: 't1',
      role: 'viewer',
    })

    const req = new NextRequest('http://localhost/api/notify', {
      method: 'POST',
      body: JSON.stringify({ to: '05000000000', message: 'test' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(403)
  })
})
