import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'

const extra = Constants.expoConfig?.extra ?? {}

export const SUPABASE_URL =
  (process.env.EXPO_PUBLIC_SUPABASE_URL as string | undefined) ||
  (extra.supabaseUrl as string | undefined) ||
  ''

export const SUPABASE_ANON_KEY =
  (process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY as string | undefined) ||
  (extra.supabaseAnonKey as string | undefined) ||
  ''

export const API_BASE_URL =
  (process.env.EXPO_PUBLIC_API_URL as string | undefined) ||
  (extra.apiUrl as string | undefined) ||
  'https://integra.aurabilisim.net'

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY)

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'placeholder',
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
)
