import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/tenant-auth', () => ({
  requireTenantAuth: vi.fn(),
}))

import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { GET } from '@/app/api/service-orders/route'

describe('service-orders route auth', () => {
  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
  })

  it('GET returns 401 when unauthenticated', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: false,
      status: 401,
      message: 'Oturum bulunamadı',
    })

    const req = new NextRequest('http://localhost/api/service-orders')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})
