'use client'

import { useEffect, useState } from 'react'
import { Cloud, CloudOff, Loader2, RefreshCw, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { getSyncState, subscribeSyncState, type SyncState } from '@/lib/sync-status'
import { flushPendingPush, hydrateFromSupabase } from '@/lib/store-hydrate'
import { flushWebQueue, listWebQueuedJobs, type WebQueuedJob } from '@/lib/offline-queue-web'

function getStatusLabel(status: SyncState['status'], isOnline: boolean): { label: string; color: string; icon: React.ReactNode } {
  if (!isOnline || status === 'offline') {
    return { label: 'Çevrimdışı', color: 'text-amber-600 dark:text-amber-400', icon: <CloudOff size={14} className="text-amber-500" /> }
  }
  switch (status) {
    case 'syncing':
      return { label: 'Senkronize ediliyor...', color: 'text-sky-600 dark:text-sky-400', icon: <Loader2 size={14} className="animate-spin text-sky-500" /> }
    case 'synced':
      return { label: 'Senkronize edildi', color: 'text-emerald-600 dark:text-emerald-400', icon: <CheckCircle2 size={14} className="text-emerald-500" /> }
    case 'pending':
      return { label: 'Bekleyen işlemler var', color: 'text-amber-600 dark:text-amber-400', icon: <RefreshCw size={14} className="text-amber-500" /> }
    case 'error':
      return { label: 'Senkronizasyon hatası', color: 'text-red-600 dark:text-red-400', icon: <AlertCircle size={14} className="text-red-500" /> }
    case 'idle':
    default:
      return { label: 'Hazır', color: 'text-slate-600 dark:text-slate-400', icon: <Cloud size={14} className="text-slate-500" /> }
  }
}

export default function SyncPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, setState] = useState<SyncState>(getSyncState())
  const [busy, setBusy] = useState(false)
  const [queue, setQueue] = useState<WebQueuedJob[]>([])

  useEffect(() => subscribeSyncState(setState), [])

  useEffect(() => {
    const sync = () => setQueue(listWebQueuedJobs())
    sync()
    window.addEventListener('aura-web-queue-change', sync)
    return () => window.removeEventListener('aura-web-queue-change', sync)
  }, [])

  if (!open) return null

  const isSyncing = busy || state.status === 'syncing'
  const statusInfo = getStatusLabel(state.status, state.isOnline)

  async function handleSync() {
    if (isSyncing) return
    setBusy(true)
    try {
      const ok = await hydrateFromSupabase(true)
      await flushPendingPush()
      const q = await flushWebQueue()
      if (q.ok > 0 || q.fail > 0) {
        toast.success(`Kuyruk: ${q.ok} gönderildi${q.fail ? `, ${q.fail} bekliyor` : ''}`)
      } else if (ok) {
        toast.success('Senkronizasyon tamamlandı')
      }
      setQueue(listWebQueuedJobs())
    } catch {
      toast.error('Senkronizasyon sırasında hata oluştu')
    } finally {
      setBusy(false)
    }
  }

  async function flushQueueOnly() {
    if (busy) return
    setBusy(true)
    try {
      const q = await flushWebQueue()
      setQueue(q.remaining)
      toast.message(`Kuyruk: ${q.ok} ok, ${q.fail} hata`)
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
            {isSyncing ? <Loader2 size={16} className="animate-spin text-sky-500" /> : state.isOnline ? <Cloud size={16} className="text-sky-500" /> : <CloudOff size={16} className="text-red-500" />}
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
          <div className="flex justify-between items-center">
            <dt className="text-[var(--text-muted)]">Durum</dt>
            <dd className={`font-bold flex items-center gap-1.5 ${statusInfo.color}`}>
              {statusInfo.icon}
              <span>{statusInfo.label}</span>
            </dd>
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
            <div className="text-red-600 bg-red-500/5 rounded-lg px-3 py-2 font-medium">{state.lastError}</div>
          )}
        </dl>

        {queue.length > 0 && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 space-y-2">
            <p className="text-xs font-bold text-amber-800 dark:text-amber-300">
              Çevrimdışı kuyruk · {queue.length} işlem
            </p>
            <ul className="text-[11px] text-[var(--text-muted)] space-y-1 max-h-24 overflow-y-auto">
              {queue.slice(0, 6).map(job => (
                <li key={job.id}>{job.label || job.path}</li>
              ))}
            </ul>
            <button
              type="button"
              disabled={busy}
              onClick={() => void flushQueueOnly()}
              className="btn-secondary w-full text-xs"
            >
              Kuyruğu gönder
            </button>
          </div>
        )}

        <button
          type="button"
          disabled={isSyncing}
          onClick={() => void handleSync()}
          className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {isSyncing ? 'Senkronize ediliyor...' : 'Şimdi senkronize et'}
        </button>
      </div>
    </div>
  )
}

