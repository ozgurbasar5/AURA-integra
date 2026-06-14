import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { supabaseGlobalOptions } from './fetch'

export function isSupabaseConfigured(): boolean {
  return !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
}

export function createClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'Supabase yapılandırması eksik! .env.local dosyasına NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY ekleyin.'
    )
  }

  return createBrowserClient(url, key, supabaseGlobalOptions)
}

/** SSR/build güvenli — env yoksa null döner */
export function tryCreateClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null
  try {
    return createClient()
  } catch {
    return null
  }
}
