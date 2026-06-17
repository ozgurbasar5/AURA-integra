import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/tenant-auth', () => ({
  requireTenantAuth: vi.fn(),
}))

import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { POST } from '@/app/api/notify/route'

describe('notify route auth', () => {
  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
  })

  it('POST returns 401 when unauthenticated', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: false,
      status: 401,
      message: 'Oturum gerekli',
    } as never)

    const req = new NextRequest('http://localhost/api/notify', {
      method: 'POST',
      body: JSON.stringify({ channel: 'sms', to: '05000000000', message: 'test' }),
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })
})
