import { describe, it, expect } from 'vitest'
import { checkRateLimit } from '@/lib/rate-limit'

describe('checkRateLimit', () => {
  it('allows requests under limit', async () => {
    const key = `test-${Date.now()}`
    expect((await checkRateLimit(key, 3, 60_000)).ok).toBe(true)
    expect((await checkRateLimit(key, 3, 60_000)).ok).toBe(true)
    expect((await checkRateLimit(key, 3, 60_000)).ok).toBe(true)
  })

  it('blocks after limit exceeded', async () => {
    const key = `block-${Date.now()}`
    await checkRateLimit(key, 2, 60_000)
    await checkRateLimit(key, 2, 60_000)
    const result = await checkRateLimit(key, 2, 60_000)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.retryAfterSec).toBeGreaterThan(0)
  })
})
