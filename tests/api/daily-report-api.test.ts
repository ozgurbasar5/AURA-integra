import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockNextRequest,
  assertStatus,
  assertBadRequest,
  assertUnauthorized,
} from './helpers/api-client'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'

vi.mock('@/lib/supabase/tenant-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase/tenant-auth')>('@/lib/supabase/tenant-auth')
  return {
    ...actual,
    requireTenantAuth: vi.fn(),
  }
})

vi.mock('@/lib/supabase/service', () => ({
  getServiceClient: vi.fn(),
}))

vi.mock('@/lib/tenant-plan-guard', () => ({
  requireTenantPlanLevel: vi.fn().mockResolvedValue({ ok: true, level: 2 }),
  getTenantPlanLevel: vi.fn().mockResolvedValue(2),
}))

function createQueryChain(data: any = []) {
  const chain: any = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    gte: vi.fn(() => chain),
    lte: vi.fn(() => chain),
    lt: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn(() => Promise.resolve({ data, error: null })),
    single: vi.fn(() => Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data, error: null })),
    maybeSingle: vi.fn(() => Promise.resolve({ data: Array.isArray(data) ? data[0] ?? null : data, error: null })),
    then: (resolve: any) => Promise.resolve({ data, error: null }).then(resolve),
  }
  return chain
}

describe('API Test: /api/tenant/reports/daily-eod & /api/tenant/eod-report', () => {
  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
    vi.mocked(getServiceClient).mockReset()
  })

  describe('1. GET /api/tenant/reports/daily-eod', () => {
    it('oturum yoksa 401 döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: false,
        status: 401,
        message: 'Oturum bulunamadı',
      })

      const { GET } = await import('@/app/api/tenant/reports/daily-eod/route')
      const req = createMockNextRequest('http://localhost/api/tenant/reports/daily-eod?date=2026-08-19')
      const res = await GET(req)
      await assertUnauthorized(res)
    })

    it('yetkili kullanıcı için 200 döner ve Kasa 2.0 Gün Sonu Raporunu üretir', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-manager',
        tenantId: 'tenant-1',
        role: 'tenant_admin',
      })

      const mockAccounts = [
        { id: 'acc-1', name: 'Nakit Kasa', type: 'kasa', balance: 0, currency: 'TRY', is_default: true, is_active: true },
        { id: 'acc-2', name: 'POS', type: 'pos', balance: 0, currency: 'TRY', is_default: false, is_active: true },
      ]

      const mockAdmin = {
        from: (table: string) => {
          if (table === 'accounts') return createQueryChain(mockAccounts)
          if (table === 'tenants') return createQueryChain({ shop_name: 'AURA Bilişim' })
          return createQueryChain([])
        },
      }

      vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

      const { GET } = await import('@/app/api/tenant/reports/daily-eod/route')
      const req = createMockNextRequest('http://localhost/api/tenant/reports/daily-eod?date=2026-08-19')
      const res = await GET(req)
      const body = await assertStatus(res, 200)
      const report = body.report as any

      expect(body.ok).toBe(true)
      expect(report).toBeDefined()
      expect(report.meta.date).toBe('2026-08-19')
      expect(report.integrity.balanced).toBe(true)
      expect(report.integrity.mismatches.length).toBe(0)
    })

    it('bakiye ve defter uyuşmazlığı olduğunda integrity.balanced=false ve mismatches döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-manager',
        tenantId: 'tenant-1',
        role: 'tenant_admin',
      })

      const mockMismatchedAccounts = [
        { id: 'acc-1', name: 'Nakit Kasa', type: 'kasa', balance: 5000, currency: 'TRY', is_default: true, is_active: true },
      ]

      const mockAdmin = {
        from: (table: string) => {
          if (table === 'accounts') return createQueryChain(mockMismatchedAccounts)
          if (table === 'tenants') return createQueryChain({ shop_name: 'AURA Bilişim' })
          return createQueryChain([])
        },
      }

      vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

      const { GET } = await import('@/app/api/tenant/reports/daily-eod/route')
      const req = createMockNextRequest('http://localhost/api/tenant/reports/daily-eod?date=2026-08-19')
      const res = await GET(req)
      const body = await assertStatus(res, 200)
      const report = body.report as any

      expect(body.ok).toBe(true)
      expect(report.integrity.balanced).toBe(false)
      expect(report.integrity.mismatches.length).toBe(1)
      expect(report.integrity.mismatches[0].account_name).toBe('Nakit Kasa')
    })
  })

  describe('2. GET /api/tenant/eod-report (Dual Legacy & New Support)', () => {
    it('date parametresi verildiğinde Kasa 2.0 defter raporunu döner', async () => {
      vi.mocked(requireTenantAuth).mockResolvedValue({
        ok: true,
        supabase: {} as never,
        userId: 'user-manager',
        tenantId: 'tenant-1',
        role: 'tenant_admin',
      })

      const mockAccounts = [
        { id: 'acc-1', name: 'Nakit Kasa', type: 'kasa', balance: 0, currency: 'TRY', is_default: true, is_active: true },
      ]

      const mockAdmin = {
        from: (table: string) => {
          if (table === 'accounts') return createQueryChain(mockAccounts)
          if (table === 'tenants') return createQueryChain({ shop_name: 'AURA Bilişim' })
          return createQueryChain([])
        },
      }

      vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

      const { GET } = await import('@/app/api/tenant/eod-report/route')
      const req = createMockNextRequest('http://localhost/api/tenant/eod-report?date=2026-08-19')
      const res = await GET(req)
      const body = await assertStatus(res, 200)

      expect(body.ok).toBe(true)
      expect(body.source).toBe('ledger')
      expect(body.report).toBeDefined()
    })
  })
})
