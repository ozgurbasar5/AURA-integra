import { describe, expect, it } from 'vitest'
import { buildShiftReportFromDb } from '../lib/eod-report-from-db'

describe('buildShiftReportFromDb', () => {
  it('builds cash and pos from db rows without cari', () => {
    const report = buildShiftReportFromDb({
      shift: {
        id: 's1',
        opened_at: '2026-07-16T08:00:00.000Z',
        closed_at: '2026-07-16T18:00:00.000Z',
        opened_by: 'Ali',
        opening_balance: 1000,
        closing_balance: 1500,
      },
      shopName: 'Test',
      transactions: [
        { type: 'gelir', amount: 500, category: 'Satış', payment_method: 'nakit', transaction_date: '2026-07-16T10:00:00.000Z', description: 'POS' },
        { type: 'gelir', amount: 200, category: 'Cari Borç', payment_method: 'veresiye', transaction_date: '2026-07-16T11:00:00.000Z', description: 'cari' },
        { type: 'gider', amount: 50, category: 'Alış', payment_method: 'nakit', transaction_date: '2026-07-16T12:00:00.000Z', description: 'Stok alımı' },
      ],
      sales: [
        { total_with_vat: 500, net_profit: 100, cost_price: 400, created_at: '2026-07-16T10:00:00.000Z' },
      ],
      orders: [],
    })
    expect(report.cash.nakit_giris).toBe(500)
    expect(report.cash.nakit_cikis).toBe(50)
    expect(report.pos.count).toBe(1)
    expect(report.lines.some(l => l.category === 'Cari Borç')).toBe(false)
  })
})
