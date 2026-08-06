'use client'

import { AlertTriangle, Clock, ShieldCheck, Zap } from 'lucide-react'
import type { SlaReport } from '@/lib/sla-engine'

interface SlaWidgetProps {
  report: SlaReport
  loading?: boolean
}

export default function SlaWidget({ report, loading = false }: SlaWidgetProps) {
  if (loading) {
    return <div className="card p-4 animate-pulse h-24 bg-slate-50" />
  }

  const hasBreaches = report.breached > 0
  const hasWarnings = report.warning > 0

  return (
    <div className={`card p-4 flex items-center justify-between border-l-4 ${hasBreaches ? 'border-l-red-500 bg-red-50/30' : hasWarnings ? 'border-l-amber-500 bg-amber-50/30' : 'border-l-emerald-500 bg-emerald-50/30'}`}>
      
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-sm
          ${hasBreaches ? 'bg-red-100 text-red-600' : hasWarnings ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
          {hasBreaches ? <AlertTriangle size={20} /> : hasWarnings ? <Clock size={20} /> : <ShieldCheck size={20} />}
        </div>
        <div>
          <h3 className="font-bold text-slate-800 text-sm">SLA Durumu</h3>
          <p className="text-xs text-slate-500 font-medium">
            {hasBreaches 
              ? <span className="text-red-600">{report.breached} ihlal var!</span>
              : hasWarnings
              ? <span className="text-amber-600">{report.warning} riskli cihaz</span>
              : <span className="text-emerald-600">Tüm süreler normal</span>}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-center">
        <div>
          <p className="text-[10px] text-slate-400 font-semibold uppercase">Güvende</p>
          <p className="text-lg font-black text-slate-700">{report.ok}</p>
        </div>
        {report.warning > 0 && (
          <div>
            <p className="text-[10px] text-amber-600/70 font-semibold uppercase">Riskli</p>
            <p className="text-lg font-black text-amber-600">{report.warning}</p>
          </div>
        )}
        {report.breached > 0 && (
          <div>
            <p className="text-[10px] text-red-600/70 font-semibold uppercase">İhlal</p>
            <p className="text-lg font-black text-red-600">{report.breached}</p>
          </div>
        )}
      </div>

    </div>
  )
}
