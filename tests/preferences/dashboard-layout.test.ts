import { describe, it, expect } from 'vitest'
import { resolveUserPreferences } from '@/lib/user-preferences'

describe('Dashboard Layout & Widget Customization', () => {
  it('allows hiding and reordering widgets', () => {
    const customWidgets = [
      { id: 'cash_summary', visible: true, order: 1 },
      { id: 'hero', visible: false, order: 2 },
    ]

    const resolved = resolveUserPreferences({
      dashboard: { widgets: customWidgets },
    })

    expect(resolved.dashboard.widgets[0].id).toBe('cash_summary')
    expect(resolved.dashboard.widgets[0].visible).toBe(true)
    expect(resolved.dashboard.widgets[1].id).toBe('hero')
    expect(resolved.dashboard.widgets[1].visible).toBe(false)
  })
})
