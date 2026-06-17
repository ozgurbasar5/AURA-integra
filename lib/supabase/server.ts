import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { supabaseGlobalOptions } from './fetch'
import { requirePublicSupabaseEnv } from './public-env'

export function createClient() {
  const cookieStore = cookies()
  const { url, anon } = requirePublicSupabaseEnv('Supabase sunucu')

  return createServerClient(url, anon, {
    ...supabaseGlobalOptions,
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          )
        } catch {
          // Server component — read-only, ignore
        }
      },
    },
  })
}
