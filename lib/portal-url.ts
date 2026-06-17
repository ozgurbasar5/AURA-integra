/** Müşteri portalı URL'leri — tek kaynak */

export function normalizePortalSlug(raw: string): string {
  return raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/^-+|-+$/g, '')
}

export function suggestPortalSlug(companyName: string): string {
  if (!companyName.trim()) return ''
  return normalizePortalSlug(
    companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .slice(0, 48),
  )
}

/** Canlı site kökü — tarayıcıda her zaman çalışan origin; özel domain yalnızca DNS aktifse */
export function getPortalPublicBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = process.env.NEXT_PUBLIC_PORTAL_BASE_URL?.trim()
    if (custom) {
      try {
        const customHost = new URL(custom).host
        if (window.location.host === customHost) {
          return custom.replace(/\/$/, '')
        }
      } catch {
        /* geçersiz env */
      }
    }
    return window.location.origin
  }

  const custom = process.env.NEXT_PUBLIC_PORTAL_BASE_URL?.trim()
  if (custom) return custom.replace(/\/$/, '')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (appUrl) return appUrl.replace(/\/$/, '')

  return ''
}

export function isCustomPortalDomainConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_PORTAL_BASE_URL?.trim() && process.env.NEXT_PUBLIC_PORTAL_HOST?.trim())
}

function usesPortalSubdomain(): boolean {
  const host = process.env.NEXT_PUBLIC_PORTAL_HOST?.trim()
  if (!host) return false
  const base = getPortalPublicBaseUrl()
  return base.includes(host)
}

/** Müşteri portalı giriş sayfası — /portal/slug veya takip.auraintegra.com/slug */
export function buildPortalLandingUrl(slug: string): string {
  const s = normalizePortalSlug(slug)
  if (!s) return ''

  const base = getPortalPublicBaseUrl()
  if (!base) return `/portal/${s}`

  if (usesPortalSubdomain()) {
    return `${base}/${s}`
  }
  return `${base}/portal/${s}`
}

/** Servis takip linki (iş emri no ile) */
export function buildPortalTrackingUrl(jobNo: string, shopSlug?: string): string {
  const q = new URLSearchParams({ q: jobNo })
  const s = shopSlug ? normalizePortalSlug(shopSlug) : ''
  if (s) q.set('shop', s)

  const base = getPortalPublicBaseUrl()
  const path = `/takip?${q.toString()}`
  return base ? `${base}${path}` : path
}

/** Ayarlar ekranında gösterilecek URL öneki */
export function getPortalUrlPrefix(): string {
  const base = getPortalPublicBaseUrl()
  if (!base) return '/portal/'

  if (usesPortalSubdomain()) {
    try {
      const u = new URL(base)
      return `${u.host}/`
    } catch {
      return `${base.replace(/^https?:\/\//, '')}/`
    }
  }

  try {
    const u = new URL(base)
    return `${u.host}/portal/`
  } catch {
    return `${base.replace(/^https?:\/\//, '')}/portal/`
  }
}

/** Tam portal URL'si (https://...) */
export function getPortalFullUrl(slug: string): string {
  const url = buildPortalLandingUrl(slug)
  if (url.startsWith('http')) return url
  const base = getPortalPublicBaseUrl()
  return base ? `${base}${url.startsWith('/') ? url : `/${url}`}` : url
}
