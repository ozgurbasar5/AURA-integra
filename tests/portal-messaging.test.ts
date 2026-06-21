import { describe, it, expect } from 'vitest'
import {
  applyPortalTemplate,
  toSmsSafe,
  buildWaMeUrl,
  normalizeWaPhone,
} from '@/lib/portal-messaging'

describe('portal-messaging', () => {
  it('applies template vars', () => {
    const out = applyPortalTemplate('Merhaba {customer}, {portal_link}', {
      customer: 'Ali',
      portal_link: 'https://example.com/p',
    })
    expect(out).toContain('Ali')
    expect(out).toContain('https://example.com/p')
  })

  it('strips emoji from SMS text', () => {
    const out = toSmsSafe('Test mesaji')
    expect(out).not.toMatch(/[\u{1F300}-\u{1FAFF}]/u)
  })

  it('normalizes Turkish phone for wa.me', () => {
    expect(normalizeWaPhone('0532 123 45 67')).toBe('905321234567')
    expect(buildWaMeUrl('05321234567', 'Merhaba')).toContain('wa.me/905321234567')
  })
})
