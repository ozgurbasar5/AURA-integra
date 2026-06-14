'use client'

import { useState } from 'react'
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const genData = (days: number) =>
  Array.from({ length: days }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (days - 1 - i))
    return {
      date: d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
      gelir: Math.floor(Math.random() * 5000) + 1000,
      gider: Math.floor(Math.random() * 2000) + 300,
    }
  })

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-[#18181b] border border-[#27272a] rounded-lg px-3 py-2 text-xs space-y-1">
      <p className="text-zinc-400">{label}</p>
      {payload.map((p: any) => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name === 'gelir' ? 'Gelir: ' : 'Gider: '}
          {Number(p.value).toLocaleString('tr-TR', { style: 'currency', currency: 'TRY' })}
        </p>
      ))}
    </div>
  )
}

export default function DashboardCharts() {
  const [period, setPeriod] = useState<7 | 30>(7)
  const data = genData(period)

  return (
    <div>
      <div className="flex justify-end gap-2 mb-4">
        {([7, 30] as const).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
              period === p ? 'bg-sky-600 text-white' : 'bg-[#18181b] text-zinc-400 border border-[#27272a] hover:text-white'
            }`}
          >
            {p} Gün
          </button>
        ))}
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="gGelir" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gGider" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#f43f5e" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} interval={period === 7 ? 0 : 4} />
            <YAxis tick={{ fontSize: 10, fill: '#71717a' }} axisLine={false} tickLine={false} tickFormatter={v => `₺${(v/1000).toFixed(0)}K`} />
            <Tooltip content={<CustomTooltip />} />
            <Area type="monotone" dataKey="gelir" stroke="#6366f1" strokeWidth={2} fill="url(#gGelir)" />
            <Area type="monotone" dataKey="gider" stroke="#f43f5e" strokeWidth={1.5} fill="url(#gGider)" strokeDasharray="4 2" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
