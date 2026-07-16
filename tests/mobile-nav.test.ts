import { describe, it, expect } from 'vitest'
import {
  MOBILE_BOTTOM_TABS,
  isMobileNavActive,
  getMobileBottomTabsForRole,
} from '@/lib/mobile-nav-tabs'

describe('mobile nav tabs', () => {
  it('includes core ops tabs including Kasa', () => {
    const hrefs = MOBILE_BOTTOM_TABS.map(t => t.href)
    expect(hrefs).toContain('/dashboard')
    expect(hrefs).toContain('/dashboard/kabul')
    expect(hrefs).toContain('/dashboard/atolye')
    expect(hrefs).toContain('/dashboard/satis')
    expect(hrefs).toContain('/dashboard/kasa')
    expect(hrefs).toContain('/dashboard/stok/sayim')
  })

  it('marks nested routes active', () => {
    expect(isMobileNavActive('/dashboard', '/dashboard', true)).toBe(true)
    expect(isMobileNavActive('/dashboard/atolye', '/dashboard', true)).toBe(false)
    expect(isMobileNavActive('/dashboard/atolye/xyz', '/dashboard/atolye')).toBe(true)
    expect(isMobileNavActive('/dashboard/satis', '/dashboard/satis')).toBe(true)
  })

  it('filters tabs by role', () => {
    const tech = getMobileBottomTabsForRole('teknisyen').map(t => t.id)
    expect(tech).toContain('atolye')
    expect(tech).not.toContain('satis')
    expect(tech).not.toContain('kasa')

    const cashier = getMobileBottomTabsForRole('kasiyer').map(t => t.id)
    expect(cashier).toContain('kasa')
    expect(cashier).toContain('satis')
    expect(cashier).not.toContain('atolye')
  })
})
