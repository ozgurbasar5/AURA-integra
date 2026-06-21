'use client'

import { useEffect, useState } from 'react'
import ColorModeToggle from '@/components/ColorModeToggle'
import { useUserRole } from '@/lib/role-context'
import { Bell, Cloud, CloudOff, Loader2, Search, HelpCircle } from 'lucide-react'
import Link from 'next/link'
import { getSyncState, subscribeSyncState, type SyncState } from '@/lib/sync-status'
import SyncPanel from '@/components/sync/SyncPanel'

interface Props {
  companyName: string
  onOpenSearch?: () => void
}

function SyncBadge({ state, onClick }: { state: SyncState; onClick: () => void }) {
  const cls = 'flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full cursor-pointer transition-opacity hover:opacity-80'
  if (state.status === 'syncing') {
    return (
      <button type="button" onClick={onClick} className={`${cls} bg-sky-500/10 text-sky-600`} title="Senkronize ediliyor">
        <Loader2 size={11} className="animate-spin shrink-0" />
        <span className="hidden sm:inline">Senkronize</span>
      </button>
    )
  }
  if (state.status === 'pending') {
    return (
      <button type="button" onClick={onClick} className={`${cls} bg-amber-500/10 text-amber-600`} title="Kaydediliyor">
        <Cloud size={11} className="shrink-0" />
        <span className="hidden sm:inline">Bekliyor ({state.pendingCount})</span>
      </button>
    )
  }
  if (state.status === 'error') {
    return (
      <button type="button" onClick={onClick} className={`${cls} bg-red-500/10 text-red-600`} title={state.lastError ?? ''}>
        <CloudOff size={11} className="shrink-0" />
        <span className="hidden sm:inline">Hata</span>
      </button>
    )
  }
  if (state.status === 'synced') {
    return (
      <button type="button" onClick={onClick} className={`${cls} bg-emerald-500/10 text-emerald-600`} title={state.lastSyncAt ?? ''}>
        <Cloud size={11} className="shrink-0" />
        <span className="hidden sm:inline">Senkron</span>
      </button>
    )
  }
  return (
    <button type="button" onClick={onClick} className={`${cls} bg-slate-500/10 text-slate-600`} title="Senkronizasyon">
      <Cloud size={11} className="shrink-0" />
    </button>
  )
}

export default function DashboardHeader({ companyName, onOpenSearch }: Props) {
  const { homeLabel, role } = useUserRole()
  const [syncState, setSyncState] = useState<SyncState>(getSyncState())
  const [syncPanelOpen, setSyncPanelOpen] = useState(false)

  useEffect(() => subscribeSyncState(setSyncState), [])

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-2 sm:gap-4 px-3 sm:px-4 md:px-6 py-3 border-b border-[var(--bg-border)] bg-[var(--bg-card)]/90 backdrop-blur-md no-print safe-top">
      <div className="min-w-0 pl-10 lg:pl-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-sky-500 truncate">{homeLabel}</p>
        <h2 className="text-sm font-bold text-[var(--text-primary)] truncate">{companyName}</h2>
      </div>
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        <SyncBadge state={syncState} onClick={() => setSyncPanelOpen(true)} />
        {onOpenSearch && (
          <button
            type="button"
            onClick={onOpenSearch}
            data-tour="servis-arama"
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-xl border border-[var(--bg-border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
            title="Hızlı arama"
            aria-label="Hızlı arama"
          >
            <Search size={17} />
          </button>
        )}
        <Link
          href="/dashboard/nasil-calisir"
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-[var(--bg-border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] hover:text-sky-600 transition-colors"
          title="Nasıl çalışır?"
        >
          <HelpCircle size={17} />
        </Link>
        <ColorModeToggle />
        <Link
          href="/dashboard/bildirimler"
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-[var(--bg-border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
          title="Bildirimler"
        >
          <Bell size={17} />
        </Link>
        <span className="hidden sm:inline text-[10px] font-bold px-2 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-300 capitalize max-w-[80px] truncate">
          {role.replace('_', ' ')}
        </span>
      </div>
      <SyncPanel open={syncPanelOpen} onClose={() => setSyncPanelOpen(false)} />
    </header>
  )
}
