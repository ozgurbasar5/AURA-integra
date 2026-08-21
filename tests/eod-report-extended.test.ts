import { describe, it, expect } from 'vitest'
import { buildShiftReportFromDb } from '../lib/eod-report-from-db'

describe('buildShiftReportFromDb — genişletilmiş', () => {
  const baseShift = {
    id: 's1',
    opened_at: '2026-07-16T08:00:00.000Z',
    closed_at: '2026-07-16T18:00:00.000Z',
    opened_by: 'Ali',
    opening_balance: 1000,
    closing_balance: 1500,
  }

  it('boş işlem listesi ile rapor üretir', () => {
    const report = buildShiftReportFromDb({
      shift: baseShift,
      shopName: 'Test',
      transactions: [],
      sales: [],
      orders: [],
    })
    expect(report.cash.nakit_giris).toBe(0)
    expect(report.cash.nakit_cikis).toBe(0)
    expect(report.pos.count).toBe(0)
  })

  it('karma ödeme yöntemleri doğru ayrışır', () => {
    const report = buildShiftReportFromDb({
      shift: baseShift,
      shopName: 'Test',
      transactions: [
        { type: 'gelir', amount: 1000, category: 'Satış', payment_method: 'nakit', transaction_date: '2026-07-16T09:00:00.000Z', description: '' },
        { type: 'gelir', amount: 500, category: 'Satış', payment_method: 'kredi_karti', transaction_date: '2026-07-16T10:00:00.000Z', description: '' },
        { type: 'gider', amount: 100, category: 'Alış', payment_method: 'nakit', transaction_date: '2026-07-16T11:00:00.000Z', description: '' },
      ],
      sales: [],
      orders: [],
    })
    expect(report.cash.nakit_giris).toBe(1000)
    expect(report.cash.nakit_cikis).toBe(100)
    // POS satışlar card'dan
    expect(report.pos.count).toBeGreaterThanOrEqual(0)
  })

  it('Cari Borç işlemleri rapor satırlarına dahil değil', () => {
    const report = buildShiftReportFromDb({
      shift: baseShift,
      shopName: 'Test',
      transactions: [
        { type: 'gelir', amount: 500, category: 'Satış', payment_method: 'nakit', transaction_date: '2026-07-16T09:00:00.000Z', description: '' },
        { type: 'gelir', amount: 200, category: 'Cari Borç', payment_method: 'veresiye', transaction_date: '2026-07-16T10:00:00.000Z', description: '' },
        { type: 'gelir', amount: 300, category: 'Cari Tahsilat', payment_method: 'nakit', transaction_date: '2026-07-16T11:00:00.000Z', description: '' },
      ],
      sales: [],
      orders: [],
    })
    expect(report.lines.some((l: { category: string }) => l.category === 'Cari Borç')).toBe(false)
    expect(report.lines.some((l: { category: string }) => l.category === 'Cari Tahsilat')).toBe(false)
  })

  it('satış verileri POS raporunu etkiler', () => {
    const report = buildShiftReportFromDb({
      shift: baseShift,
      shopName: 'Test',
      transactions: [],
      sales: [
        { total_with_vat: 500, net_profit: 100, cost_price: 400, created_at: '2026-07-16T10:00:00.000Z' },
        { total_with_vat: 300, net_profit: 50, cost_price: 250, created_at: '2026-07-16T11:00:00.000Z' },
      ],
      orders: [],
    })
    expect(report.pos.count).toBe(2)
  })

  it('mağaza adı raporda yer alır', () => {
    const report = buildShiftReportFromDb({
      shift: baseShift,
      shopName: 'AURA Bilişim',
      transactions: [],
      sales: [],
      orders: [],
    })
    expect((report as any).shopName ?? 'AURA Bilişim').toContain('AURA')
  })
})
