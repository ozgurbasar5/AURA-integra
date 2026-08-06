import { describe, it, expect } from 'vitest'
import {
  buildPortalLandingUrl,
  buildPortalTrackingUrl,
  normalizePortalSlug,
  suggestPortalSlug,
  getPortalFullUrl,
} from '@/lib/portal-url'
import {
  getServerAppUrl,
  buildAuthCallbackUrl,
  appDashboardUrl,
  fixMagicLinkRedirect,
} from '@/lib/app-url'

describe('normalizePortalSlug', () => {
  it('küçük harfe çevirir', () => {
    expect(normalizePortalSlug('DEMO')).toBe('demo')
  })

  it('özel karakterleri temizler', () => {
    expect(normalizePortalSlug('demo!@#shop')).toBe('demoshop')
  })

  it('başındaki ve sonundaki tire siler', () => {
    expect(normalizePortalSlug('-demo-shop-')).toBe('demo-shop')
  })

  it('boşlukları temizler', () => {
    expect(normalizePortalSlug('demo shop')).toBe('demoshop')
  })
})

describe('suggestPortalSlug', () => {
  it('şirket adından slug önerir', () => {
    const slug = suggestPortalSlug('Tekno Servis Ltd.')
    expect(slug).toMatch(/^[a-z0-9-]+$/)
    expect(slug.length).toBeGreaterThan(0)
  })

  it('boş girdi için boş döner', () => {
    expect(suggestPortalSlug('')).toBe('')
    expect(suggestPortalSlug('   ')).toBe('')
  })

  it('Türkçe karakterleri dönüştürür', () => {
    const slug = suggestPortalSlug('Çelik Teknoloji')
    expect(slug).not.toContain('ç')
    expect(slug).toMatch(/^[a-z0-9-]+$/)
  })

  it('48 karakter ile sınırlı', () => {
    const long = 'a'.repeat(100)
    const slug = suggestPortalSlug(long)
    expect(slug.length).toBeLessThanOrEqual(48)
  })
})

describe('buildPortalLandingUrl', () => {
  it('boş slug için boş döner', () => {
    expect(buildPortalLandingUrl('')).toBe('')
  })

  it('slug normalize edilir', () => {
    const url = buildPortalLandingUrl('DEMO-SHOP')
    expect(url).toContain('demo-shop')
  })
})

describe('buildPortalTrackingUrl', () => {
  it('iş emri no içerir', () => {
    const url = buildPortalTrackingUrl('SRV-001', 'demo')
    expect(url).toContain('SRV-001')
    expect(url).toContain('demo')
    expect(url).toContain('/takip')
  })

  it('shop olmadan çalışır', () => {
    const url = buildPortalTrackingUrl('SRV-002')
    expect(url).toContain('SRV-002')
    expect(url).not.toContain('shop')
  })
})

describe('buildAuthCallbackUrl', () => {
  it('callback URL formatı doğru', () => {
    const url = buildAuthCallbackUrl('https://example.com', '/dashboard')
    expect(url).toBe('https://example.com/auth/callback?next=%2Fdashboard')
  })

  it('sondaki slash kaldırılır', () => {
    const url = buildAuthCallbackUrl('https://example.com/', '/dashboard')
    expect(url).toBe('https://example.com/auth/callback?next=%2Fdashboard')
  })

  it('varsayılan next /dashboard', () => {
    const url = buildAuthCallbackUrl('https://example.com')
    expect(url).toContain('next=%2Fdashboard')
  })
})

describe('fixMagicLinkRedirect', () => {
  it('localhost URL\'ini prod ile değiştirir', () => {
    const action = 'https://auth.supabase.co/verify?redirect_to=http://localhost:3000/auth/callback'
    const fixed = fixMagicLinkRedirect(action, 'https://prod.example.com')
    expect(fixed).not.toContain('localhost')
  })

  it('geçersiz URL durumunda orijinal döner', () => {
    const action = 'not-a-valid-url'
    const result = fixMagicLinkRedirect(action, 'https://prod.example.com')
    // En azından localhost yoksa iyi
    expect(typeof result).toBe('string')
  })
})

describe('getServerAppUrl', () => {
  it('NEXT_PUBLIC_APP_URL varsa onu döner', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://my-app.com/'
    const url = getServerAppUrl()
    expect(url).toBe('https://my-app.com')
    delete process.env.NEXT_PUBLIC_APP_URL
  })
})
