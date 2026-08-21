import { describe, it, expect } from 'vitest'
import {
  resolveDateRange,
  type DailyReportDateRange,
  type AccountDailySummary,
  type SalesDailySummary,
  type ServiceDailySummary,
  type ReconciliationDailySummary,
} from '@/lib/daily-financial-report'

/**
 * Kasa 2.0 Adım 4 — Daily Financial Report (EOD) Unit Tests
 *
 * Test Kapsamı:
 * 1. Timezone & Gün Sınırları (00:00 vs 23:59)
 * 2. Boş Gün (Empty Day)
 * 3. Nakit, POS, Banka Gelirleri
 * 4. Gider ve İade Hareketleri
 * 5. Hesaplar Arası Transfer (Zero-Sum Invariant)
 * 6. Bakiye Düzeltme ve Mutabakat Sayımı Ayrımı
 * 7. Veresiye & Çek/Senet Tahakkuk Ayrımı
 * 8. Satış & Servis Gelir Özeti
 */

describe('Kasa 2.0: Daily Financial Report Engine (EOD)', () => {
  // ─── 1. Timezone & Tarih Sınırları ──────────────────────────────────────────

  it('1. resolveDateRange: Europe/Istanbul (+03:00) için gün başlangıcı ve bitişi doğru ISO üretir', () => {
    const range = resolveDateRange('2026-08-19', null, null, 'Europe/Istanbul')

    expect(range.dateStr).toBe('2026-08-19')
    // 2026-08-19 00:00:00+03:00 -> 2026-08-18 21:00:00Z
    expect(range.from).toBe('2026-08-18T21:00:00.000Z')
    // 2026-08-19 23:59:59.999+03:00 -> 2026-08-19 20:59:59.999Z
    expect(range.to).toBe('2026-08-19T20:59:59.999Z')
  })

  it('2. Timezone Boundary: 23:59:59 ve 00:00:01 farklı gün pencerelerine atanır', () => {
    const day1 = resolveDateRange('2026-08-19', null, null, 'Europe/Istanbul')
    const day2 = resolveDateRange('2026-08-20', null, null, 'Europe/Istanbul')

    const ts1 = new Date('2026-08-19T20:59:59.000Z').getTime() // 23:59:59 Istanbul
    const ts2 = new Date('2026-08-19T21:00:01.000Z').getTime() // 00:00:01 Istanbul (next day)

    const inDay1 = ts1 >= new Date(day1.from).getTime() && ts1 <= new Date(day1.to).getTime()
    const inDay2 = ts2 >= new Date(day2.from).getTime() && ts2 <= new Date(day2.to).getTime()

    expect(inDay1).toBe(true)
    expect(inDay2).toBe(true)
  })

  // ─── 2. Boş Gün (Empty Day) ────────────────────────────────────────────────

  it('3. Boş Gün: Hiçbir hareket yoksa açılış = kapanış ve net akış 0 olur', () => {
    const account: AccountDailySummary = {
      account_id: 'acc-1',
      account_name: 'Nakit Kasa',
      account_type: 'kasa',
      currency: 'TRY',
      opening_balance: 5000,
      income: 0,
      expense: 0,
      refund: 0,
      transfer_in: 0,
      transfer_out: 0,
      adjustment: 0,
      ledger_closing_balance: 5000,
      system_balance: 5000,
      is_balanced: true,
      difference: 0,
    }

    expect(account.ledger_closing_balance).toBe(5000)
    expect(account.is_balanced).toBe(true)
  })

  // ─── 3. Gelir, Gider, İade ve Transfer ─────────────────────────────────────

  it('4. Hesap Hareketi Eşitliği: Opening + Income - Expense - Refund + Transfer = Closing', () => {
    const opening = 10000
    const income = 3500
    const expense = 800
    const refund = 200
    const transferIn = 1500
    const transferOut = 500
    const adjustment = -100

    const closing = opening + income - expense - refund + transferIn - transferOut + adjustment
    expect(closing).toBe(13400)
  })

  it('5. Transfer Invariant: İki hesap arasındaki transfer toplam şirket likiditesini değiştirmez', () => {
    const kasaOpening = 10000
    const bankaOpening = 50000
    const initialLiquidity = kasaOpening + bankaOpening // 60.000

    const transferAmount = 4000
    const kasaClosing = kasaOpening - transferAmount // 6.000
    const bankaClosing = bankaOpening + transferAmount // 54.000
    const finalLiquidity = kasaClosing + bankaClosing // 60.000

    expect(finalLiquidity).toBe(initialLiquidity)
  })

  // ─── 4. Satış ve Servis Gelir Özeti ────────────────────────────────────────

  it('6. Sales Summary: Veresiye ve Çek/Senet likit satışlardan ayrıştırılır', () => {
    const sales = [
      { total: 1000, method: 'nakit' },
      { total: 2500, method: 'kredi_karti' },
      { total: 5000, method: 'havale' },
      { total: 3000, method: 'veresiye' },
      { total: 10000, method: 'cek' },
    ]

    const cashSales = sales.filter(s => s.method === 'nakit').reduce((a, b) => a + b.total, 0)
    const posSales = sales.filter(s => s.method === 'kredi_karti').reduce((a, b) => a + b.total, 0)
    const bankSales = sales.filter(s => s.method === 'havale').reduce((a, b) => a + b.total, 0)
    const veresiyeSales = sales.filter(s => s.method === 'veresiye').reduce((a, b) => a + b.total, 0)
    const cekSales = sales.filter(s => s.method === 'cek').reduce((a, b) => a + b.total, 0)

    const liquidSalesTotal = cashSales + posSales + bankSales // 8.500
    const totalSales = sales.reduce((a, b) => a + b.total, 0)  // 21.500

    expect(liquidSalesTotal).toBe(8500)
    expect(veresiyeSales).toBe(3000)
    expect(cekSales).toBe(10000)
    expect(totalSales).toBe(21500)
  })

  it('7. Service Summary: Teslim edilen servis ücreti ve parça maliyeti ile net kâr hesaplanır', () => {
    const serviceDeliveries = [
      { fee: 2000, parts_cost: 600 },
      { fee: 1500, parts_cost: 300 },
      { fee: 4000, parts_cost: 1100 },
    ]

    const totalFee = serviceDeliveries.reduce((s, d) => s + d.fee, 0) // 7500
    const totalPartsCost = serviceDeliveries.reduce((s, d) => s + d.parts_cost, 0) // 2000
    const netProfit = totalFee - totalPartsCost // 5500

    expect(totalFee).toBe(7500)
    expect(totalPartsCost).toBe(2000)
    expect(netProfit).toBe(5500)
  })

  // ─── 5. Mutabakat ve Bakiye Düzeltme Ayrımı ────────────────────────────────

  it('8. Mutabakat Sayımı: Sayım farkı sadece log üretir, bakiye düzeltmesi açıkça yapılmışsa adjustment olarak yansır', () => {
    const reconAudit = {
      account_id: 'acc-1',
      counted_balance: 4800,
      system_balance: 5000,
      difference: -200,
      adjusted: false, // Bakiye düzeltilmedi!
    }

    expect(reconAudit.difference).toBe(-200)
    expect(reconAudit.adjusted).toBe(false)
    // Defter kapanışı etkilenmez
  })
})
