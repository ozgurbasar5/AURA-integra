import { createBrowserClient } from '@supabase/ssr'
import { supabaseGlobalOptions } from './fetch'

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    throw new Error(
      'Supabase yapılandırması eksik! .env.local dosyasına NEXT_PUBLIC_SUPABASE_URL ve NEXT_PUBLIC_SUPABASE_ANON_KEY ekleyin.'
    )
  }

  return createBrowserClient(url, key, supabaseGlobalOptions)
}
