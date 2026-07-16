'use client'

import { useCallback, useEffect, useState } from 'react'
import { WifiOff, RefreshCw, X } from 'lucide-react'

type HealthJson = {
  ok?: boolean
  hint?: string | null
  reachability?: { ok?: boolean; latency_ms?: number | null }
}

/** Bayi / login — Supabase erişilemezse görünür uyarı (DNS/TLS/aile filtresi) */
export default function ConnectionStatusBanner({ compact }: { compact?: boolean }) {
  const [down, setDown] = useState(false)
  const [hint, setHint] = useState<string | null>(null)
  const [checking, setChecking] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const check = useCallback(async () => {
    setChecking(true)
    try {
      const res = await fetch('/api/health/supabase', { cache: 'no-store' })
      const json = (await res.json()) as HealthJson
      const reachable = json.ok !== false && json.reachability?.ok !== false
      setDown(!reachable)
      setHint(json.hint || null)
      if (reachable) setDismissed(false)
    } catch {
      setDown(true)
      setHint('Sunucu sağlık kontrolüne ulaşılamadı.')
    } finally {
      setChecking(false)
    }
  }, [])

  useEffect(() => {
    void check()
    const id = window.setInterval(() => void check(), 60_000)
    const onOnline = () => void check()
    window.addEventListener('online', onOnline)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('online', onOnline)
    }
  }, [check])

  if (!down || dismissed) return null

  return (
    <div
      role="alert"
      className={`no-print shrink-0 border-b border-amber-300/80 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 text-amber-950 ${
        compact ? 'px-3 py-2' : 'px-4 py-2.5'
      }`}
    >
      <div className="flex items-start gap-3 max-w-6xl mx-auto">
        <WifiOff size={18} className="text-amber-700 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0 text-sm">
          <p className="font-bold">Bulut bağlantısı kurulamadı</p>
          <p className="text-amber-900/80 text-xs mt-0.5 leading-relaxed">
            {hint ||
              'Supabase’e ulaşılamıyor. DNS önbelleği veya aile filtresi (SafeSearch) adresi yanlış IP’ye yönlendirebilir. Yönetici PowerShell: ipconfig /flushdns'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void check()}
          disabled={checking}
          className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-lg bg-amber-200/80 hover:bg-amber-300 text-amber-950 shrink-0"
        >
          <RefreshCw size={12} className={checking ? 'animate-spin' : ''} />
          Tekrar dene
        </button>
        <button
          type="button"
          aria-label="Kapat"
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg text-amber-800/70 hover:bg-amber-200/60 shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )
}
