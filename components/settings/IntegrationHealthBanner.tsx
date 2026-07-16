'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2 } from 'lucide-react'

type Check = { id: string; label: string; ok: boolean; detail: string }

export default function IntegrationHealthBanner() {
  const [checks, setChecks] = useState<Check[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/tenant/integrations/health', { credentials: 'same-origin' })
        if (!res.ok) return
        const json = await res.json() as { checks?: Check[] }
        if (!cancelled) setChecks(json.checks ?? [])
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500 flex items-center gap-2">
        <Loader2 size={14} className="animate-spin" /> Entegrasyon durumu kontrol ediliyor…
      </div>
    )
  }
  if (!checks?.length) return null

  const bad = checks.filter(c => !c.ok)
  return (
    <div
      className={`rounded-xl border px-4 py-3 space-y-2 ${
        bad.length ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'
      }`}
      data-tour="entegrasyon-health"
    >
      <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
        {bad.length ? <AlertTriangle size={16} className="text-amber-600" /> : <CheckCircle2 size={16} className="text-emerald-600" />}
        Entegrasyon sağlığı
        {bad.length ? ` — ${bad.length} uyarı` : ' — tamam'}
      </p>
      <ul className="text-xs space-y-1">
        {checks.map(c => (
          <li key={c.id} className={c.ok ? 'text-emerald-800' : 'text-amber-900'}>
            <strong>{c.label}:</strong> {c.detail}
          </li>
        ))}
      </ul>
    </div>
  )
}
