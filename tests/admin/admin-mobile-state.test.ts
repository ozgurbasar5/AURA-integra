import { describe, it, expect } from 'vitest'
import { sanitizeTenantRole } from '@/lib/tenant-roles'
import { DEFAULT_SERVICE_RULES } from '@/app/api/tenant/service-rules/route'

describe('Admin Mobile 2.0 State Invariants', () => {
  it('sanitizes user role mutations to valid tenant roles', () => {
    expect(sanitizeTenantRole('mudur')).toBe('mudur')
    expect(sanitizeTenantRole('teknisyen')).toBe('teknisyen')
    expect(sanitizeTenantRole('invalid_role')).toBe('viewer') // fallback default is viewer
  })

  it('verifies default service rules schema and defaults', () => {
    expect(DEFAULT_SERVICE_RULES.default_service_fee).toBeGreaterThanOrEqual(0)
    expect(DEFAULT_SERVICE_RULES.warranty_months_default).toBeGreaterThan(0)
    expect(DEFAULT_SERVICE_RULES.numbering_prefixes.service).toBe('SRV-')
    expect(DEFAULT_SERVICE_RULES.numbering_prefixes.customer).toBe('CUST-')
    expect(DEFAULT_SERVICE_RULES.numbering_prefixes.warranty).toBe('WAR-')
  })
})
