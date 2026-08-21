import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createMockNextRequest,
  assertStatus,
} from '../api/helpers/api-client'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'

vi.mock('@/lib/supabase/tenant-auth', async () => {
  const actual = await vi.importActual<typeof import('@/lib/supabase/tenant-auth')>('@/lib/supabase/tenant-auth')
  return {
    ...actual,
    requireTenantAuth: vi.fn(),
  }
})

/**
 * PERFORMANCE & BENCHMARK ENGINE: API Latency & Percentiles
 */
describe('Performance: API Latency & Execution Benchmarks', () => {
  const tenantId = 'tenant-perf-123'
  const userId = 'user-perf-123'

  beforeEach(() => {
    vi.mocked(requireTenantAuth).mockReset()
  })

  const calculatePercentiles = (durations: number[]) => {
    const sorted = [...durations].sort((a, b) => a - b)
    const p50 = sorted[Math.floor(sorted.length * 0.50)]
    const p95 = sorted[Math.floor(sorted.length * 0.95)]
    const p99 = sorted[Math.floor(sorted.length * 0.99)]
    return { p50, p95, p99, min: sorted[0], max: sorted[sorted.length - 1] }
  }

  it('GET /api/service-orders listeleme latency P95 < 250ms', async () => {
    const mockOrders = Array.from({ length: 25 }, (_, i) => ({
      id: `order-${i}`,
      order_no: `SRV-2026-${String(i + 1).padStart(4, '0')}`,
      status: 'tamirde',
      device_brand: 'Apple',
      device_model: 'iPhone 13',
    }))

    const mockSupabase = {
      from: () => ({
        select: () => ({
          eq: () => ({
            order: () => ({
              range: async () => ({ data: mockOrders, error: null, count: mockOrders.length }),
            }),
          }),
        }),
      }),
    }

    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: mockSupabase as never,
      userId,
      tenantId,
      role: 'tenant_admin',
    })

    const { GET } = await import('@/app/api/service-orders/route')
    const iterations = 30
    const durations: number[] = []

    for (let i = 0; i < iterations; i++) {
      const req = createMockNextRequest('http://localhost/api/service-orders?limit=25')
      const start = performance.now()
      const res = await GET(req)
      const duration = performance.now() - start
      durations.push(duration)
      await assertStatus(res, 200)
    }

    const { p50, p95, p99 } = calculatePercentiles(durations)
    expect(p50).toBeLessThan(100) // P50 < 100ms
    expect(p95).toBeLessThan(250) // P95 < 250ms
    expect(p99).toBeLessThan(500) // P99 < 500ms
  })

  it('POST /api/service-orders mutation latency P95 < 300ms', async () => {
    let orderCounter = 1000
    const mockSupabase = {
      rpc: async () => ({ data: `SRV-2026-${++orderCounter}`, error: null }),
      from: () => ({
        insert: (data: Record<string, unknown>) => ({
          select: () => ({
            single: async () => ({ data: { id: `order-${orderCounter}`, ...data }, error: null }),
          }),
        }),
      }),
    }

    vi.mocked(requireTenantAuth).mockResolvedValue({
      ok: true,
      supabase: mockSupabase as never,
      userId,
      tenantId,
      role: 'teknisyen',
    })

    const { POST } = await import('@/app/api/service-orders/route')
    const iterations = 20
    const durations: number[] = []

    for (let i = 0; i < iterations; i++) {
      const req = createMockNextRequest('http://localhost/api/service-orders', {
        method: 'POST',
        body: {
          customer_id: 'cust-1',
          device_brand: 'Apple',
          device_model: 'iPhone 15',
          fault_description: 'Ekran kırık',
        },
      })
      const start = performance.now()
      const res = await POST(req)
      const duration = performance.now() - start
      durations.push(duration)
      await assertStatus(res, 201)
    }

    const { p50, p95 } = calculatePercentiles(durations)
    expect(p50).toBeLessThan(150)
    expect(p95).toBeLessThan(300)
  })
})
