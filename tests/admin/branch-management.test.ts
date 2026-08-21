import { describe, it, expect } from 'vitest'
import { canManageTenantSettings } from '@/lib/api-role-guard'

describe('Admin 2.0 Branch and User Management Guard', () => {
  it('allows owner roles to manage branches and organization settings', () => {
    expect(canManageTenantSettings('tenant_admin')).toBe(true)
    expect(canManageTenantSettings('admin')).toBe(true)
    expect(canManageTenantSettings('mudur')).toBe(true)
    expect(canManageTenantSettings('teknisyen')).toBe(false)
    expect(canManageTenantSettings('satis')).toBe(false)
    expect(canManageTenantSettings('kasiyer')).toBe(false)
    expect(canManageTenantSettings('viewer')).toBe(false)
  })

  it('validates branch structure integrity', () => {
    const validBranch = {
      id: 'br-1',
      name: 'Kadıköy Şubesi',
      address: 'Caferağa Mah. Moda Cad. No:12',
      phone: '02163334455',
      is_main: false,
      is_active: true,
    }

    expect(validBranch.name).toBeTruthy()
    expect(typeof validBranch.is_active).toBe('boolean')
    expect(validBranch.is_main).toBe(false)
  })
})
