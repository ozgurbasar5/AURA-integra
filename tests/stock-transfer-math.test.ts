import { describe, it, expect } from 'vitest'

/** Şube stok dağılımı: kaynak düş, hedef art; toplam sabit */
function applyBranchTransfer(
  fromQty: number,
  toQty: number,
  qty: number,
): { from: number; to: number; total: number } | { error: string } {
  if (qty <= 0) return { error: 'qty > 0 olmalı' }
  if (fromQty < qty) return { error: 'kaynak yetersiz' }
  const from = fromQty - qty
  const to = toQty + qty
  return { from, to, total: from + to }
}

describe('stock transfer math', () => {
  it('moves qty between branches keeping total', () => {
    const r = applyBranchTransfer(10, 2, 3)
    expect(r).toEqual({ from: 7, to: 5, total: 12 })
  })

  it('rejects overdraw', () => {
    const r = applyBranchTransfer(2, 5, 3)
    expect(r).toEqual({ error: 'kaynak yetersiz' })
  })
})
