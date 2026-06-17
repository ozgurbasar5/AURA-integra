'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Clock, Wallet, FileText } from 'lucide-react'
import { getOpenCashShift, getCashShifts, type CashShift } from '@/lib/store'

interface Props {
  shopName: string
}

export function DashboardDayHeader({ shopName }: Props) {
  const [mounted, setMounted] = useState(false)
  const [now, setNow] = useState<Date | null>(null)
  const [openShift, setOpenShift] = useState<CashShift | undefined>()
  const [lastClosed, setLastClosed] = useState<CashShift | undefined>()

  useEffect(() => {
    setMounted(true)
    setNow(new Date())
    setOpenShift(getOpenCashShift())
    setLastClosed(getCashShifts().find(s => s.status === 'closed'))

    const t = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(t)
  }, [])

  if (!mounted || !now) {
    return <div className="surface p-4 mb-6 h-[88px] animate-pulse" aria-hidden />
  }

  const dateStr = now.toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const timeStr = now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="surface p-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <p className="text-xs font-bold text-sky-600 uppercase tracking-wider">{shopName}</p>
        <h2 className="text-lg font-bold text-[var(--text-primary)] capitalize">{dateStr}</h2>
        <p className="text-sm text-[var(--text-muted)] flex items-center gap-1.5 mt-0.5">
          <Clock size={14} /> {timeStr}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        {openShift ? (
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl">
            <Wallet size={16} /> Vardiya açık · {new Date(openShift.opened_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : lastClosed?.closed_at ? (
          <span className="text-sm text-slate-500 px-3 py-2">
            Son kapanış: {new Date(lastClosed.closed_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
          </span>
        ) : null}
        <Link href="/dashboard/kasa" className="btn-secondary btn-sm flex items-center gap-1.5">
          <Wallet size={14} /> Kasa
        </Link>
        {lastClosed && (
          <Link href={`/dashboard/kasa/rapor/${lastClosed.id}`} className="btn-secondary btn-sm flex items-center gap-1.5">
            <FileText size={14} /> Gün Sonu
          </Link>
        )}
      </div>
    </div>
  )
}
