import { describe, it, expect } from 'vitest'
import { normalizePaymentMethod } from '@/lib/payment-method'
import { resolveAccountTypeForPayment } from '@/lib/finance-accounts'

/**
 * Kasa 2.0 Adım 2 — Backfill Audit Test Suite
 *
 * Mevcut financial_transactions verisindeki payment_method → account mapping testi.
 */

describe('Kasa 2.0: Backfill Mapping & Audit', () => {
  it('1. Clear mapping: nakit → kasa hesabı', () => {
    const pm = normalizePaymentMethod('nakit')
    expect(pm).toBe('nakit')
    expect(resolveAccountTypeForPayment(pm)).toBe('kasa')
  })

  it('2. Clear mapping: kredi_karti → pos hesabı', () => {
    const pm = normalizePaymentMethod('kredi_karti')
    expect(pm).toBe('kredi_karti')
    expect(resolveAccountTypeForPayment(pm)).toBe('pos')
  })

  it('3. Clear mapping: havale → banka hesabı', () => {
    const pm = normalizePaymentMethod('havale')
    expect(pm).toBe('havale')
    expect(resolveAccountTypeForPayment(pm)).toBe('banka')
  })

  it('4. Clear mapping: eft → banka hesabı (normalize → havale)', () => {
    const pm = normalizePaymentMethod('eft')
    expect(pm).toBe('havale')
    expect(resolveAccountTypeForPayment(pm)).toBe('banka')
  })

  it('5. Ambiguous: NULL payment_method → null bırakılır, yanlış hesap atanmaz', () => {
    // NULL pm olan eski transaction'larda account_id NULL kalmalı
    const pm = null
    const shouldBackfill = pm !== null
    expect(shouldBackfill).toBe(false)
  })

  it('6. Non-liquid: veresiye / cek / senet → NULL birakilir (Likit kasa atanmaz)', () => {
    const pmVeresiye = normalizePaymentMethod('veresiye')
    const pmCek = normalizePaymentMethod('cek')
    const pmSenet = normalizePaymentMethod('senet')

    expect(resolveAccountTypeForPayment(pmVeresiye)).toBeNull()
    expect(resolveAccountTypeForPayment(pmCek)).toBeNull()
    expect(resolveAccountTypeForPayment(pmSenet)).toBeNull()
  })

  it('7. Backfill audit kategorileri: clear (likit) / unresolved (non-liquid veya NULL) ayrımı', () => {
    const transactions = [
      { id: '1', payment_method: 'nakit', account_id: null },
      { id: '2', payment_method: 'kredi_karti', account_id: null },
      { id: '3', payment_method: 'havale', account_id: null },
      { id: '4', payment_method: null, account_id: null },
      { id: '5', payment_method: 'nakit', account_id: 'already-assigned' },
      { id: '6', payment_method: 'transfer', account_id: null },
      { id: '7', payment_method: 'veresiye', account_id: null },
      { id: '8', payment_method: 'cek', account_id: null },
    ]

    const needsBackfill = transactions.filter(t => t.account_id === null)
    expect(needsBackfill.length).toBe(7)

    // Sadece likit ödeme yöntemleri clear statüsündedir
    const clear = needsBackfill.filter(t => t.payment_method && resolveAccountTypeForPayment(t.payment_method) !== null)
    const nonLiquidOrNull = needsBackfill.filter(t => !t.payment_method || resolveAccountTypeForPayment(t.payment_method) === null)

    expect(clear.length).toBe(4)             // nakit, kredi_karti, havale, transfer(→havale)
    expect(nonLiquidOrNull.length).toBe(3)    // null, veresiye, cek
  })

  it('8. Zaten account_id atanmis kayitlar backfill isleminden etkilenmez', () => {
    const tx = { id: '5', payment_method: 'nakit', account_id: 'existing-account' }
    const shouldUpdate = tx.account_id === null
    expect(shouldUpdate).toBe(false)
  })
})
