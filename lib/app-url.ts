const PRODUCTION_APP_URL = 'https://integra.aurabilisim.net'

/** Sunucu tarafı canonical uygulama kökü — magic link, cron, checkout redirect */
export function getServerAppUrl(fallbackOrigin?: string): string {
  const env = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (env) return env.replace(/\/$/, '')

  if (process.env.NODE_ENV === 'production' || process.env.VERCEL === '1') {
    return PRODUCTION_APP_URL
  }

  const origin = fallbackOrigin?.trim()
  if (origin) return origin.replace(/\/$/, '')

  return 'http://localhost:3000'
}

/** Supabase magic link içindeki redirect_to parametresini prod URL ile düzeltir */
export function fixMagicLinkRedirect(actionLink: string, appUrl: string): string {
  try {
    const url = new URL(actionLink)
    url.searchParams.set('redirect_to', `${appUrl.replace(/\/$/, '')}/dashboard`)
    return url.toString()
  } catch {
    return actionLink
  }
}

export function appDashboardUrl(fallbackOrigin?: string): string {
  return `${getServerAppUrl(fallbackOrigin)}/dashboard`
}
