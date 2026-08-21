import { describe, it, expect } from 'vitest'
import { isOwnerRole } from '@/lib/role-matrix'

describe('Admin Mobile 2.0 Engine & Security Guard', () => {
  it('correctly validates owner roles eligible for Mobile Admin Console', () => {
    expect(isOwnerRole('tenant_admin')).toBe(true)
    expect(isOwnerRole('admin')).toBe(true)
    expect(isOwnerRole('mudur')).toBe(true)
    expect(isOwnerRole('owner')).toBe(true)
    expect(isOwnerRole('teknisyen')).toBe(false)
    expect(isOwnerRole('kasiyer')).toBe(false)
    expect(isOwnerRole('satis')).toBe(false)
    expect(isOwnerRole('viewer')).toBe(false)
  })

  it('validates role matrix ownership checks', () => {
    expect(isOwnerRole('tenant_admin')).toBe(true)
    expect(isOwnerRole('mudur')).toBe(true)
    expect(isOwnerRole('teknisyen')).toBe(false)
  })
})
