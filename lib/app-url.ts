const PRODUCTION_APP_URL = 'https://integra.aurabilisim.net'

const PRODUCTION_HOSTS = new Set([
  'integra.aurabilisim.net',
  'takip.auraintegra.com',
  'www.aurabilisim.net',
])

function normalizeBase(url: string): string {
  return url.trim().replace(/\/$/, '')
}

function hostFromOrigin(origin?: string): string | null {
  if (!origin?.trim()) return null
  try {
    return new URL(origin).hostname
  } catch {
    return null
  }
}

/** Sunucu tarafı canonical uygulama kökü — magic link, cron, checkout redirect */
export function getServerAppUrl(fallbackOrigin?: string): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (env) return normalizeBase(env)

  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
    return PRODUCTION_APP_URL
  }

  const origin = fallbackOrigin?.trim()
  const host = hostFromOrigin(origin)
  if (host && PRODUCTION_HOSTS.has(host)) return normalizeBase(origin!)
  if (origin && !origin.includes('localhost')) return normalizeBase(origin)

  return 'http://localhost:3000'
}

/**
 * Magic link / impersonate — localhost'a düşmesin.
 * NEXT_PUBLIC_APP_URL varsa her zaman onu kullanır (lokal admin → prod link).
 */
export function resolveMagicLinkBaseUrl(requestOrigin?: string): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (env) return normalizeBase(env)

  const host = hostFromOrigin(requestOrigin)
  if (host && PRODUCTION_HOSTS.has(host)) {
    return normalizeBase(requestOrigin!)
  }

  if (process.env.VERCEL === '1' || process.env.NODE_ENV === 'production') {
    return PRODUCTION_APP_URL
  }

  const origin = requestOrigin?.trim()
  if (origin?.includes('localhost')) {
    return normalizeBase(origin)
  }

  return PRODUCTION_APP_URL
}

export function buildAuthCallbackUrl(baseUrl: string, nextPath = '/dashboard'): string {
  const base = normalizeBase(baseUrl)
  const next = nextPath.startsWith('/') ? nextPath : `/${nextPath}`
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`
}

export function appAuthCallbackUrl(fallbackOrigin?: string, nextPath = '/dashboard'): string {
  return buildAuthCallbackUrl(getServerAppUrl(fallbackOrigin), nextPath)
}

/** Supabase magic link içindeki redirect_to parametresini prod URL ile düzeltir */
export function fixMagicLinkRedirect(actionLink: string, baseUrl: string): string {
  const callback = buildAuthCallbackUrl(baseUrl, '/dashboard')
  const normalizedBase = normalizeBase(baseUrl)

  try {
    const url = new URL(actionLink)
    url.searchParams.set('redirect_to', callback)
    let fixed = url.toString()
    fixed = fixed.replace(/http:\/\/localhost(?::\d+)?/gi, normalizedBase)
    fixed = fixed.replace(/https:\/\/localhost(?::\d+)?/gi, normalizedBase)
    return fixed
  } catch {
    return actionLink
      .replace(/redirect_to=[^&]*/gi, `redirect_to=${encodeURIComponent(callback)}`)
      .replace(/http:\/\/localhost(?::\d+)?/gi, normalizedBase)
      .replace(/https:\/\/localhost(?::\d+)?/gi, normalizedBase)
  }
}

export function appDashboardUrl(fallbackOrigin?: string): string {
  return `${getServerAppUrl(fallbackOrigin)}/dashboard`
}
