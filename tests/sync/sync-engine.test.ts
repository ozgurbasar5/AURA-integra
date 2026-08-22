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
})
