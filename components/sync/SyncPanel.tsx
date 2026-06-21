'use client'

import { useEffect, useState } from 'react'
import { Cloud, CloudOff, Loader2, RefreshCw, X } from 'lucide-react'
import { getSyncState, subscribeSyncState, type SyncState } from '@/lib/sync-status'
import { flushPendingPush, hydrateFromSupabase } from '@/lib/store-hydrate'

export default function SyncPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, setState] = useState<SyncState>(getSyncState())
  const [busy, setBusy] = useState(false)

  useEffect(() => subscribeSyncState(setState), [])

  if (!open) return null

  async function handleSync() {
    setBusy(true)
    try {
      await hydrateFromSupabase()
      await flushPendingPush()
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-end p-4 bg-slate-900/30 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] shadow-xl p-4 space-y-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm flex items-center gap-2">
            {state.status === 'syncing' ? <Loader2 size={16} className="animate-spin text-sky-500" /> : state.isOnline ? <Cloud size={16} className="text-sky-500" /> : <CloudOff size={16} className="text-red-500" />}
            Senkronizasyon
          </h3>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-muted)]">
            <X size={16} />
          </button>
        </div>

        {!state.isOnline && (
          <div className="text-xs font-semibold text-amber-700 bg-amber-500/10 rounded-lg px-3 py-2">
            Çevrimdışı — değişiklikler bağlantı gelince gönderilecek
          </div>
        )}

        <dl className="text-xs space-y-2">
          <div className="flex justify-between">
            <dt className="text-[var(--text-muted)]">Durum</dt>
            <dd className="font-bold capitalize">{state.status}</dd>
          </div>
          {state.lastSyncAt && (
            <div className="flex justify-between">
              <dt className="text-[var(--text-muted)]">Son sync</dt>
              <dd>{new Date(state.lastSyncAt).toLocaleTimeString('tr-TR')}</dd>
            </div>
          )}
          {state.pendingModules.length > 0 && (
            <div>
              <dt className="text-[var(--text-muted)] mb-1">Bekleyen modüller</dt>
              <dd className="flex flex-wrap gap-1">
                {state.pendingModules.map(m => (
                  <span key={m} className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-700 text-[10px] font-bold">{m}</span>
                ))}
              </dd>
            </div>
          )}
          {state.failedModules.length > 0 && (
            <div>
              <dt className="text-[var(--text-muted)] mb-1">Hatalı modüller</dt>
              <dd className="flex flex-wrap gap-1">
                {state.failedModules.map(m => (
                  <span key={m} className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-700 text-[10px] font-bold">{m}</span>
                ))}
              </dd>
            </div>
          )}
          {state.lastError && (
            <div className="text-red-600 bg-red-500/5 rounded-lg px-3 py-2">{state.lastError}</div>
          )}
        </dl>

        <button
          type="button"
          disabled={busy || state.status === 'syncing'}
          onClick={() => void handleSync()}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          Şimdi senkronize et
        </button>
      </div>
    </div>
  )
}
