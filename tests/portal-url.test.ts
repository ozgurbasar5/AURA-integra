import { describe, it, expect } from 'vitest'
import { normalizePortalSlug, suggestPortalSlug } from '@/lib/portal-url'

describe('portal-url', () => {
  it('normalizePortalSlug strips invalid chars', () => {
    expect(normalizePortalSlug('  Summit-Tech!  ')).toBe('summit-tech')
    expect(normalizePortalSlug('---')).toBe('')
  })

  it('suggestPortalSlug derives slug from company name', () => {
    expect(suggestPortalSlug('Summit Teknoloji')).toBe('summit-teknoloji')
    expect(suggestPortalSlug('')).toBe('')
  })
})
