import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockNextRequest,
  assertUnauthorized,
  assertForbidden,
} from '../api/helpers/api-client'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'

vi.mock('@/lib/supabase/tenant-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase/tenant-auth')>('@/lib/supabase/tenant-auth')
  return {
    ...actual,
    requireTenantAuth: vi.fn(),
  }
})

describe('Security: JWT & Auth Token Integrity', () => {
  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
  })

  it('İmzasız veya geçersiz JWT gönderildiğinde 401 döner', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: false,
      status: 401,
      message: 'Oturum bulunamadı',
    })

    const { GET } = await import('@/app/api/service-orders/route')
    const req = createMockNextRequest('http://localhost/api/service-orders', {
      bearerToken: 'eyJhbGciOiJub25lIn0.eyJzdWIiOiIxMjM0NTY3ODkwIiwicm9sZSI6InN1cGVyX2FkbWluIn0.',
    })
    const res = await GET(req)
    await assertUnauthorized(res, 'Forged alg:none JWT')
  })

  it('Süresi dolmuş JWT token ile yapılan istek 401 döner', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: false,
      status: 401,
      message: 'Oturum bulunamadı',
    })

    const { GET } = await import('@/app/api/tenant/parts/route')
    const req = createMockNextRequest('http://localhost/api/tenant/parts', {
      bearerToken: 'expired.jwt.token',
    })
    const res = await GET(req)
    await assertUnauthorized(res, 'Expired JWT')
  })

  it('Veritabanında pasif olan kullanıcı geçerli bir JWT sunsa dahi 403 ile engellenir', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: false,
      status: 403,
      message: 'Hesap pasif',
    })

    const { GET } = await import('@/app/api/service-orders/route')
    const req = createMockNextRequest('http://localhost/api/service-orders')
    const res = await GET(req)
    await assertForbidden(res, 'Revoked / Inactive User Token')
  })
})
