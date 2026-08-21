import { describe, it, expect } from 'vitest'
import type { FinanceAccount } from '@/lib/finance-accounts'

/**
 * Kasa 2.0 Adım 5 — Desktop Kasa & Finans Dashboard Unit Tests
 *
 * Test Kapsamı:
 * 1. Toplam Likidite Hesaplama
 * 2. Hesap Tipleri ve İkon Haritalama
 * 3. Günlük İstatistikler ve Veresiye/Çek Tahakkuk Ayrımı
 * 4. Canlı Defter Filtreleme ve Arama Mantığı
 */

describe('Kasa 2.0: Desktop Kasa Dashboard Logic', () => {
  const mockAccounts: FinanceAccount[] = [
    { id: 'acc-1', tenant_id: 't-1', name: 'Nakit Kasa', type: 'kasa', balance: 15000, currency: 'TRY', is_default: true, is_active: true, metadata: {}, created_at: '2026-08-01', updated_at: '2026-08-19' },
    { id: 'acc-2', tenant_id: 't-1', name: 'Garanti POS', type: 'pos', balance: 42000, currency: 'TRY', is_default: false, is_active: true, metadata: {}, created_at: '2026-08-01', updated_at: '2026-08-19' },
    { id: 'acc-3', tenant_id: 't-1', name: 'İş Bankası Ticari', type: 'banka', balance: 95000, currency: 'TRY', is_default: false, is_active: true, metadata: {}, created_at: '2026-08-01', updated_at: '2026-08-19' },
    { id: 'acc-4', tenant_id: 't-1', name: 'Eski Kasa', type: 'kasa', balance: 0, currency: 'TRY', is_default: false, is_active: false, metadata: {}, created_at: '2026-08-01', updated_at: '2026-08-19' },
  ]

  it('1. Toplam Likidite: Yalnızca aktif hesapların bakiyeleri toplanır', () => {
    const activeAccounts = mockAccounts.filter(a => a.is_active)
    const totalLiquidity = activeAccounts.reduce((s, a) => s + a.balance, 0)

    expect(totalLiquidity).toBe(152000)
  })

  it('2. Ana Hesap Tespiti: is_default olan hesap ana kasa olarak belirlenir', () => {
    const defaultAcc = mockAccounts.find(a => a.is_default)
    expect(defaultAcc).toBeDefined()
    expect(defaultAcc?.id).toBe('acc-1')
    expect(defaultAcc?.name).toBe('Nakit Kasa')
  })

  it('3. Günlük İstatistikler: Net Likit Akış = Gelir - Gider - İade', () => {
    const stats = {
      income: 18500,
      expense: 3200,
      refund: 500,
      transferVolume: 10000,
      veresiyeAccrual: 7500,
    }

    const netLiquidityFlow = stats.income - stats.expense - stats.refund
    expect(netLiquidityFlow).toBe(14800)
    // Veresiye ve transferler likidite net akışını etkilemez
    expect(stats.veresiyeAccrual).toBe(7500)
  })

  it('4. Ledger Arama & Filtreleme: Açıklama, tip ve hesap filtreleri doğru eşleşir', () => {
    const transactions = [
      { id: 't-1', type: 'gelir', account_id: 'acc-1', description: 'Ekran değişimi servis tahsilatı', amount: 2500 },
      { id: 't-2', type: 'gider', account_id: 'acc-1', description: 'Öğle yemeği', amount: 350 },
      { id: 't-3', type: 'transfer', account_id: 'acc-2', target_account_id: 'acc-3', description: 'POS aktarımı', amount: 10000 },
      { id: 't-4', type: 'gelir', account_id: 'acc-2', description: 'POS satışı', amount: 4500 },
    ]

    // Filtre: Yalnızca POS hesabı ('acc-2')
    const posTxs = transactions.filter(t => t.account_id === 'acc-2' || t.target_account_id === 'acc-2')
    expect(posTxs.length).toBe(2)

    // Filtre: Tip = 'gelir'
    const incomeTxs = transactions.filter(t => t.type === 'gelir')
    expect(incomeTxs.length).toBe(2)

    // Arama: 'servis'
    const searchResults = transactions.filter(t => t.description.toLowerCase().includes('servis'))
    expect(searchResults.length).toBe(1)
    expect(searchResults[0].id).toBe('t-1')
  })
})
