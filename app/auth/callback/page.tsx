'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

/** Supabase hash (#access_token) akışı — PKCE code route.ts'te işlenir */
export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function handleHashSession() {
      const hash = typeof window !== 'undefined' ? window.location.hash : ''
      if (!hash || !hash.includes('access_token=')) {
        setError('Geçersiz giriş linki. Yeni link isteyin.')
        return
      }

      const params = new URLSearchParams(hash.replace(/^#/, ''))
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      if (!accessToken || !refreshToken) {
        setError('Oturum bilgisi eksik. Yeni link isteyin.')
        return
      }

      const next = searchParams.get('next') ?? '/dashboard'
      const dest = next.startsWith('/') ? next : `/${next}`

      try {
        const supabase = createClient()
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (sessionError) throw sessionError
        if (cancelled) return

        window.history.replaceState(null, '', `/auth/callback?next=${encodeURIComponent(dest)}`)
        router.replace(dest)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Giriş tamamlanamadı')
      }
    }

    void handleHashSession()
    return () => { cancelled = true }
  }, [router, searchParams])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-6 text-center space-y-4">
          <p className="text-red-600 font-semibold">{error}</p>
          <a href="/login" className="text-sky-600 font-medium hover:underline">Giriş sayfasına dön</a>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
      <Loader2 className="animate-spin text-sky-600" size={32} />
      <p className="text-slate-600 text-sm">Giriş tamamlanıyor…</p>
    </div>
  )
}
