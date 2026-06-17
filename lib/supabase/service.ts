import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseGlobalOptions } from './fetch'
import { getPublicSupabaseEnv } from './public-env'

export function getServiceClient(): SupabaseClient | null {
  const env = getPublicSupabaseEnv()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!env || !key) return null

  return createClient(env.url, key, {
    ...supabaseGlobalOptions,
    auth: { autoRefreshToken: false, persistSession: false },
  })
}
