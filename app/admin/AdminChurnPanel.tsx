'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, TrendingDown } from 'lucide-react'

type AtRiskTenant = {
  id: string
  company_name: string
  plan: string
  overdue_amount: number
  subscription_end: string | null
  open_tickets: number
  risk_score: number
}

export default function AdminChurnPanel() {
  const [data, setData] = useState<{
    summary: { at_risk_count: number; overdue_count: number }
    at_risk: AtRiskTenant[]
  } | null>(null)

  useEffect(() => {
    fetch('/api/admin/churn', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
  }, [])

  if (!data?.at_risk?.length) return null

  return (
    <div className="card p-6 border border-amber-500/20 bg-amber-500/5">
      <div className="flex items-center gap-2 mb-4">
        <TrendingDown size={18} className="text-amber-400" />
        <h2 className="text-white font-bold">Churn Riski — {data.summary.at_risk_count} Bayi</h2>
      </div>
      <div className="space-y-2">
        {data.at_risk.slice(0, 5).map(t => (
          <div key={t.id} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{t.company_name}</p>
              <p className="text-xs text-zinc-500">{t.plan} · {t.open_tickets} açık destek</p>
            </div>
            <div className="text-right shrink-0">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                t.risk_score >= 60 ? 'bg-red-500/20 text-red-400' : 'bg-amber-500/20 text-amber-400'
              }`}>
                Risk {t.risk_score}
              </span>
              {t.overdue_amount > 0 && (
                <p className="text-xs text-red-400 mt-1">₺{t.overdue_amount.toLocaleString('tr-TR')} gecikmiş</p>
              )}
            </div>
            <Link href={`/admin/bayiler/preview/${t.id}`} className="text-xs text-sky-400 hover:underline shrink-0">
              İncele
            </Link>
          </div>
        ))}
      </div>
      {data.summary.overdue_count > 0 && (
        <p className="text-xs text-zinc-500 mt-3 flex items-center gap-1">
          <AlertTriangle size={12} /> {data.summary.overdue_count} bayide gecikmiş ödeme var
        </p>
      )}
    </div>
  )
}
