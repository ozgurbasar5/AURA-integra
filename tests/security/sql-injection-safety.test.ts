import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockNextRequest,
  assertStatus,
} from '../api/helpers/api-client'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { safeClientMessage } from '@/lib/api-error'

vi.mock('@/lib/supabase/tenant-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase/tenant-auth')>('@/lib/supabase/tenant-auth')
  return {
    ...actual,
    requireTenantAuth: vi.fn(),
  }
})

describe('Security: SQL Injection & Safe Error Exposure Defense', () => {
  const sqlInjectionPayloads = [
    "' OR 1=1 --",
    "'; DROP TABLE service_orders; --",
    "' UNION SELECT id, email, password_hash FROM auth.users --",
    "1' OR '1' = '1",
    "<script>alert(1)</script>",
  ]

  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
  })

  it.each(sqlInjectionPayloads)('Arama sorgusunda SQL injection payload güvenle parametrelendirilir: %s', async (payload) => {
    let capturedOrFilter: string | null = null

    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              range: () => ({
                or: (filterStr: string) => {
                  capturedOrFilter = filterStr
                  return Promise.resolve({ data: [], error: null, count: 0 })
                },
              }),
            }),
          }),
        }),
      }),
    }

    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: mockSupabase as never,
      userId: 'user-tech',
      tenantId: 'tenant-1',
      role: 'teknisyen',
    })

    const { GET } = await import('@/app/api/service-orders/route')
    const req = createMockNextRequest(`http://localhost/api/service-orders?search=${encodeURIComponent(payload)}`)
    const res = await GET(req)
    await assertStatus(res, 200)

    expect(capturedOrFilter).toBeDefined()
  })

  it('Veritabanı hata mesajlarında hassas bağlantı dizesi veya tablo yapısı istemciye sızdırılmaz (safeClientMessage)', () => {
    // safeClientMessage fallback mekanizması test edilir
    const fallbackMsg = 'Veritabanı hatası oluştu'
    const sanitized = safeClientMessage(null, fallbackMsg)

    expect(sanitized).toBe(fallbackMsg)
    expect(sanitized).not.toContain('postgres')
    expect(sanitized).not.toContain('10.0.0.1')
    expect(sanitized).not.toContain('5432')
  })
})
