import { describe, it, expect } from 'vitest'
import { isFeatureEnabled } from '@/lib/feature-flags'
import type { TenantFeatureFlags } from '@/lib/feature-flags'

describe('isFeatureEnabled', () => {
  const flags: TenantFeatureFlags = {
    sms: true,
    portal: false,
    whatsapp: true,
    efatura: false,
  }

  it('true olan flag → enabled', () => {
    expect(isFeatureEnabled(flags, 'sms')).toBe(true)
    expect(isFeatureEnabled(flags, 'whatsapp')).toBe(true)
  })

  it('false olan flag → disabled', () => {
    expect(isFeatureEnabled(flags, 'portal')).toBe(false)
    expect(isFeatureEnabled(flags, 'efatura')).toBe(false)
  })

  it('undefined olan flag → enabled (varsayılan açık)', () => {
    const emptyFlags: TenantFeatureFlags = {}
    expect(isFeatureEnabled(emptyFlags, 'sms')).toBe(true)
    expect(isFeatureEnabled(emptyFlags, 'portal')).toBe(true)
  })
})
