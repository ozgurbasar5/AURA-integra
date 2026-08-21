import { describe, it, expect } from 'vitest'
import { resolveUserPreferences, type SavedViewConfig } from '@/lib/user-preferences'

describe('Saved Views Preferences', () => {
  it('manages saved views with filters and sort settings', () => {
    const view: SavedViewConfig = {
      id: 'view_1',
      name: 'Benim Açık Servislerim',
      module: 'services',
      filters: { status: 'in_repair', technician_id: 'tech_123' },
      sort_key: 'created_at',
      sort_asc: false,
      visible_columns: ['job_no', 'customer_name', 'status'],
    }

    const resolved = resolveUserPreferences({
      saved_views: [view],
    })

    expect(resolved.saved_views).toHaveLength(1)
    expect(resolved.saved_views[0].name).toBe('Benim Açık Servislerim')
    expect(resolved.saved_views[0].filters.status).toBe('in_repair')
  })
})
