import { describe, it, expect, vi } from 'vitest'
import { stripeAmountToMajor, activateTenantSubscription } from '@/lib/subscription-webhook'
import { extendSubscriptionEnd } from '@/lib/subscription'

describe('stripeAmountToMajor — genişletilmiş', () => {
  it('amount_total öncelikli', () => {
    expect(stripeAmountToMajor({ amount_total: 19900, amount_paid: 9900 })).toBe(199)
  })

  it('amount_paid fallback', () => {
    expect(stripeAmountToMajor({ amount_paid: 9900 })).toBe(99)
  })

  it('sıfır tutar', () => {
    expect(stripeAmountToMajor({ amount_total: 0 })).toBe(0)
  })

  it('boş nesne → 0', () => {
    expect(stripeAmountToMajor({})).toBe(0)
  })

  it('büyük tutar dönüşümü', () => {
    expect(stripeAmountToMajor({ amount_total: 120000 })).toBe(1200)
  })
})

describe('activateTenantSubscription — genişletilmiş', () => {
  function createMockAdmin(opts: {
    existingPayment?: { id: string } | null
    tenant?: { subscription_end: string | null; plan_id: string | null }
    insertError?: { message: string; code: string } | null
  }) {
    const insertMock = vi.fn().mockResolvedValue({ error: opts.insertError ?? null })
    const updateMock = vi.fn().mockResolvedValue({ error: null })

    const from = vi.fn((table: string) => {
      if (table === 'tenant_payments') {
        return {
          select: () => ({
            eq: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: async () => ({ data: opts.existingPayment ?? null }),
                }),
              }),
            }),
          }),
          insert: insertMock,
        }
      }
      if (table === 'tenants') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => ({
                data: opts.tenant ?? { subscription_end: null, plan_id: null },
              }),
            }),
          }),
          update: () => ({
            eq: async () => ({ error: null }),
          }),
        }
      }
      return {}
    })

    return { from, insertMock, updateMock }
  }

  it('yeni ödeme → subscription_end uzatılır', async () => {
    const admin = createMockAdmin({
      existingPayment: null,
      tenant: { subscription_end: null, plan_id: null },
    })

    const result = await activateTenantSubscription(admin as never, 'tenant-1', {
      provider: 'stripe',
      externalRef: 'evt_new_123',
      amount: 199,
    })

    expect(result).not.toBeNull()
    expect(result!.subscription_end).toBeTruthy()
    // Insert çağrıldı
    expect(admin.insertMock).toHaveBeenCalled()
  })

  it('duplicate externalRef → insert çağrılmaz', async () => {
    const admin = createMockAdmin({
      existingPayment: { id: 'pay-existing' },
      tenant: { subscription_end: '2026-12-31', plan_id: null },
    })

    const result = await activateTenantSubscription(admin as never, 'tenant-1', {
      provider: 'stripe',
      externalRef: 'evt_123',
    })

    expect(result).toEqual({ subscription_end: '2026-12-31' })
    expect(admin.insertMock).not.toHaveBeenCalled()
  })

  it('insert unique constraint hatası → mevcut subscription_end döner', async () => {
    const admin = createMockAdmin({
      existingPayment: null,
      tenant: { subscription_end: '2026-11-30', plan_id: null },
      insertError: { message: 'idx_tenant_payments_external_ref', code: '23505' },
    })

    const result = await activateTenantSubscription(admin as never, 'tenant-1', {
      provider: 'stripe',
      externalRef: 'evt_dupe',
    })

    expect(result).not.toBeNull()
  })

  it('periodDays parametresi aboneliği doğru uzatır', async () => {
    const currentEnd = new Date(Date.now() + 10 * 86400000).toISOString().split('T')[0]
    const admin = createMockAdmin({
      existingPayment: null,
      tenant: { subscription_end: currentEnd, plan_id: null },
    })

    const result = await activateTenantSubscription(admin as never, 'tenant-1', {
      provider: 'manual',
      periodDays: 60,
    })

    expect(result).not.toBeNull()
    const extended = new Date(result!.subscription_end)
    const expected = new Date(currentEnd)
    expected.setDate(expected.getDate() + 60)
    expect(extended.getTime()).toBeGreaterThanOrEqual(expected.getTime() - 86400000)
  })
})
