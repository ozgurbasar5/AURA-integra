import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const getUserMock = vi.fn()

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: getUserMock,
    },
  })),
}))

vi.mock('@/lib/supabase/public-env', () => ({
  getPublicSupabaseEnv: vi.fn(() => ({
    url: 'https://test.supabase.co',
    anon: 'anon-key',
  })),
}))

import { getUserFromRequest } from '@/lib/supabase/session-from-request'

describe('getUserFromRequest', () => {
  beforeEach(() => {
    getUserMock.mockReset()
  })

  it('returns null when getUser fails (no JWT fallback)', async () => {
    getUserMock.mockResolvedValue({ data: { user: null }, error: { message: 'invalid' } })

    const req = new NextRequest('http://localhost/api/admin/stats', {
      headers: { cookie: 'sb-test-auth-token=fake.jwt.token' },
    })

    const user = await getUserFromRequest(req)
    expect(user).toBeNull()
  })

  it('returns user when getUser succeeds', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'admin@test.com' } },
      error: null,
    })

    const req = new NextRequest('http://localhost/api/admin/stats')
    const user = await getUserFromRequest(req)
    expect(user).toEqual({ id: 'user-1', email: 'admin@test.com' })
  })
})
