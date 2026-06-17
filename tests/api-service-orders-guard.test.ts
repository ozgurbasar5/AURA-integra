import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { GET } from '@/app/api/service-orders/route'

describe('service-orders route auth', () => {
  beforeEach(() => {
    vi.mocked(createClient).mockReset()
  })

  it('GET returns 401 when unauthenticated', async () => {
    vi.mocked(createClient).mockReturnValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    } as never)

    const req = new NextRequest('http://localhost/api/service-orders')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})
