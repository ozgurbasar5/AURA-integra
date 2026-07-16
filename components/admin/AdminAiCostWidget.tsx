'use client'

import { useEffect, useState } from 'react'
import { Bot, Loader2 } from 'lucide-react'

type AiCostSummary = {
  month_messages: number
  month_tokens: number
  estimated_usd: number
  tenants_using: number
}

/** AI maliyet / kullanım özeti — docs/AI-COST-PLAN.md */
export default function AdminAiCostWidget() {
  const [data, setData] = useState<AiCostSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/ai-cost', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(json => {
        if (json.ok) setData(json)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="card p-5">
      <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
        <Bot size={16} className="text-sky-400" /> AI kullanım (bu ay)
      </h2>
      {loading ? (
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
          <Loader2 size={14} className="animate-spin" /> Yükleniyor…
        </div>
      ) : data ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-2xl font-black text-white tabular-nums">{data.month_messages}</p>
            <p className="text-[10px] uppercase text-zinc-500 font-semibold">Mesaj</p>
          </div>
          <div>
            <p className="text-2xl font-black text-emerald-400 tabular-nums">
              ${data.estimated_usd.toFixed(2)}
            </p>
            <p className="text-[10px] uppercase text-zinc-500 font-semibold">Tahmini maliyet</p>
          </div>
          <div>
            <p className="text-lg font-bold text-zinc-200 tabular-nums">
              {(data.month_tokens / 1000).toFixed(1)}k
            </p>
            <p className="text-[10px] uppercase text-zinc-500 font-semibold">Token</p>
          </div>
          <div>
            <p className="text-lg font-bold text-zinc-200 tabular-nums">{data.tenants_using}</p>
            <p className="text-[10px] uppercase text-zinc-500 font-semibold">Aktif bayi</p>
          </div>
        </div>
      ) : (
        <p className="text-zinc-500 text-sm">Veri yok — ai_usage_logs boş olabilir</p>
      )}
    </div>
  )
}
