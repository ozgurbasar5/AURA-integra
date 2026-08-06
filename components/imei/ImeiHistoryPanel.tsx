'use client'

import { useState, useEffect } from 'react'
import { AlertTriangle, CheckCircle, Clock, ShieldAlert, Smartphone, User, FileText } from 'lucide-react'
import type { TimelineEntry } from '@/lib/imei-tracker'

interface ImeiHistoryPanelProps {
  imei: string
}

export default function ImeiHistoryPanel({ imei }: ImeiHistoryPanelProps) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<{
    risk: { score: number; flags: string[]; label: string }
    timeline: TimelineEntry[]
  } | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!imei || imei.length < 5) {
      setData(null)
      setLoading(false)
      return
    }

    setLoading(true)
    fetch(`/api/tenant/imei/${imei}`)
      .then(res => res.json())
      .then(json => {
        if (json.ok) {
          setData({ risk: json.risk, timeline: json.timeline })
        } else {
          setError(json.error)
        }
      })
      .catch(() => setError('Geçmiş yüklenemedi'))
      .finally(() => setLoading(false))
  }, [imei])

  if (loading) {
    return <div className="p-4 text-center text-sm text-slate-500 animate-pulse">Geçmiş sorgulanıyor...</div>
  }
  if (error) {
    return <div className="p-4 text-center text-sm text-red-500">{error}</div>
  }
  if (!data) return null

  const isHighRisk = data.risk.score >= 60
  const isRisk = data.risk.score >= 30

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      
      {/* Risk Header */}
      <div className={`p-4 flex items-start gap-4 border-b 
        ${isHighRisk ? 'bg-red-50 border-red-100' : isRisk ? 'bg-amber-50 border-amber-100' : 'bg-emerald-50 border-emerald-100'}`}
      >
        <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0
          ${isHighRisk ? 'bg-red-100 text-red-600' : isRisk ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
          {isHighRisk ? <ShieldAlert size={24} /> : isRisk ? <AlertTriangle size={24} /> : <CheckCircle size={24} />}
        </div>
        <div>
          <h4 className="font-bold text-slate-900 flex items-center gap-2">
            IMEI Risk Analizi
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold uppercase
              ${isHighRisk ? 'bg-red-600 text-white' : isRisk ? 'bg-amber-500 text-white' : 'bg-emerald-500 text-white'}`}>
              {data.risk.label} ({data.risk.score})
            </span>
          </h4>
          <ul className="mt-1 space-y-1">
            {data.risk.flags.map((f, i) => (
              <li key={i} className={`text-sm ${isHighRisk ? 'text-red-700' : isRisk ? 'text-amber-700' : 'text-emerald-700'}`}>
                • {f}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Timeline */}
      <div className="p-4">
        <h5 className="text-xs font-bold text-slate-500 uppercase mb-4">Cihaz Geçmişi ({data.timeline.length} kayıt)</h5>
        {data.timeline.length === 0 ? (
          <p className="text-sm text-slate-400">Sistemde bu cihaza ait geçmiş kayıt bulunmuyor.</p>
        ) : (
          <div className="space-y-4 relative before:absolute before:inset-0 before:ml-2 before:-translate-x-px before:h-full before:w-0.5 before:bg-slate-200">
            {data.timeline.map((entry, idx) => (
              <div key={idx} className="relative flex items-start justify-between gap-3 group">
                <div className="flex items-center justify-center w-5 h-5 rounded-full border-2 border-white bg-sky-100 text-sky-600 shrink-0 z-10 mt-0.5">
                  <Smartphone size={10} />
                </div>
                <div className="w-[calc(100%-2.5rem)] card p-3 shadow-sm border border-slate-100 bg-slate-50/50">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-xs text-slate-800">{entry.title}</span>
                    <time className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock size={10} /> {entry.date}
                    </time>
                  </div>
                  {entry.customer && (
                    <p className="text-[10px] text-slate-500 flex items-center gap-1 mb-1">
                      <User size={10} /> Müşteri: {entry.customer}
                    </p>
                  )}
                  {entry.description && (
                    <p className="text-xs text-slate-600 flex items-start gap-1">
                      <FileText size={10} className="shrink-0 mt-0.5" />
                      {entry.description}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
