import { describe, it, expect } from 'vitest'
import { resolveUserPreferences } from '@/lib/user-preferences'

describe('User Preferences 2.0 Security & Isolation', () => {
  it('does not allow arbitrary prototype pollution or unwanted properties', () => {
    const maliciousPayload = JSON.parse('{"__proto__": {"isAdmin": true}, "density": "compact"}')
    const resolved = resolveUserPreferences(maliciousPayload, null, 'viewer')

    expect(resolved.density).toBe('compact')
    expect((resolved as any).isAdmin).toBeUndefined()
  })

  it('keeps business logic and permissions isolated from appearance preferences', () => {
    const viewerPrefs = resolveUserPreferences({ density: 'compact' }, null, 'viewer')
    expect(viewerPrefs.density).toBe('compact')
    expect(viewerPrefs.startup_route).toBe('/dashboard')
  })
})
