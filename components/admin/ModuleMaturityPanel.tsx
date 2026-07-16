'use client'

import { MODULE_MATURITY, maturityBadgeColor, maturitySummary, coreApiFirstReady } from '@/lib/module-maturity'

const BADGE_CLS = {
  green: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20',
  amber: 'bg-amber-500/10 text-amber-700 border-amber-500/20',
  red: 'bg-red-500/10 text-red-700 border-red-500/20',
}

export default function ModuleMaturityPanel({ compact }: { compact?: boolean }) {
  const summary = maturitySummary()
  const coreReady = coreApiFirstReady()
  const coreCount = MODULE_MATURITY.filter(m => m.id !== 'fatura' && m.id !== 'bildirimler').length

  return (
    <div className="space-y-3">
      {!compact && (
        <div className="flex flex-wrap gap-3 text-xs items-center">
          <span className="font-bold text-emerald-600">{summary.green} API-first</span>
          <span className="font-bold text-amber-600">{summary.amber} Hibrit</span>
          <span className="font-bold text-red-600">{summary.red} Yerel/Stub</span>
          {coreReady && (
            <span className="font-bold text-sky-600 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-lg">
              Çekirdek {coreCount}/{coreCount} · %100
            </span>
          )}
        </div>
      )}
      <div className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'}`}>
        {MODULE_MATURITY.map(m => {
          const color = maturityBadgeColor(m)
          const optional = m.id === 'fatura' || m.id === 'bildirimler'
          return (
            <div key={m.id} className={`rounded-xl border px-3 py-2 ${BADGE_CLS[color]}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold">
                  {m.label}
                  {optional ? <span className="font-normal opacity-60"> · opsiyonel</span> : null}
                </span>
                <span className="text-[10px] font-mono opacity-70">{m.apiCoverage}%</span>
              </div>
              {!compact && m.notes && (
                <p className="text-[10px] mt-1 opacity-80">{m.notes}</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
