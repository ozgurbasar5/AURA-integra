import { describe, it, expect } from 'vitest'
import { canPushModule, isKnownPushModule, isPushDisabledModule } from '@/lib/api-role-guard'

describe('api-role-guard push modules', () => {
  it('rejects unknown modules', () => {
    expect(isKnownPushModule('madeUpModule')).toBe(false)
    expect(canPushModule('tenant_admin', 'madeUpModule')).toBe(false)
  })

  it('allows tenant_admin for todos', () => {
    expect(isKnownPushModule('todos')).toBe(true)
    expect(canPushModule('tenant_admin', 'todos')).toBe(true)
  })

  it('blocks push for API-first stock module', () => {
    expect(isPushDisabledModule('stock')).toBe(true)
    expect(isKnownPushModule('stock')).toBe(false)
    expect(canPushModule('tenant_admin', 'stock')).toBe(false)
  })

  it('blocks viewer for customers', () => {
    expect(canPushModule('viewer', 'customers')).toBe(false)
  })
})
