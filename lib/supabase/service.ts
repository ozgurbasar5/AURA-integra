import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { supabaseGlobalOptions } from './fetch'
import { getPublicSupabaseEnv } from './public-env'

let cachedClient: SupabaseClient | null = null

export function getServiceClient(): SupabaseClient | null {
  if (cachedClient) return cachedClient

  const env = getPublicSupabaseEnv()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!env || !key) return null

  cachedClient = createClient(env.url, key, {
    ...supabaseGlobalOptions,
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return cachedClient
}

