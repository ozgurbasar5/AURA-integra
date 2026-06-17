/** Tarayıcı + sunucu için Supabase public env (anon key zaten public) */

export type PublicSupabaseEnv = {
  url: string
  anon: string
}

declare global {
  interface Window {
    __AURA_SUPABASE__?: PublicSupabaseEnv
  }
}

const PLACEHOLDER_MARKERS = ['placeholder', 'YOUR_PROJECT', 'your-anon', 'your-service']

function isValidValue(value: string): boolean {
  if (!value || value.length < 8) return false
  const lower = value.toLowerCase()
  return !PLACEHOLDER_MARKERS.some(m => lower.includes(m.toLowerCase()))
}

/** Sunucu: process.env (Vercel runtime). İstemci: layout script + build-time fallback */
export function getPublicSupabaseEnv(): PublicSupabaseEnv | null {
  if (typeof window !== 'undefined') {
    const injected = window.__AURA_SUPABASE__
    if (injected?.url && injected?.anon && isValidValue(injected.url) && isValidValue(injected.anon)) {
      return injected
    }
  }

  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
  const anon = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim()

  if (isValidValue(url) && isValidValue(anon)) {
    return { url, anon }
  }

  return null
}

export function requirePublicSupabaseEnv(context = 'Supabase'): PublicSupabaseEnv {
  const env = getPublicSupabaseEnv()
  if (!env) {
    throw new Error(
      `${context} yapılandırması eksik. Lokal: .env.local | Vercel: Settings → Environment Variables. ` +
        'Git push env taşımaz — deploy sonrası Vercel env kontrol edip Redeploy yapın.'
    )
  }
  return env
}

export function isPublicSupabaseConfigured(): boolean {
  return getPublicSupabaseEnv() !== null
}

/** Layout script için — sunucu process.env (her deploy'da güncel) */
export function getPublicSupabaseEnvForInjection(): PublicSupabaseEnv {
  return {
    url: (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim(),
    anon: (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '').trim(),
  }
}
