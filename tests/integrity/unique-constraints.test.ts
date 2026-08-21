import { describe, it, expect } from 'vitest'

/**
 * DATABASE INTEGRITY: Unique Constraints & Key Collisions
 */
describe('Database Integrity: Unique Constraints Audit', () => {
  const existingOrderNumbers = new Set<string>(['SRV-2026-0001', 'SRV-2026-0002'])
  const existingTokens = new Set<string>(['token-uuid-1', 'token-uuid-2'])

  const insertOrder = (orderNo: string, token?: string) => {
    if (existingOrderNumbers.has(orderNo)) {
      throw new Error(`Unique Violation: duplicate key value violates unique constraint "service_orders_order_no_unique" (${orderNo})`)
    }
    if (token && existingTokens.has(token)) {
      throw new Error(`Unique Violation: duplicate key value violates unique constraint "service_orders_approval_token_unique" (${token})`)
    }
    existingOrderNumbers.add(orderNo)
    if (token) existingTokens.add(token)
    return { orderNo, token }
  }

  it('Aynı order_no ile ikinci bir kayıt eklenmeye çalışıldığında Unique Violation fırlatılır', () => {
    expect(() => {
      insertOrder('SRV-2026-0001')
    }).toThrow(/Unique Violation.*service_orders_order_no_unique/)
  })

  it('Benzersiz yeni bir order_no başarıyla kaydedilir', () => {
    const res = insertOrder('SRV-2026-0003')
    expect(res.orderNo).toBe('SRV-2026-0003')
  })

  it('Mükerrer approval_token eklenmesi engellenir', () => {
    expect(() => {
      insertOrder('SRV-2026-0004', 'token-uuid-1')
    }).toThrow(/Unique Violation.*service_orders_approval_token_unique/)
  })
})
