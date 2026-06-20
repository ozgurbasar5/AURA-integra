const PRODUCTION_APP_URL = 'https://integra.aurabilisim.net'

/** Sunucu tarafı canonical uygulama kökü — magic link, cron, checkout redirect */
export function getServerAppUrl(fallbackOrigin?: string): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (env) return env.replace(/\/$/, '')

  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
    return PRODUCTION_APP_URL
  }

  const origin = fallbackOrigin?.trim()
  if (origin && !origin.includes('localhost')) return origin.replace(/\/$/, '')

  return 'http://localhost:3000'
}

export function appAuthCallbackUrl(fallbackOrigin?: string, nextPath = '/dashboard'): string {
  const base = getServerAppUrl(fallbackOrigin).replace(/\/$/, '')
  const next = nextPath.startsWith('/') ? nextPath : `/${nextPath}`
  return `${base}/auth/callback?next=${encodeURIComponent(next)}`
}

/** Supabase magic link içindeki redirect_to parametresini prod URL ile düzeltir */
export function fixMagicLinkRedirect(actionLink: string, appUrl: string): string {
  const callback = appAuthCallbackUrl(appUrl, '/dashboard')
  try {
    const url = new URL(actionLink)
    url.searchParams.set('redirect_to', callback)
    return url.toString()
  } catch {
    return actionLink
      .replace(/redirect_to=[^&]*/gi, `redirect_to=${encodeURIComponent(callback)}`)
      .replace(/http:\/\/localhost(?::\d+)?/gi, appUrl.replace(/\/$/, ''))
  }
}

export function appDashboardUrl(fallbackOrigin?: string): string {
  return `${getServerAppUrl(fallbackOrigin)}/dashboard`
}
