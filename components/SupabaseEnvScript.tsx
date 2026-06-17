import { getPublicSupabaseEnvForInjection } from '@/lib/supabase/public-env'

/** Vercel deploy: build-time NEXT_PUBLIC yerine her istekte güncel env enjekte eder */
export default function SupabaseEnvScript() {
  const payload = getPublicSupabaseEnvForInjection()
  const json = JSON.stringify(payload).replace(/</g, '\\u003c')

  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `window.__AURA_SUPABASE__=${json};`,
      }}
    />
  )
}
