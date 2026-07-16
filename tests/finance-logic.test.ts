import { describe, it, expect } from 'vitest'
import { isCariTransaction, CARI_CATEGORIES } from '@/lib/store'

describe('finance logic — cari kategorileri', () => {
  it('Cari Borç ve Cari Tahsilat rapor dışıdır', () => {
    expect(CARI_CATEGORIES).toContain('Cari Borç')
    expect(CARI_CATEGORIES).toContain('Cari Tahsilat')
    expect(isCariTransaction({ category: 'Cari Borç' })).toBe(true)
    expect(isCariTransaction({ category: 'Cari Tahsilat' })).toBe(true)
  })

  it('normal gelir/gider kategorileri rapora dahildir', () => {
    expect(isCariTransaction({ category: 'Satış' })).toBe(false)
    expect(isCariTransaction({ category: 'Servis Teslim' })).toBe(false)
    expect(isCariTransaction({ category: 'Alış' })).toBe(false)
    expect(isCariTransaction({})).toBe(false)
  })
})
