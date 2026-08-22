import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/supabase/tenant-auth', () => ({
  requireTenantAuth: vi.fn(),
  isUuid: (val: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val),
}))

vi.mock('@/lib/supabase/service', () => ({
  getServiceClient: vi.fn(),
}))

vi.mock('@/lib/tenant-audit-log', () => ({
  writeTenantAuditLog: vi.fn(),
}))

import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { POST } from '@/app/api/tenant/push/route'

describe('Sync Push Idempotency & Finance Protection', () => {
  const mockTenantId = '11111111-1111-4111-8111-111111111111'
  const mockUserId = '22222222-2222-4222-8222-222222222222'

  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
    vi.mocked(getServiceClient).mockReset()
  })

  it('1. Transactions push is rejected with 400 because finance is API-first (protects double accounting)', async () => {
    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      tenantId: mockTenantId,
      userId: mockUserId,
      role: 'tenant_admin',
      supabase: {} as never,
    } as never)

    const pushPayload = {
      module: 'transactions',
      items: [
        {
          id: 'temp-id',
          type: 'gelir',
          category: 'Servis Teslim',
          amount: 500,
        },
      ],
    }

    const req = new NextRequest('http://localhost:3000/api/tenant/push', {
      method: 'POST',
      body: JSON.stringify(pushPayload),
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('bulk push kapalı')
  })

  it('2. Allowed module push (todos) performs idempotent upsert', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ error: null })
    const mockSupabase = {
      from: vi.fn().mockReturnValue({
        upsert: mockUpsert,
      }),
    }

    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      tenantId: mockTenantId,
      userId: mockUserId,
      role: 'tenant_admin',
      supabase: mockSupabase as never,
    } as never)

    const todoId = '33333333-3333-4333-8333-333333333333'
    const pushPayload = {
      module: 'todos',
      items: [
        {
          id: todoId,
          title: 'Ekran değişimi yapılacak',
          completed: false,
        },
      ],
    }

    const req = new NextRequest('http://localhost:3000/api/tenant/push', {
      method: 'POST',
      body: JSON.stringify(pushPayload),
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.ok).toBe(true)

    expect(mockSupabase.from).toHaveBeenCalledWith('todos')
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.arrayContaining([expect.objectContaining({ id: todoId, tenant_id: mockTenantId })]),
      { onConflict: 'id' }
    )
  })
})
