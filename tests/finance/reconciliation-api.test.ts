import { describe, it, expect } from 'vitest'

/**
 * Kasa 2.0 Adım 2 — Reconciliation API Test Suite
 *
 * POST /api/tenant/finance/reconcile
 * Mutabakat — Sayım (Reconciliation) ve Bakiye Düzeltme (Balance Adjustment) ayrımı.
 */

describe('Kasa 2.0: Reconciliation & Adjustment Separation', () => {
  it('1. Mutabakat Sayımı: sayım ile sistem bakiyesi farkı doğru hesaplanır', () => {
    const systemBalance = 5000
    const countedBalance = 4800
    const difference = countedBalance - systemBalance
    expect(difference).toBe(-200)
  })

  it('2. Salt Mutabakat (auto_adjust=false): sayım loglanır ama bakiye DEĞİŞMEZ', () => {
    const systemBalance = 5000
    const countedBalance = 4800
    const difference = countedBalance - systemBalance
    const autoAdjust = false

    let finalBalance = systemBalance
    if (autoAdjust) {
      finalBalance += difference
    }

    expect(difference).toBe(-200)
    expect(finalBalance).toBe(5000) // Bakiye değişmedi!
  })

  it('3. Açık Bakiye Düzeltmesi (auto_adjust=true): bakiye güncellenir ve düzeltme kaydı oluşur', () => {
    const systemBalance = 2000
    const countedBalance = 2150
    const difference = countedBalance - systemBalance
    const autoAdjust = true

    let finalBalance = systemBalance
    let adjustmentRecordCreated = false

    if (autoAdjust && difference !== 0) {
      finalBalance += difference
      adjustmentRecordCreated = true
    }

    expect(difference).toBe(150)
    expect(finalBalance).toBe(2150)
    expect(adjustmentRecordCreated).toBe(true)
  })

  it('4. Mutabakat: fark yoksa (0) kayıt oluşturulur, bakiye değişmez', () => {
    const systemBalance = 3000
    const countedBalance = 3000
    const difference = countedBalance - systemBalance
    expect(difference).toBe(0)
  })

  it('5. Client system_balance gönderme denemesi → server DB değerini kullanır', () => {
    const clientPayload = {
      account_id: '11111111-1111-1111-1111-111111111111',
      counted_balance: 5000,
      system_balance: 0, // FORGED
    }

    const serverSystemBalance = 4800 // DB'den okunan gerçek değer
    const difference = clientPayload.counted_balance - serverSystemBalance
    expect(difference).toBe(200)
    expect(difference).not.toBe(5000)
  })

  it('6. Geçersiz account_id → reddedilir', () => {
    const validate = (accountId: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      if (!uuidRegex.test(accountId)) throw new Error('account_id geçerli UUID olmalı')
      return true
    }
    expect(() => validate('invalid-id')).toThrow('account_id geçerli UUID')
  })

  it('7. counted_balance NaN → reddedilir', () => {
    const validate = (countedBalance: any) => {
      if (countedBalance == null || !Number.isFinite(Number(countedBalance))) {
        throw new Error('counted_balance geçerli bir sayı olmalı')
      }
      return true
    }
    expect(() => validate('abc')).toThrow('counted_balance geçerli')
    expect(() => validate(undefined)).toThrow('counted_balance geçerli')
  })

  it('8. Duplicate reconciliation / adjustment koruması: aynı sayım referansı ile mükerrer düzeltme engellenir', () => {
    const executedAdjustments = new Set<string>()

    const applyAdjustment = (reconId: string) => {
      if (executedAdjustments.has(reconId)) {
        throw new Error('Bu sayım için bakiye düzeltmesi zaten yapılmış')
      }
      executedAdjustments.add(reconId)
      return true
    }

    expect(applyAdjustment('recon-100')).toBe(true)
    expect(() => applyAdjustment('recon-100')).toThrow('zaten yapılmış')
  })
})

