import { describe, it, expect } from 'vitest'
import { extendSubscriptionEnd, evaluateTenantAccess } from '@/lib/subscription'

describe('subscription', () => {
  it('extendSubscriptionEnd adds days from future end', () => {
    const future = new Date()
    future.setDate(future.getDate() + 10)
    const end = future.toISOString().split('T')[0]
    const extended = extendSubscriptionEnd(end, 30)
    expect(new Date(extended).getTime()).toBeGreaterThan(future.getTime())
  })

  it('evaluateTenantAccess blocks expired subscription', () => {
    const past = new Date()
    past.setDate(past.getDate() - 1)
    const result = evaluateTenantAccess({
      status: 'active',
      subscription_end: past.toISOString().split('T')[0],
    })
    expect(result.allowed).toBe(false)
    if (!result.allowed) expect(result.reason).toBe('subscription_expired')
  })

  it('evaluateTenantAccess allows active tenant', () => {
    const future = new Date()
    future.setDate(future.getDate() + 30)
    const result = evaluateTenantAccess({
      status: 'active',
      subscription_end: future.toISOString().split('T')[0],
    })
    expect(result.allowed).toBe(true)
  })
})
