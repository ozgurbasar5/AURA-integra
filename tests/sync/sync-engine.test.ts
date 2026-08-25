import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/tenant-auth', () => ({
  requireTenantAuth: vi.fn(),
}))

vi.mock('@/lib/supabase/service', () => ({
  getServiceClient: vi.fn(),
}))

import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { GET, POST } from '@/app/api/tenant/sync/route'

describe('Sync Engine API', () => {
  const mockTenantId = 'tenant-12345'
  const mockUserId = 'user-99999'

  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
    vi.mocked(getServiceClient).mockReset()
  })

  it('1. GET returns 401 when unauthenticated', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: false,
      status: 401,
      message: 'Oturum bulunamadı',
    } as never)

    const req = new NextRequest('http://localhost:3000/api/tenant/sync')
    const res = await GET(req)
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error).toBe('Oturum bulunamadı')
  })

  it('2. GET returns synchronized payload with deterministic contract', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      tenantId: mockTenantId,
      userId: mockUserId,
      role: 'tenant_admin',
      supabase: {} as never,
    } as never)

    const mockAdmin = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: { company_name: 'Test Servis' }, error: null }),
      }),
    }
    vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

    const req = new NextRequest('http://localhost:3000/api/tenant/sync')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.ok).toBe(true)
    expect(json.synced).toBe(true)
    expect(json.tenantId).toBe(mockTenantId)
    expect(json.data).toBeDefined()
    expect(json.synced_at).toBeDefined()
    expect(json.timestamp).toBeDefined()
  })

  it('3. POST behaves identically to GET (supports both methods)', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      tenantId: mockTenantId,
      userId: mockUserId,
      role: 'tenant_admin',
      supabase: {} as never,
    } as never)

    const mockAdmin = {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }
    vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

    const req = new NextRequest('http://localhost:3000/api/tenant/sync', { method: 'POST' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.synced).toBe(true)
  })

  it('4. Handles partial schema gracefully without 500 error', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      tenantId: mockTenantId,
      userId: mockUserId,
      role: 'tenant_admin',
      supabase: {} as never,
    } as never)

    const mockAdmin = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'parts') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            order: vi.fn().mockResolvedValue({ data: null, error: { message: 'relation parts does not exist' } }),
          }
        }
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        }
      }),
    }
    vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

    const req = new NextRequest('http://localhost:3000/api/tenant/sync')
    const res = await GET(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)
    expect(json.partial).toBe(true)
    expect(json.queryErrors).toEqual(
      expect.arrayContaining([expect.objectContaining({ table: 'parts' })])
    )
  })

  it('5. Incremental sync applies created_at filter to financial_transactions and sales', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      tenantId: mockTenantId,
      userId: mockUserId,
      role: 'tenant_admin',
      supabase: {} as never,
    } as never)

    const tableQueries: Record<string, { gteCalls: [string, unknown][]; limitCalls: number[]; orCalls: string[] }> = {}

    const mockAdmin = {
      from: vi.fn().mockImplementation((table: string) => {
        const queryState = {
          gteCalls: [] as [string, unknown][],
          limitCalls: [] as number[],
          orCalls: [] as string[],
        }
        tableQueries[table] = queryState

        const builder: Record<string, unknown> = {}
        builder.select = vi.fn().mockReturnValue(builder)
        builder.eq = vi.fn().mockReturnValue(builder)
        builder.order = vi.fn().mockReturnValue(builder)
        builder.gte = vi.fn().mockImplementation((col: string, val: unknown) => {
          queryState.gteCalls.push([col, val])
          return builder
        })
        builder.or = vi.fn().mockImplementation((cond: string) => {
          queryState.orCalls.push(cond)
          return builder
        })
        builder.limit = vi.fn().mockImplementation((lim: number) => {
          queryState.limitCalls.push(lim)
          return Promise.resolve({ data: [], error: null })
        })
        builder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
        builder.in = vi.fn().mockReturnValue(builder)
        builder.then = (resolve: (val: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(resolve)

        return builder
      }),
    }
    vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

    const sinceTimestamp = '2026-08-25T00:00:00.000Z'
    const req = new NextRequest(`http://localhost:3000/api/tenant/sync?since=${encodeURIComponent(sinceTimestamp)}`)
    const res = await GET(req)
    expect(res.status).toBe(200)

    // financial_transactions should filter on created_at (NOT updated_at, NOT .or())
    expect(tableQueries['financial_transactions']?.gteCalls).toEqual([['created_at', sinceTimestamp]])
    expect(tableQueries['financial_transactions']?.orCalls).toEqual([])

    // sales should filter on created_at (NOT updated_at)
    expect(tableQueries['sales']?.gteCalls).toEqual([['created_at', sinceTimestamp]])

    // parts, customers, service_orders have updated_at in schema and should filter on updated_at
    expect(tableQueries['parts']?.gteCalls).toEqual([['updated_at', sinceTimestamp]])
    expect(tableQueries['customers']?.gteCalls).toEqual([['updated_at', sinceTimestamp]])
    expect(tableQueries['service_orders']?.gteCalls).toEqual([['updated_at', sinceTimestamp]])
  })

  it('6. Full sync without since preserves limit(500) on financial_transactions', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      tenantId: mockTenantId,
      userId: mockUserId,
      role: 'tenant_admin',
      supabase: {} as never,
    } as never)

    const tableQueries: Record<string, { gteCalls: [string, unknown][]; limitCalls: number[] }> = {}

    const mockAdmin = {
      from: vi.fn().mockImplementation((table: string) => {
        const queryState = {
          gteCalls: [] as [string, unknown][],
          limitCalls: [] as number[],
        }
        tableQueries[table] = queryState

        const builder: Record<string, unknown> = {}
        builder.select = vi.fn().mockReturnValue(builder)
        builder.eq = vi.fn().mockReturnValue(builder)
        builder.order = vi.fn().mockReturnValue(builder)
        builder.gte = vi.fn().mockImplementation((col: string, val: unknown) => {
          queryState.gteCalls.push([col, val])
          return builder
        })
        builder.limit = vi.fn().mockImplementation((lim: number) => {
          queryState.limitCalls.push(lim)
          return Promise.resolve({ data: [], error: null })
        })
        builder.maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null })
        builder.in = vi.fn().mockReturnValue(builder)
        builder.then = (resolve: (val: unknown) => unknown) =>
          Promise.resolve({ data: [], error: null }).then(resolve)

        return builder
      }),
    }
    vi.mocked(getServiceClient).mockReturnValue(mockAdmin as never)

    const req = new NextRequest('http://localhost:3000/api/tenant/sync')
    const res = await GET(req)
    expect(res.status).toBe(200)

    // financial_transactions without since should limit to 500 and not have gte
    expect(tableQueries['financial_transactions']?.limitCalls).toContain(500)
    expect(tableQueries['financial_transactions']?.gteCalls).toEqual([])
  })
})

