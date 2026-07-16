import { describe, it, expect } from 'vitest'
import { computeKasaFromTransactions, deepMergeSettings } from '@/lib/tenant-store'

describe('tenant-store', () => {
  it('computeKasaFromTransactions sums nakit gelir minus nakit gider', () => {
    const balance = computeKasaFromTransactions([
      { type: 'gelir', amount: 1000, payment_method: 'nakit' },
      { type: 'gider', amount: 200, payment_method: 'nakit' },
      { type: 'gelir', amount: 50, payment_method: 'nakit' },
    ])
    expect(balance).toBe(850)
  })

  it('computeKasaFromTransactions ignores card/havale and cari ledger', () => {
    const balance = computeKasaFromTransactions([
      { type: 'gelir', amount: 500, payment_method: 'nakit' },
      { type: 'gelir', amount: 300, payment_method: 'kredi_karti' },
      { type: 'gider', amount: 100, payment_method: 'havale' },
      { type: 'gider', amount: 200, payment_method: 'veresiye', category: 'Cari Borç' },
      { type: 'gelir', amount: 50 }, // eksik method → nakit
    ])
    expect(balance).toBe(550)
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
