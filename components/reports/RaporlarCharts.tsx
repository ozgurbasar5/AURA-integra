'use client'

import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { formatCurrency } from '@/lib/validators'

type MonthlyPoint = { month: string; gelir: number; gider: number }
type CategoryPoint = { name: string; value: number; color: string }

type Props = {
  monthlyData: MonthlyPoint[]
  categoryData: CategoryPoint[]
}

export default function RaporlarCharts({ monthlyData, categoryData }: Props) {
  return (
    <div className="grid lg:grid-cols-3 gap-4">
      <div data-tour="rapor-trend-grafik" className="lg:col-span-2 card p-5">
        <h3 className="font-bold text-slate-900 text-sm mb-1">Gelir vs Gider Trendi</h3>
        <p className="text-[11px] text-slate-400 mb-4">Aylık karşılaştırma — gerçek verileriniz</p>
        {monthlyData.length > 0 ? (
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={monthlyData}>
              <defs>
                <linearGradient id="rptGelir" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="rptGider" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}K`} />
              <Tooltip formatter={(v) => [formatCurrency(Number(v)), '']} />
              <Area type="monotone" dataKey="gelir" stroke="#10b981" strokeWidth={2} fill="url(#rptGelir)" name="Gelir" />
              <Area type="monotone" dataKey="gider" stroke="#f87171" strokeWidth={2} fill="url(#rptGider)" name="Gider" />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-40 text-xs text-slate-400">Henüz aylık veri yok</div>
        )}
      </div>

      <div className="card p-5">
        <h3 className="font-bold text-slate-900 text-sm mb-1">Gelir Kaynakları</h3>
        <p className="text-[11px] text-slate-400 mb-3">Kategori bazlı gelir dağılımı</p>
        {categoryData.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie data={categoryData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                  {categoryData.map(b => <Cell key={b.name} fill={b.color} />)}
                </Pie>
                <Tooltip formatter={(v) => [formatCurrency(Number(v)), 'Tutar']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 gap-1 mt-2">
              {categoryData.map(b => (
                <div key={b.name} className="flex items-center gap-1.5 text-[10px]">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: b.color }} />
                  <span className="text-slate-600 truncate">{b.name}</span>
                  <span className="ml-auto font-bold text-slate-900">{formatCurrency(b.value)}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-40 text-xs text-slate-400">Henüz gelir kaydı yok</div>
        )}
      </div>
    </div>
  )
}
