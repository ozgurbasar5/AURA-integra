import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseGlobalOptions } from './fetch'
import { getPublicSupabaseEnv, isPublicSupabaseConfigured, requirePublicSupabaseEnv } from './public-env'

export { isPublicSupabaseConfigured as isSupabaseConfigured }

export function createClient(): SupabaseClient {
  const { url, anon } = requirePublicSupabaseEnv('Supabase istemci')
  return createBrowserClient(url, anon, supabaseGlobalOptions)
}

/** SSR/build güvenli — env yoksa null döner */
export function tryCreateClient(): SupabaseClient | null {
  if (!isPublicSupabaseConfigured()) return null
  try {
    return createClient()
  } catch {
    return null
  }
}
