import { describe, it, expect } from 'vitest'
import {
  isPaymentOverdue,
  evaluateTenantAccess,
  extendSubscriptionEnd,
  computeTrialEnd,
  addDays,
  toDateString,
  getTenantBlockMessage,
} from '@/lib/subscription'

describe('isPaymentOverdue', () => {
  it('ödendi → gecikmiş değil', () => {
    const past = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]
    expect(isPaymentOverdue(past, 'paid')).toBe(false)
  })

  it('iptal → gecikmiş değil', () => {
    const past = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]
    expect(isPaymentOverdue(past, 'cancelled')).toBe(false)
  })

  it('vadesi geçmiş pending → gecikmiş', () => {
    const past = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]
    expect(isPaymentOverdue(past, 'pending')).toBe(true)
  })

  it('vadesi geçmiş overdue → gecikmiş', () => {
    const past = new Date(Date.now() - 5 * 86400000).toISOString().split('T')[0]
    expect(isPaymentOverdue(past, 'overdue')).toBe(true)
  })

  it('vadesi geçmemiş pending → gecikmiş değil', () => {
    const future = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0]
    expect(isPaymentOverdue(future, 'pending')).toBe(false)
  })
})

describe('evaluateTenantAccess — ek senaryolar', () => {
  it('passive → engellendi', () => {
    const result = evaluateTenantAccess({ status: 'passive', subscription_end: null })
    expect(result.allowed).toBe(false)
    if (!result.allowed) expect(result.reason).toBe('passive')
  })

  it('suspended → engellendi', () => {
    const result = evaluateTenantAccess({ status: 'suspended', subscription_end: null })
    expect(result.allowed).toBe(false)
    if (!result.allowed) expect(result.reason).toBe('suspended')
  })

  it('has_overdue_payment=true → payment_overdue', () => {
    const future = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]
    const result = evaluateTenantAccess({ status: 'active', subscription_end: future, has_overdue_payment: true })
    expect(result.allowed).toBe(false)
    if (!result.allowed) expect(result.reason).toBe('payment_overdue')
  })

  it('trial süresi geçmişse → subscription_expired', () => {
    const past = new Date(Date.now() - 86400000).toISOString().split('T')[0]
    const result = evaluateTenantAccess({ status: 'trial', subscription_end: past })
    expect(result.allowed).toBe(false)
    if (!result.allowed) expect(result.reason).toBe('subscription_expired')
  })

  it('subscription_end olmadığında aktif tenant erişebilir', () => {
    const result = evaluateTenantAccess({ status: 'active', subscription_end: null })
    expect(result.allowed).toBe(true)
  })
})

describe('extendSubscriptionEnd', () => {
  it('null endpoint → now + 30 gün', () => {
    const extended = extendSubscriptionEnd(null, 30)
    const future = new Date(Date.now() + 29 * 86400000)
    expect(new Date(extended).getTime()).toBeGreaterThan(future.getTime())
  })

  it('gelecekteki endpoint → endpoint + 30 gün', () => {
    const future = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]
    const extended = extendSubscriptionEnd(future, 30)
    expect(new Date(extended).getTime()).toBeGreaterThan(new Date(future).getTime())
  })

  it('geçmişteki endpoint → now + 30 gün', () => {
    const past = new Date(Date.now() - 10 * 86400000).toISOString().split('T')[0]
    const extended = extendSubscriptionEnd(past, 30)
    const thirtyDaysFromNow = new Date(Date.now() + 29 * 86400000)
    expect(new Date(extended).getTime()).toBeGreaterThan(thirtyDaysFromNow.getTime())
  })
})

describe('computeTrialEnd', () => {
  it('bugünden 30 gün sonrasını döner', () => {
    const end = computeTrialEnd()
    const expectedMin = new Date(Date.now() + 29 * 86400000)
    expect(new Date(end).getTime()).toBeGreaterThan(expectedMin.getTime())
  })
})

describe('addDays', () => {
  it('tarih ekler', () => {
    const base = new Date('2026-01-01')
    const result = addDays(base, 30)
    expect(result.toISOString().split('T')[0]).toBe('2026-01-31')
  })

  it('negatif gün çıkarır', () => {
    const base = new Date('2026-01-31')
    const result = addDays(base, -10)
    expect(result.toISOString().split('T')[0]).toBe('2026-01-21')
  })
})

describe('toDateString', () => {
  it('YYYY-MM-DD formatı döner', () => {
    const result = toDateString(new Date('2026-06-15T12:00:00Z'))
    expect(result).toBe('2026-06-15')
  })
})

describe('getTenantBlockMessage', () => {
  it('tüm nedenler için mesaj döner', () => {
    const reasons = ['no_tenant', 'passive', 'suspended', 'subscription_expired', 'payment_overdue', 'profile_inactive'] as const
    for (const reason of reasons) {
      const msg = getTenantBlockMessage(reason)
      expect(msg).toBeTruthy()
      expect(typeof msg).toBe('string')
    }
  })
})
