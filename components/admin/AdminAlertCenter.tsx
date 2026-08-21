'use client'

import React from 'react'
import Link from 'next/link'
import {
  AlertTriangle, AlertCircle, Info, ChevronRight,
  CheckCircle2, Bell, RefreshCw
} from 'lucide-react'
import type { AdminAlert } from '@/lib/admin-center'

interface Props {
  alerts: AdminAlert[]
  onRefresh?: () => void
}

export function AdminAlertCenter({ alerts, onRefresh }: Props) {
  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-emerald-200">Tüm Sistemler Normal</p>
            <p className="text-xs text-emerald-400/80">Kritik stok veya bekleyen işlem uyarısı bulunmuyor.</p>
          </div>
        </div>
        {onRefresh && (
          <button onClick={onRefresh} className="btn btn-ghost btn-sm text-emerald-400 hover:text-emerald-300">
            <RefreshCw size={14} />
          </button>
        )}
      </div>
    )
  }

  const criticals = alerts.filter(a => a.severity === 'critical')
  const warnings = alerts.filter(a => a.severity === 'warning')
  const infos = alerts.filter(a => a.severity === 'info')

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/90 overflow-hidden shadow-xl">
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Bell size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Alert Center
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                {alerts.length} Uyarı
              </span>
            </h3>
          </div>
        </div>
        {onRefresh && (
          <button onClick={onRefresh} className="btn-ghost btn-sm text-zinc-400 hover:text-white" title="Yenile">
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      <div className="divide-y divide-zinc-800/60 max-h-80 overflow-y-auto">
        {criticals.map(alert => (
          <Link
            key={alert.id}
            href={alert.href}
            className="p-3.5 flex items-start justify-between gap-3 hover:bg-red-500/5 transition-colors group"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-1.5 rounded-lg bg-red-500/20 text-red-400 shrink-0 mt-0.5">
                <AlertTriangle size={15} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-red-300">{alert.title}</span>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                    Kritik
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{alert.description}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-zinc-600 group-hover:text-red-400 transition-colors shrink-0 mt-1" />
          </Link>
        ))}

        {warnings.map(alert => (
          <Link
            key={alert.id}
            href={alert.href}
            className="p-3.5 flex items-start justify-between gap-3 hover:bg-amber-500/5 transition-colors group"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400 shrink-0 mt-0.5">
                <AlertCircle size={15} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-300">{alert.title}</span>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Uyarı
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{alert.description}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-zinc-600 group-hover:text-amber-400 transition-colors shrink-0 mt-1" />
          </Link>
        ))}

        {infos.map(alert => (
          <Link
            key={alert.id}
            href={alert.href}
            className="p-3.5 flex items-start justify-between gap-3 hover:bg-sky-500/5 transition-colors group"
          >
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 shrink-0 mt-0.5">
                <Info size={15} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-sky-300">{alert.title}</span>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">
                    Bilgi
                  </span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{alert.description}</p>
              </div>
            </div>
            <ChevronRight size={16} className="text-zinc-600 group-hover:text-sky-400 transition-colors shrink-0 mt-1" />
          </Link>
        ))}
      </div>
    </div>
  )
}
