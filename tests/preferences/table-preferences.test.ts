import { describe, it, expect } from 'vitest'
import { resolveUserPreferences } from '@/lib/user-preferences'

describe('Table Preferences', () => {
  it('stores column visibility and pagination settings', () => {
    const resolved = resolveUserPreferences({
      table_preferences: {
        services: {
          visible_columns: ['job_no', 'customer_name', 'status'],
          page_size: 50,
          density: 'compact',
        },
      },
    })

    expect(resolved.table_preferences.services.visible_columns).toEqual(['job_no', 'customer_name', 'status'])
    expect(resolved.table_preferences.services.page_size).toBe(50)
    expect(resolved.table_preferences.services.density).toBe('compact')
  })
})
