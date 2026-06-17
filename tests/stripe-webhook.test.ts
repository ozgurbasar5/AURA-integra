import { describe, it, expect } from 'vitest'
import { stripeAmountToMajor } from '@/lib/subscription-webhook'

describe('stripeAmountToMajor', () => {
  it('converts amount_total cents to major units', () => {
    expect(stripeAmountToMajor({ amount_total: 19900 })).toBe(199)
  })

  it('converts amount_paid cents when amount_total is absent', () => {
    expect(stripeAmountToMajor({ amount_paid: 9900 })).toBe(99)
  })

  it('returns 0 when no amount fields', () => {
    expect(stripeAmountToMajor({})).toBe(0)
  })
})
