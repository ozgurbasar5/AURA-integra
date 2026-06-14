'use client'

import { useMemo } from 'react'
import { getTransactions } from '@/lib/store'

export function DashboardMiniChart() {
  const data = useMemo(() => {
    const days: { label: string; gelir: number; gider: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const label = d.toLocaleDateString('tr-TR', { weekday: 'short' })
      let gelir = 0, gider = 0
      for (const t of getTransactions()) {
        if (!t.date.startsWith(key)) continue
        if (t.type === 'gelir') gelir += t.amount
        else gider += t.amount
      }
      days.push({ label, gelir, gider })
    }
    return days
  }, [])

  const max = Math.max(1, ...data.map(d => Math.max(d.gelir, d.gider)))

  return (
    <div className="surface p-5">
      <h3 className="font-bold text-sm text-[var(--text-primary)] mb-4">Son 7 Gün Gelir / Gider</h3>
      <div className="flex items-end gap-2 h-24">
        {data.map(d => (
          <div key={d.label} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-0.5 items-end justify-center h-16">
              <div
                className="w-2 bg-emerald-500 rounded-t"
                style={{ height: `${(d.gelir / max) * 100}%`, minHeight: d.gelir > 0 ? 4 : 0 }}
                title={`Gelir: ${d.gelir}`}
              />
              <div
                className="w-2 bg-red-400 rounded-t"
                style={{ height: `${(d.gider / max) * 100}%`, minHeight: d.gider > 0 ? 4 : 0 }}
                title={`Gider: ${d.gider}`}
              />
            </div>
            <span className="text-[9px] text-[var(--text-muted)]">{d.label}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 text-[10px] text-[var(--text-muted)]">
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded" /> Gelir</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-400 rounded" /> Gider</span>
      </div>
    </div>
  )
}
