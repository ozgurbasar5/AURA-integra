import { describe, it, expect } from 'vitest'
import {
  SYSTEM_DEFAULT_PREFERENCES,
  getRoleDefaultPreferences,
  resolveUserPreferences,
  type UserPreferences,
} from '@/lib/user-preferences'

describe('User Preferences 2.0 Engine & Hierarchy', () => {
  it('resolves system defaults when no custom preferences provided', () => {
    const resolved = resolveUserPreferences(null, null, null)
    expect(resolved.density).toBe('comfortable')
    expect(resolved.theme.color_mode).toBe('system')
    expect(resolved.dashboard.widgets.length).toBeGreaterThan(0)
    expect(resolved.startup_route).toBe('/dashboard')
  })

  it('generates role-specific default workspaces', () => {
    const tech = getRoleDefaultPreferences('teknisyen')
    expect(tech.startup_route).toBe('/dashboard/atolye')
    expect(tech.dashboard.widgets.some(w => w.id === 'today_activity')).toBe(true)

    const muhasebe = getRoleDefaultPreferences('muhasebe')
    expect(muhasebe.startup_route).toBe('/dashboard/finans')
    expect(muhasebe.dashboard.widgets.some(w => w.id === 'cash_summary')).toBe(true)

    const cashier = getRoleDefaultPreferences('kasiyer')
    expect(cashier.startup_route).toBe('/dashboard/satis')
  })

  it('prioritizes user preference over tenant default and role default', () => {
    const userCustom: Partial<UserPreferences> = {
      density: 'compact',
      startup_route: '/dashboard/kasa',
      theme: { color_mode: 'dark' },
    }
    const tenantDefault: Partial<UserPreferences> = {
      density: 'comfortable',
      startup_route: '/dashboard/atolye',
    }

    const resolved = resolveUserPreferences(userCustom, tenantDefault, 'teknisyen')
    expect(resolved.density).toBe('compact') // User wins
    expect(resolved.startup_route).toBe('/dashboard/kasa') // User wins
    expect(resolved.theme.color_mode).toBe('dark') // User wins
  })
})
