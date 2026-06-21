import { describe, it, expect } from 'vitest'
import { LANDING_CATEGORIES } from '@/lib/landing-modules'
import { LANDING_PANEL_ROUTES, attachPanelRoutes, countVerifiedModules } from '@/lib/landing-panel-routes'

describe('landing panel route audit', () => {
  const allIds = LANDING_CATEGORIES.flatMap(c => c.modules.map(m => m.id))

  it('maps every homepage module to a panel route', () => {
    const { total, mapped } = countVerifiedModules(allIds)
    expect(mapped).toBe(total)
    expect(total).toBeGreaterThanOrEqual(28)
  })

  it('attachPanelRoutes sets panelHref on all modules', () => {
    for (const cat of LANDING_CATEGORIES) {
      const resolved = attachPanelRoutes(cat.modules)
      for (const mod of resolved) {
        expect(mod.panelHref).toBeTruthy()
        expect(LANDING_PANEL_ROUTES[mod.id]?.href).toBe(mod.panelHref)
      }
    }
  })

  it('only super admin module is platformOnly', () => {
    const platform = Object.entries(LANDING_PANEL_ROUTES).filter(([, v]) => v.platformOnly)
    expect(platform.map(([id]) => id)).toEqual(['admin'])
  })
})
