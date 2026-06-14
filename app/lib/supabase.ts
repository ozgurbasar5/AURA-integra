// Legacy compat — lazy client (modül import'unda throw etmez)
export { createClient, tryCreateClient, isSupabaseConfigured } from '@/lib/supabase/client'

import type { SupabaseClient } from '@supabase/supabase-js'
import { tryCreateClient } from '@/lib/supabase/client'

let _client: SupabaseClient | null = null

/** Eski import'lar için — ilk kullanımda oluşturulur */
export function getSupabase(): SupabaseClient {
  if (!_client) {
    const c = tryCreateClient()
    if (!c) {
      throw new Error(
        'Supabase yapılandırması eksik! .env.local dosyasına NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY ekleyin.'
      )
    }
    _client = c
  }
  return _client!
}

/** @deprecated getSupabase() kullanın */
export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
