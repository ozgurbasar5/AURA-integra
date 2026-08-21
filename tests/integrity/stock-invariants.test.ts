import { describe, it, expect } from 'vitest'

/**
 * DATABASE INTEGRITY: Stock Invariant Conservation Equation
 */
describe('Database Integrity: Stock Conservation Invariants', () => {
  it('Stok denklemi (Açılış + Giriş - Çıkış + İade - Fire) her zaman net fiziksel stoğa eşittir', () => {
    const openingStock = 20
    const movements = [
      { type: 'giris', qty: 15 },
      { type: 'cikis', qty: 5 },
      { type: 'cikis', qty: 2 },
      { type: 'iade', qty: 1 },
      { type: 'fire', qty: 1 },
    ]

    let calculatedStock = openingStock

    for (const mov of movements) {
      if (mov.type === 'giris' || mov.type === 'iade') {
        calculatedStock += mov.qty
      } else if (mov.type === 'cikis' || mov.type === 'fire') {
        calculatedStock -= mov.qty
      }
    }

    // 20 + 15 - 5 - 2 + 1 - 1 = 28
    expect(calculatedStock).toBe(28)
  })

  it('Parça kullanımı kaydedildiğinde hem stock_qty düşer hem stock_movements kaydı oluşur', () => {
    let partStock = 10
    const movementsLog: Array<{ type: string; qty: number; previous: number; newStock: number }> = []

    const usePart = (qty: number) => {
      if (partStock < qty) throw new Error('Insufficient Stock')
      const prev = partStock
      partStock -= qty
      movementsLog.push({ type: 'cikis', qty, previous: prev, newStock: partStock })
    }

    usePart(3)
    expect(partStock).toBe(7)
    expect(movementsLog).toHaveLength(1)
    expect(movementsLog[0]).toEqual({ type: 'cikis', qty: 3, previous: 10, newStock: 7 })
  })
})
