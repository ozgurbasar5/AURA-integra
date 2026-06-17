import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/session-from-request', () => ({
  getUserFromRequest: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  getServiceClient: vi.fn(() => null),
}))

import { getUserFromRequest } from '@/lib/supabase/session-from-request'
import { GET } from '@/app/api/admin/platform-settings/route'

describe('admin platform-settings guard', () => {
  beforeEach(() => {
    vi.mocked(getUserFromRequest).mockReset()
  })

  it('GET returns 401 without session', async () => {
    vi.mocked(getUserFromRequest).mockResolvedValue(null)
    const req = new NextRequest('http://localhost/api/admin/platform-settings')
    const res = await GET(req)
    expect(res.status).toBe(401)
  })
})
