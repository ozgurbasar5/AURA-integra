import { describe, it, expect, vi, beforeEach } from 'vitest'
import { activateTenantSubscription } from '@/lib/subscription-webhook'

function createAdminMock(opts: {
  existingPayment?: { id: string } | null
  tenant?: { subscription_end: string; plan_id: string | null }
}) {
  const insert = vi.fn().mockResolvedValue({ error: null })
  const update = vi.fn().mockResolvedValue({ error: null })

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
        insert,
      }
    }
    if (table === 'tenants') {
      return {
        select: () => ({
          eq: () => ({
            single: async () => ({ data: opts.tenant ?? { subscription_end: null, plan_id: null } }),
          }),
        }),
        update: () => ({
          eq: async () => ({ error: null }),
        }),
      }
    }
    return {}
  })

  return { from, insert }
}

describe('activateTenantSubscription idempotency', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })

  it('skips duplicate externalRef without inserting payment', async () => {
    const admin = createAdminMock({
      existingPayment: { id: 'pay-1' },
      tenant: { subscription_end: '2026-12-31', plan_id: null },
    })

    const result = await activateTenantSubscription(admin as never, 'tenant-1', {
      provider: 'stripe',
      externalRef: 'evt_123',
    })

    expect(result).toEqual({ subscription_end: '2026-12-31' })
    expect(admin.insert).not.toHaveBeenCalled()
  })
})
