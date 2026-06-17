import { describe, it, expect } from 'vitest'
import { canPushModule, isKnownPushModule } from '@/lib/api-role-guard'

describe('api-role-guard push modules', () => {
  it('rejects unknown modules', () => {
    expect(isKnownPushModule('madeUpModule')).toBe(false)
    expect(canPushModule('tenant_admin', 'madeUpModule')).toBe(false)
  })

  it('allows tenant_admin for stock', () => {
    expect(isKnownPushModule('stock')).toBe(true)
    expect(canPushModule('tenant_admin', 'stock')).toBe(true)
  })

  it('blocks viewer for stock', () => {
    expect(canPushModule('viewer', 'stock')).toBe(false)
  })
})
