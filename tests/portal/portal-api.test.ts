import { describe, it, expect } from 'vitest'
import { createPortalSessionToken, verifyPortalSessionToken } from '@/lib/portal-session'
import { mapDbOrderToCustomerSafeOrder, mapDbWarrantyToCustomerSafeWarranty } from '@/lib/portal-dto'

describe('Portal 2.0 API & Session Foundation', () => {
  const tenantId = '00000000-0000-0000-0000-000000000001'
  const customerPhone = '5321112233'
  const customerName = 'Ahmet Yılmaz'

  it('creates and verifies a valid portal session token', () => {
    const token = createPortalSessionToken({
      tenantId,
      customerPhone,
      customerName,
      ttlSeconds: 3600,
    })

    expect(typeof token).toBe('string')
    expect(token.includes('.')).toBe(true)

    const verification = verifyPortalSessionToken(token, tenantId)
    expect(verification.ok).toBe(true)
    expect(verification.payload?.tenantId).toBe(tenantId)
    expect(verification.payload?.customerPhone).toBe('5321112233')
    expect(verification.payload?.customerName).toBe('Ahmet Yılmaz')
  })

  it('rejects an expired portal session token', () => {
    // Generate token with negative TTL
    const expiredToken = createPortalSessionToken({
      tenantId,
      customerPhone,
      customerName,
      ttlSeconds: -10,
    })

    const verification = verifyPortalSessionToken(expiredToken, tenantId)
    expect(verification.ok).toBe(false)
    expect(verification.error).toContain('dolmuş')
  })

  it('rejects a forged or tampered portal session token', () => {
    const validToken = createPortalSessionToken({
      tenantId,
      customerPhone,
      customerName,
    })

    const tamperedToken = validToken.slice(0, -5) + 'XXXXX'
    const verification = verifyPortalSessionToken(tamperedToken, tenantId)
    expect(verification.ok).toBe(false)
    expect(verification.error).toContain('İmza doğrulanamadı')
  })

  it('rejects token when used for a different tenant', () => {
    const otherTenantId = '00000000-0000-0000-0000-000000000002'
    const token = createPortalSessionToken({
      tenantId,
      customerPhone,
      customerName,
    })

    const verification = verifyPortalSessionToken(token, otherTenantId)
    expect(verification.ok).toBe(false)
    expect(verification.error).toContain('Farklı bayi')
  })
})
