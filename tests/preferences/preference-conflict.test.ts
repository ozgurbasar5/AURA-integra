import { describe, it, expect } from 'vitest'
import { resolveUserPreferences, type UserPreferences } from '@/lib/user-preferences'

describe('User Preferences 2.0 Conflict Isolation', () => {
  it('updates table preferences without clobbering dashboard widgets', () => {
    const existing: Partial<UserPreferences> = {
      dashboard: {
        widgets: [{ id: 'hero', visible: false, order: 1 }],
      },
      table_preferences: {
        services: { visible_columns: ['job_no', 'status'], page_size: 50 },
      },
    }

    const patch: Partial<UserPreferences> = {
      table_preferences: {
        services: { visible_columns: ['job_no', 'status', 'cost'], page_size: 50 },
      },
    }

    const merged = resolveUserPreferences({ ...existing, ...patch })
    expect(merged.dashboard.widgets[0].visible).toBe(false)
    expect(merged.table_preferences.services.visible_columns).toEqual(['job_no', 'status', 'cost'])
  })

  it('updates theme color mode without clobbering quick action orders', () => {
    const existing: Partial<UserPreferences> = {
      theme: { color_mode: 'light', accent_color: '#0284c7' },
      quick_actions: {
        items: [{ id: 'new_service', visible: true, order: 1 }],
      },
    }

    const patch: Partial<UserPreferences> = {
      theme: { color_mode: 'dark', accent_color: '#0284c7' },
    }

    const merged = resolveUserPreferences({ ...existing, ...patch })
    expect(merged.theme.color_mode).toBe('dark')
    expect(merged.quick_actions.items[0].id).toBe('new_service')
  })
})
