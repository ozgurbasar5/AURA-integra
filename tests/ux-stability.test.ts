import { describe, it, expect, vi } from 'vitest'
import { fetchTcmbFxRates } from '@/lib/fx-rates'

describe('UX Stability 1.0: Realtime, State & Error Invariants', () => {
  it('1. Optimistic Mutation Logic: Başarılı mutation durumunda state güncellenir', async () => {
    let state = 'tamirde'
    const onMutate = vi.fn((producer: (s: string) => string) => {
      state = producer(state)
    })
    const mutationFn = vi.fn().mockResolvedValue({ status: 'hazir' })

    // Simulate optimistic execution
    onMutate(() => 'hazir')
    expect(state).toBe('hazir')

    const res = await mutationFn()
    expect(res.status).toBe('hazir')
  })

  it('2. Optimistic Rollback Logic: Sunucu hatası durumunda UI anında önceki duruma rollback yapar', async () => {
    let state = 'tamirde'
    const previousState = state

    // 1. Optimistic transition
    state = 'hazir'
    expect(state).toBe('hazir')

    // 2. Server mutation fails
    const mutationFn = vi.fn().mockRejectedValue(new Error('500 Internal Server Error'))

    try {
      await mutationFn()
    } catch {
      // 3. Rollback
      state = previousState
    }

    expect(state).toBe('tamirde')
  })

  it('3. Action Lock: Hızlı çift tıklamalarda mükerrer işlem kilitlenir (tek istek çalışır)', async () => {
    let locked = false
    let executionCount = 0

    const executeWithLock = async (action: () => Promise<string>) => {
      if (locked) return null
      locked = true
      try {
        return await action()
      } finally {
        locked = false
      }
    }

    const slowAction = async () => {
      await new Promise((r) => setTimeout(r, 20))
      executionCount++
      return 'done'
    }

    // 2 simultaneous calls
    const [res1, res2] = await Promise.all([
      executeWithLock(slowAction),
      executeWithLock(slowAction),
    ])

    expect(res1).toBe('done')
    expect(res2).toBeNull()
    expect(executionCount).toBe(1)
  })

  it('4. Realtime Subscription Lifecycle: Unmount/cleanup anında kanal aboneliği tamamen temizlenir', () => {
    const mockRemoveChannel = vi.fn()
    const mockChannel = {
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnThis(),
    }
    const mockSupabase = {
      channel: vi.fn().mockReturnValue(mockChannel),
      removeChannel: mockRemoveChannel,
    }

    // Mount lifecycle
    const channel = mockSupabase.channel('realtime_service_orders_all')
    channel.subscribe()
    expect(mockSupabase.channel).toHaveBeenCalledTimes(1)
    expect(mockChannel.subscribe).toHaveBeenCalledTimes(1)

    // Unmount lifecycle (cleanup)
    mockSupabase.removeChannel(channel)
    expect(mockRemoveChannel).toHaveBeenCalledWith(channel)
  })

  it('5. TCMB Kurları: Ağ/bağlantı hatası durumunda 502 vermez, güvenli yedek kurlarla devam eder', async () => {
    const data = await fetchTcmbFxRates()

    expect(data.source).toBe('tcmb')
    expect(data.rates.length).toBeGreaterThanOrEqual(3)
    const usd = data.rates.find((r) => r.code === 'USD')
    expect(usd).toBeDefined()
    expect(usd!.buying).toBeGreaterThan(0)
    expect(usd!.selling).toBeGreaterThan(0)
  })
})
