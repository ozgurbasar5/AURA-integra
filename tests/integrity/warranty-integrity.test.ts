import { describe, it, expect } from 'vitest'

/**
 * DATABASE INTEGRITY: Warranty & Claims Window Invariants
 */
describe('Database Integrity: Warranty & Claims Invariants', () => {
  const createWarrantyRecord = (months: number, startDate: Date = new Date()) => {
    const expiresAt = new Date(startDate)
    expiresAt.setMonth(expiresAt.getMonth() + months)
    return {
      startDate,
      expiresAt,
      months,
      isExpired: (checkDate: Date = new Date()) => checkDate > expiresAt,
    }
  }

  it('6 aylık garanti süresi doğru hesaplanır ve aktif pencere içinde talep kabul edilir', () => {
    const now = new Date('2026-01-01T10:00:00Z')
    const warranty = createWarrantyRecord(6, now)

    // 3 ay sonra yapılan kontrol (Aktif)
    const checkDate1 = new Date('2026-04-01T10:00:00Z')
    expect(warranty.isExpired(checkDate1)).toBe(false)
  })

  it('Süresi dolmuş garantide (7 ay sonra) talep reddedilir', () => {
    const now = new Date('2026-01-01T10:00:00Z')
    const warranty = createWarrantyRecord(6, now)

    // 7 ay sonra yapılan kontrol (Süresi dolmuş)
    const checkDate2 = new Date('2026-08-01T10:00:00Z')
    expect(warranty.isExpired(checkDate2)).toBe(true)
  })
})
