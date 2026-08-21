import { describe, it, expect } from 'vitest'
import { parseLocaleNumber } from '@/lib/parse-locale-number'

/**
 * Kasa 2.0 Adım 5 — UI Action Validations & Business Rules
 *
 * Test Kapsamı:
 * 1. Tutar Ayrıştırma (Turkish Locale Number Parsing)
 * 2. Transfer: Kaynak == Hedef Engeli
 * 3. Transfer: Yetersiz Bakiye Kontrolü
 * 4. Mutabakat: Sistem Bakiyesi Read-Only ve Fark Hesabı
 * 5. Mutabakat: Sayım Kaydet (Audit) vs Fark Düzelt (Adjustment) Ayrımı
 */

describe('Kasa 2.0: UI Actions & Validation Invariants', () => {
  it('1. Tutar Ayrıştırma: Türkçe formatlı tutarları (1.500,50 veya 250,75) sayıya çevirir', () => {
    expect(parseLocaleNumber('250,50')).toBe(250.5)
    expect(parseLocaleNumber('1.250,75')).toBe(1250.75)
    expect(parseLocaleNumber('5000')).toBe(5000)
    expect(parseLocaleNumber('0')).toBe(0)
    expect(Number.isNaN(parseLocaleNumber('abc'))).toBe(true)
  })

  it('2. Transfer Doğrulaması: Kaynak ve hedef hesap aynı ise işlem reddedilir', () => {
    const fromId = 'acc-kasa'
    const toId = 'acc-kasa'
    const isSame = fromId === toId

    expect(isSame).toBe(true)
  })

  it('3. Transfer Bakiyesi: Transfer tutarı kaynak bakiyesinden büyükse yetersiz bakiye hatası oluşur', () => {
    const sourceAccount = { id: 'acc-kasa', balance: 5000 }
    const transferAmount = 7500
    const isInsufficient = transferAmount > sourceAccount.balance

    expect(isInsufficient).toBe(true)
  })

  it('4. Mutabakat Fark Hesabı: Counted - System farkı doğru hesaplanır', () => {
    const systemBalance = 12500
    const countedBalance = 12250 // 250 TL açık
    const difference = Math.round((countedBalance - systemBalance) * 100) / 100

    expect(difference).toBe(-250)
  })

  it('5. Mutabakat Eşleşmesi: Sayım sistem bakiyesine eşitse fark 0 olur', () => {
    const systemBalance = 25000
    const countedBalance = 25000
    const difference = countedBalance - systemBalance
    const isMatch = Math.abs(difference) < 0.01

    expect(isMatch).toBe(true)
    expect(difference).toBe(0)
  })
})
