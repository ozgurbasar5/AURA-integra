'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  BarChart3, TrendingUp, Clock, DollarSign, Users,
  Download, FileText, Calendar, Star, AlertTriangle, Inbox, Wallet, ChevronRight,
} from 'lucide-react'
import {
  AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { formatCurrency } from '@/lib/validators'
import { getTransactions, getFinanceSummary, getSales, getStock, getCashShifts, onStoreChange } from '@/lib/store'
import { buildVatReport } from '@/lib/erp-features'

type Tab = 'analitik' | 'gun-sonu'

export default function RaporlarPage() {
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<Tab>('analitik')
  const [closedShifts, setClosedShifts] = useState(() => getCashShifts().filter(s => s.status === 'closed'))
  const [summary, setSummary] = useState({ totalGelir: 0, totalGider: 0, netKar: 0, kasaBakiye: 0, totalStockValue: 0, criticalStockCount: 0, totalStockItems: 0, totalStockQty: 0 })
  const [monthlyData, setMonthlyData] = useState<Array<{ month: string; gelir: number; gider: number }>>([])
  const [categoryData, setCategoryData] = useState<Array<{ name: string; value: number; color: string }>>([])

  const refresh = useCallback(() => {
    setSummary(getFinanceSummary())
    setClosedShifts(getCashShifts().filter(s => s.status === 'closed'))

    // Aylık gelir/gider — gerçek işlemlerden hesapla
    const txs = getTransactions()
    const months: Record<string, { gelir: number; gider: number }> = {}
    const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

    txs.forEach(tx => {
      const d = new Date(tx.date)
      const key = `${d.getFullYear()}-${d.getMonth()}`
      const label = monthNames[d.getMonth()]
      if (!months[key]) months[key] = { gelir: 0, gider: 0 }
      if (tx.type === 'gelir') months[key].gelir += tx.amount
      else months[key].gider += tx.amount
    })

    const sorted = Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([key, val]) => {
        const [, m] = key.split('-')
        return { month: monthNames[parseInt(m)], ...val }
      })
    setMonthlyData(sorted)

    // Kategori dağılımı — gelir kategorileri
    const cats: Record<string, number> = {}
    txs.filter(t => t.type === 'gelir').forEach(t => {
      cats[t.category] = (cats[t.category] || 0) + t.amount
    })
    const colors = ['#6366f1', '#06b6d4', '#f59e0b', '#10b981', '#ec4899', '#94a3b8']
    const catArr = Object.entries(cats)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, value], i) => ({ name, value, color: colors[i] || '#94a3b8' }))
    setCategoryData(catArr)
  }, [])

  useEffect(() => {
    setMounted(true)
    refresh()
    fetch('/api/tenant/reports', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(json => {
        if (json.revenue_by_day?.length) {
          const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
          setMonthlyData(json.revenue_by_day.slice(-12).map((r: { day: string; revenue: number }) => {
            const d = new Date(r.day)
            return { month: monthNames[d.getMonth()], gelir: r.revenue, gider: 0 }
          }))
        }
      })
      .catch(() => {})
    const unsub = onStoreChange(() => refresh())
    return unsub
  }, [refresh])

  if (!mounted) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>

  const hasData = summary.totalGelir > 0 || summary.totalGider > 0
  const salesCount = getSales().length
  const stockItems = getStock().length
  const vatReport = buildVatReport(getTransactions(), getSales())

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <BarChart3 size={20} className="text-sky-600" /> Raporlar & Analitik
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Gerçek verilerinizden oluşan işletme analizi</p>
        </div>
        <div className="flex rounded-xl border border-slate-200 overflow-hidden text-xs font-bold">
          <button
            type="button"
            onClick={() => setTab('analitik')}
            className={`px-4 py-2 ${tab === 'analitik' ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            Analitik
          </button>
          <button
            type="button"
            onClick={() => setTab('gun-sonu')}
            className={`px-4 py-2 flex items-center gap-1.5 ${tab === 'gun-sonu' ? 'bg-sky-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}
          >
            <Wallet size={14} /> Gün Sonu (Vardiya)
          </button>
        </div>
      </div>

      {tab === 'gun-sonu' ? (
        <div className="card p-5">
          <h3 className="font-bold text-slate-900 text-sm mb-1">Kapanmış Vardiyalar</h3>
          <p className="text-[11px] text-slate-400 mb-4">Vardiya kapanış raporlarını görüntüleyin ve yazdırın</p>
          {closedShifts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-10">Henüz kapanmış vardiya yok. Kasa modülünden vardiya kapatın.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {closedShifts.slice(0, 30).map(s => (
                <li key={s.id}>
                  <Link
                    href={`/dashboard/kasa/rapor/${s.id}`}
                    className="flex items-center gap-3 py-3 hover:bg-sky-50/50 px-2 rounded-lg group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                      <FileText size={16} className="text-emerald-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900">
                        {new Date(s.opened_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        {' — '}
                        {s.closed_at ? new Date(s.closed_at).toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit' }) : '—'}
                      </p>
                      <p className="text-xs text-slate-400">{s.opened_by}{s.closed_by ? ` → ${s.closed_by}` : ''}</p>
                    </div>
                    <span className={`text-xs font-bold tabular-nums ${(s.difference ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                      Fark: {formatCurrency(s.difference ?? 0)}
                    </span>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-sky-500" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
      <>

      {/* Metrikler — CANLI VERİ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Gelir', val: formatCurrency(summary.totalGelir), icon: DollarSign, bg: 'from-sky-500 to-purple-600' },
          { label: 'Toplam Gider', val: formatCurrency(summary.totalGider), icon: BarChart3, bg: 'from-blue-500 to-cyan-600' },
          { label: 'Net Kâr', val: formatCurrency(summary.netKar), icon: TrendingUp, bg: 'from-emerald-500 to-green-600' },
          { label: 'Stok Değeri', val: formatCurrency(summary.totalStockValue), icon: Clock, bg: 'from-amber-500 to-orange-600' },
        ].map(m => (
          <div key={m.label} className="card p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
            <div className="flex items-center justify-between mb-3">
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${m.bg} flex items-center justify-center shadow-sm`}>
                <m.icon size={16} className="text-white" />
              </div>
            </div>
            <p className="text-lg font-black text-slate-900 tabular-nums">{m.val}</p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {!hasData ? (
        /* Boş Durum */
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Inbox size={28} className="text-slate-300" />
          </div>
          <p className="text-sm font-semibold text-slate-600 mb-1">Henüz rapor verisi yok</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Finans sayfasından gelir/gider ekledikçe, stok girişi yaptıkça ve satış gerçekleştirdikçe raporlarınız burada otomatik oluşacak.
          </p>
        </div>
      ) : (
        <>
          {/* Grafik Satırı */}
          <div className="grid lg:grid-cols-3 gap-4">
            {/* Gelir/Gider Grafiği */}
            <div className="lg:col-span-2 card p-5">
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

            {/* Gelir Kategori Dağılımı */}
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

          {/* KDV / Vergi Özeti */}
          <div className="card p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-1 flex items-center gap-2">
              <FileText size={16} className="text-sky-600" /> KDV & Vergi Özeti
            </h3>
            <p className="text-[11px] text-slate-400 mb-4">POS ve servis gelirlerinden hesaplanan KDV</p>
            {vatReport.rows.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6">Henüz vergi hesaplanacak kayıt yok</p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-slate-500 border-b border-slate-100">
                        <th className="pb-2 font-bold">Kaynak</th>
                        <th className="pb-2 font-bold text-right">Net</th>
                        <th className="pb-2 font-bold text-right">KDV</th>
                        <th className="pb-2 font-bold text-right">Brüt</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                      {vatReport.rows.map(r => (
                        <tr key={r.source}>
                          <td className="py-2.5 text-slate-800">{r.source}</td>
                          <td className="py-2.5 text-right tabular-nums">{formatCurrency(r.net)}</td>
                          <td className="py-2.5 text-right tabular-nums text-amber-700 font-semibold">{formatCurrency(r.vat)}</td>
                          <td className="py-2.5 text-right tabular-nums font-bold">{formatCurrency(r.gross)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="flex justify-end gap-6 mt-4 pt-3 border-t border-slate-100 text-sm">
                  <span className="text-slate-500">Toplam KDV: <strong className="text-amber-700">{formatCurrency(vatReport.totalVat)}</strong></span>
                  <span className="text-slate-500">Brüt: <strong>{formatCurrency(vatReport.totalGross)}</strong></span>
                </div>
              </>
            )}
          </div>

          {/* Hızlı İstatistikler */}
          <div className="card p-5">
            <h3 className="font-bold text-slate-900 text-sm mb-4">İşletme Özeti</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <p className="text-2xl font-black text-sky-600">{getTransactions().length}</p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase mt-1">Toplam İşlem</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <p className="text-2xl font-black text-blue-600">{salesCount}</p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase mt-1">POS Satış</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <p className="text-2xl font-black text-emerald-600">{stockItems}</p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase mt-1">Stok Çeşidi</p>
              </div>
              <div className="text-center p-3 bg-slate-50 rounded-xl">
                <p className="text-2xl font-black text-amber-600">{summary.criticalStockCount}</p>
                <p className="text-[10px] text-slate-500 font-semibold uppercase mt-1">Kritik Stok</p>
              </div>
            </div>
          </div>
        </>
      )}
      </>
      )}
    </div>
  )
}
