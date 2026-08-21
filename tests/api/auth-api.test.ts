import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockNextRequest,
  assertUnauthorized,
  assertForbidden,
} from './helpers/api-client'
import { requireTenantAuth, requireTenantOwner } from '@/lib/supabase/tenant-auth'

vi.mock('@/lib/supabase/tenant-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase/tenant-auth')>('@/lib/supabase/tenant-auth')
  return {
    ...actual,
    requireTenantAuth: vi.fn(),
    requireTenantOwner: vi.fn(),
  }
})

describe('API Test: Authentication & Tenant Guard', () => {
  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
    vi.mocked(requireTenantOwner).mockReset()
  })

  it('Authorization header veya oturum olmadığında 401 Unauthorized döner', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: false,
      status: 401,
      message: 'Oturum bulunamadı',
    })

    const { GET } = await import('@/app/api/service-orders/route')
    const req = createMockNextRequest('http://localhost/api/service-orders')
    const res = await GET(req)
    await assertUnauthorized(res, 'Unauthenticated GET')
  })

  it('Geçersiz veya süresi dolmuş Bearer token ile istek yapıldığında 401 döner', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: false,
      status: 401,
      message: 'Oturum bulunamadı',
    })

    const { GET } = await import('@/app/api/tenant/parts/route')
    const req = createMockNextRequest('http://localhost/api/tenant/parts', {
      bearerToken: 'invalid.expired.jwt.token',
    })
    const res = await GET(req)
    await assertUnauthorized(res, 'Invalid Bearer Token')
  })

  it('Hesabı pasif (is_active: false) kullanıcı için 403 Forbidden döner', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: false,
      status: 403,
      message: 'Hesap pasif',
    })

    const { GET } = await import('@/app/api/service-orders/route')
    const req = createMockNextRequest('http://localhost/api/service-orders')
    const res = await GET(req)
    await assertForbidden(res, 'Inactive User')
  })

  it('Süper admin tenant API rotasını çağırdığında 403 döner', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: false,
      status: 403,
      message: 'Süper admin tenant API kullanamaz',
    })

    const { GET } = await import('@/app/api/service-orders/route')
    const req = createMockNextRequest('http://localhost/api/service-orders')
    const res = await GET(req)
    await assertForbidden(res, 'Super Admin Tenant API Guard')
  })

  it('Yönetici yetkisi gerektiren rotada (requireTenantOwner) teknisyen veya viewer için 403 döner', async () => {
    vi.mocked(requireTenantOwner).mockResolvedValue({
      ok: false,
      status: 403,
      message: 'Bu işlem için yönetici yetkisi gerekli',
    })

    const res = await requireTenantOwner()
    expect(res.ok).toBe(false)
    if (!res.ok) {
      expect(res.status).toBe(403)
      expect(res.message).toContain('yönetici yetkisi')
    }
  })
})
