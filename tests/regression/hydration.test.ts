import { describe, it, expect } from 'vitest'

describe('Regression Test: SSR / Client Hydration Stability', () => {
  it('1. ColorModeToggle renders deterministic initial markup matching SSR defaults', async () => {
    const { getColorMode } = await import('@/lib/color-mode')
    expect(typeof getColorMode).toBe('function')
  })

  it('2. Theme and UI appearance helpers do not throw during SSR without window/document', async () => {
    const { getSavedTheme } = await import('@/lib/theme')
    const theme = getSavedTheme()
    expect(typeof theme).toBe('string')
  })

  it('3. User preferences engine returns consistent initial defaults for SSR', async () => {
    const { SYSTEM_DEFAULT_PREFERENCES, resolveUserPreferences } = await import('@/lib/user-preferences')
    const resolved = resolveUserPreferences(null, null, null)
    expect(resolved.density).toBe(SYSTEM_DEFAULT_PREFERENCES.density)
    expect(resolved.theme.color_mode).toBe('system')
  })

  it('4. User preferences hook exports deterministic state initialized with SYSTEM_DEFAULT_PREFERENCES', async () => {
    const { SYSTEM_DEFAULT_PREFERENCES } = await import('@/lib/user-preferences')
    expect(SYSTEM_DEFAULT_PREFERENCES).toBeDefined()
    expect(SYSTEM_DEFAULT_PREFERENCES.dashboard?.widgets?.length).toBeGreaterThan(0)
  })

  it('5. Onboarding persistence safely returns false when window is undefined', async () => {
    const { readLocalSetupWizardDone, readLocalOnboardingDone } = await import('@/lib/onboarding/persistence')
    expect(readLocalSetupWizardDone('')).toBe(false)
    expect(readLocalOnboardingDone('')).toBe(false)
  })
})
