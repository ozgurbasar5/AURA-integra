import { describe, it, expect } from 'vitest'
import { computeKasaFromTransactions, deepMergeSettings } from '@/lib/tenant-store'

describe('tenant-store', () => {
  it('computeKasaFromTransactions sums gelir minus gider', () => {
    const balance = computeKasaFromTransactions([
      { type: 'gelir', amount: 1000 },
      { type: 'gider', amount: 200 },
      { type: 'gelir', amount: 50 },
    ])
    expect(balance).toBe(850)
  })

  it('deepMergeSettings preserves nested keys', () => {
    const merged = deepMergeSettings(
      { sms: { enabled: true, api_key: 'secret' }, shop_name: 'A' },
      { sms: { provider: 'netgsm' }, shop_phone: '555' },
    )
    expect(merged).toEqual({
      sms: { enabled: true, api_key: 'secret', provider: 'netgsm' },
      shop_name: 'A',
      shop_phone: '555',
    })
  })
})
