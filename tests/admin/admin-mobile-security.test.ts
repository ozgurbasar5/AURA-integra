import { describe, it, expect } from 'vitest'
import { canManageTenantSettings } from '@/lib/api-role-guard'
import { isMobileTabAllowed } from '@/lib/role-matrix'

describe('Admin Mobile 2.0 Security & Role Matrix', () => {
  it('strictly restricts settings and organization mutations to authorized roles', () => {
    // Authorized roles
    expect(canManageTenantSettings('tenant_admin')).toBe(true)
    expect(canManageTenantSettings('admin')).toBe(true)
    expect(canManageTenantSettings('mudur')).toBe(true)

    // Unauthorized roles
    expect(canManageTenantSettings('teknisyen')).toBe(false)
    expect(canManageTenantSettings('kasiyer')).toBe(false)
    expect(canManageTenantSettings('satis')).toBe(false)
    expect(canManageTenantSettings('muhasebe')).toBe(false)
    expect(canManageTenantSettings('viewer')).toBe(false)
  })

  it('verifies mobile tab permissions across different roles', () => {
    // Ayarlar tab is strictly restricted to owner roles
    expect(isMobileTabAllowed('ayarlar', 'tenant_admin')).toBe(true)
    expect(isMobileTabAllowed('ayarlar', 'mudur')).toBe(true)
    expect(isMobileTabAllowed('ayarlar', 'teknisyen')).toBe(false)

    // Kabul tab
    expect(isMobileTabAllowed('kabul', 'teknisyen')).toBe(true)
    expect(isMobileTabAllowed('kabul', 'viewer')).toBe(false)

    // Kasa tab
    expect(isMobileTabAllowed('kasa', 'kasiyer')).toBe(true)
    expect(isMobileTabAllowed('kasa', 'teknisyen')).toBe(false)
  })
})
