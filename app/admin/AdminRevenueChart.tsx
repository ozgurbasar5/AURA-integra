'use client'

import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface ChartPoint { date: string; amount: number }

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs">
      <p className="text-zinc-400 mb-1">{label}</p>
      <p className="text-white font-bold">
        {Number(payload[0].value).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
      </p>
    </div>
  )
}

export default function AdminRevenueChart() {
  const [data, setData] = useState<ChartPoint[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/admin/revenue?days=30', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(json => setData(json.data ?? []))
      .catch(() => setData([]))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">Yükleniyor...</div>
  }

  if (!data.length) {
    return <div className="h-48 flex items-center justify-center text-zinc-500 text-sm">Henüz ödeme kaydı yok</div>
  }

  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="adminGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: '#71717a' }}
            axisLine={false}
            tickLine={false}
            interval={4}
          />
          <YAxis
            tick={{ fontSize: 10, fill: '#71717a' }}
            axisLine={false}
            tickLine={false}
            tickFormatter={v => `₺${(v / 1000).toFixed(0)}K`}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="amount"
            stroke="#6366f1"
            strokeWidth={2}
            fill="url(#adminGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
