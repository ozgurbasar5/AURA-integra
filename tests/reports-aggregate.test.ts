import { describe, expect, it } from 'vitest'
import {
  aggregateCategories,
  aggregateMonthly,
  buildVatFromApi,
  summarizeFinance,
} from '../lib/reports-aggregate'

describe('reports-aggregate', () => {
  const txs = [
    { type: 'gelir', amount: 1000, category: 'Satış', date: '2026-01-15' },
    { type: 'gelir', amount: 500, category: 'Servis Teslim', date: '2026-01-20' },
    { type: 'gider', amount: 200, category: 'Alış', date: '2026-01-18' },
    { type: 'gelir', amount: 300, category: 'Cari Borç', date: '2026-01-19' },
    { type: 'gelir', amount: 100, category: 'Satış', date: '2026-02-01' },
  ]

  it('excludes cari from finance summary', () => {
    const s = summarizeFinance(txs)
    expect(s.totalGelir).toBe(1600)
    expect(s.totalGider).toBe(200)
    expect(s.netKar).toBe(1400)
  })

  it('aggregates monthly gelir/gider', () => {
    const m = aggregateMonthly(txs, 12)
    expect(m.length).toBeGreaterThanOrEqual(2)
    const jan = m.find(x => x.month === 'Oca')
    expect(jan?.gelir).toBe(1500)
    expect(jan?.gider).toBe(200)
  })

  it('aggregates categories without cari', () => {
    const c = aggregateCategories(txs)
    expect(c.some(x => x.name === 'Cari Borç')).toBe(false)
    expect(c.find(x => x.name === 'Satış')?.value).toBe(1100)
  })

  it('builds vat for POS + service', () => {
    const vat = buildVatFromApi(txs, [
      { subtotal: 100, vat_amount: 20, total_with_vat: 120 },
    ])
    expect(vat.rows.length).toBe(2)
    expect(vat.totalVat).toBeGreaterThan(20)
  })
})
