'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  DollarSign, TrendingUp, TrendingDown, Plus, Search, Download,
  ArrowUpCircle, ArrowDownCircle, CreditCard, Banknote, Building2,
  X, Filter, Calendar, ChevronRight, Wallet
} from 'lucide-react'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { PAYMENT_METHODS, INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '@/lib/constants'
import { formatCurrency, formatRelativeTime } from '@/lib/validators'
import {
  getTransactions, getFinanceSummary, addTransactionViaApi, onStoreChange,
  type FinanceTransaction
} from '@/lib/store'

// Chart data computed from real transactions
function computeMonthlyChart(transactions: FinanceTransaction[]) {
  const monthNames = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
  const months: Record<string, { month: string; gelir: number; gider: number }> = {}
  transactions.forEach(tx => {
    const d = new Date(tx.date)
    const key = `${d.getFullYear()}-${String(d.getMonth()).padStart(2, '0')}`
    if (!months[key]) months[key] = { month: monthNames[d.getMonth()], gelir: 0, gider: 0 }
    if (tx.type === 'gelir') months[key].gelir += tx.amount
    else months[key].gider += tx.amount
  })
  return Object.entries(months).sort(([a], [b]) => a.localeCompare(b)).slice(-6).map(([, v]) => v)
}


const PAYMENT_ICONS: Record<string, typeof CreditCard> = {
  nakit: Banknote, kredi_karti: CreditCard, havale: Building2, eft: Building2, veresiye: Wallet,
}

function FinansTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number }>; label?: string }) {
  if (!active || !payload) return null
  return (
    <div className="bg-slate-900 text-white rounded-lg px-3 py-2 text-xs shadow-xl border border-slate-700">
      <p className="font-bold mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className={p.name === 'gelir' ? 'text-emerald-300' : 'text-red-300'}>
          {p.name === 'gelir' ? 'Gelir' : 'Gider'}: {formatCurrency(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function FinansPage() {
  const [transactions, setTransactions] = useState<FinanceTransaction[]>([])
  const [summary, setSummary] = useState({ totalGelir: 0, totalGider: 0, netKar: 0, kasaBakiye: 0, totalStockValue: 0, criticalStockCount: 0, totalStockItems: 0, totalStockQty: 0 })
  const [typeFilter, setTypeFilter] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState<'gelir' | 'gider'>('gelir')
  const [mounted, setMounted] = useState(false)
  const [formData, setFormData] = useState({ description: '', category: '', amount: '', payment_method: 'nakit', date: '', note: '' })

  const refresh = useCallback(() => {
    setTransactions(getTransactions())
    setSummary(getFinanceSummary())
  }, [])

  useEffect(() => {
    setMounted(true)
    refresh()
    const unsub = onStoreChange((mod) => {
      if (mod === 'finance' || mod === 'stock' || mod === 'sales') refresh()
    })
    return unsub
  }, [refresh])

  if (!mounted) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>

  const filtered = typeFilter ? transactions.filter(t => t.type === typeFilter) : transactions
  const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  const chartData = computeMonthlyChart(transactions)

  const handleSave = async () => {
    if (!formData.description.trim() || !formData.amount) {
      toast.error('Açıklama ve tutar zorunlu')
      return
    }
    try {
      await addTransactionViaApi({
        type: modalType,
        description: formData.description.trim(),
        category: formData.category || (modalType === 'gelir' ? INCOME_CATEGORIES[0] : EXPENSE_CATEGORIES[0]),
        amount: parseFloat(formData.amount),
        payment_method: formData.payment_method,
        date: formData.date ? new Date(formData.date).toISOString() : new Date().toISOString(),
      })
      toast.success(`${modalType === 'gelir' ? 'Gelir' : 'Gider'} kaydedildi — ${formatCurrency(parseFloat(formData.amount))}`)
      setShowModal(false)
      setFormData({ description: '', category: '', amount: '', payment_method: 'nakit', date: '', note: '' })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Kayıt başarısız')
    }
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div data-tour="finans-baslik" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <DollarSign size={20} className="text-sky-600" /> Finans & Kasa
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">Gelir, gider, kasa ve cari hesap yönetimi</p>
        </div>
        <div className="flex gap-2">
          <button data-tour="finans-gelir-btn" onClick={() => { setModalType('gelir'); setShowModal(true) }}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition-all">
            <ArrowUpCircle size={14} /> Gelir Ekle
          </button>
          <button data-tour="finans-gider-btn" onClick={() => { setModalType('gider'); setShowModal(true) }}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition-all">
            <ArrowDownCircle size={14} /> Gider Ekle
          </button>
        </div>
      </div>

      {/* Metrikler — CANLI VERİ */}
      <div data-tour="finans-metrikler" className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Gelir', val: formatCurrency(summary.totalGelir), icon: TrendingUp, bg: 'from-emerald-500 to-green-600', up: true },
          { label: 'Toplam Gider', val: formatCurrency(summary.totalGider), icon: TrendingDown, bg: 'from-red-500 to-rose-600', up: false },
          { label: 'Net Kâr', val: formatCurrency(summary.netKar), icon: DollarSign, bg: summary.netKar >= 0 ? 'from-sky-500 to-purple-600' : 'from-red-500 to-rose-600', up: summary.netKar >= 0 },
          { label: 'Kasa Bakiye', val: formatCurrency(summary.kasaBakiye), icon: Wallet, bg: 'from-amber-500 to-orange-600', up: true },
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

      {/* Grafik */}
      <div data-tour="finans-grafik" className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">Gelir vs Gider (6 Ay)</h3>
            <p className="text-[11px] text-slate-400">Aylık karşılaştırma</p>
          </div>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Gelir</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-red-400" /> Gider</span>
          </div>
        </div>
        {chartData.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="fillGelir" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillGider" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f87171" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#f87171" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="month" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `${v / 1000}K`} />
            <Tooltip content={<FinansTooltip />} />
            <Area type="monotone" dataKey="gelir" stroke="#10b981" strokeWidth={2} fill="url(#fillGelir)" />
            <Area type="monotone" dataKey="gider" stroke="#f87171" strokeWidth={2} fill="url(#fillGider)" />
          </AreaChart>
        </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-40 text-xs text-slate-400">
            İşlem ekledikçe grafik burada görünecek
          </div>
        )}
      </div>

      {/* Filtre */}
      <div className="card p-3 flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-slate-100 rounded-lg p-0.5">
          {[{ key: '', label: 'Tümü' }, { key: 'gelir', label: '↑ Gelir' }, { key: 'gider', label: '↓ Gider' }].map(f => (
            <button key={f.key} onClick={() => setTypeFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${typeFilter === f.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-slate-400 ml-auto">{sorted.length} işlem</span>
      </div>

      {/* İşlem tablosu */}
      <div data-tour="finans-tablo" className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-slate-500 uppercase">TİP</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-slate-500 uppercase">AÇIKLAMA</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-slate-500 uppercase">KATEGORİ</th>
              <th className="text-left py-3 px-4 text-[10px] font-semibold text-slate-500 uppercase">ÖDEME</th>
              <th className="text-right py-3 px-4 text-[10px] font-semibold text-slate-500 uppercase">TUTAR</th>
              <th className="text-right py-3 px-4 text-[10px] font-semibold text-slate-500 uppercase">TARİH</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sorted.map(t => {
              const PayIcon = PAYMENT_ICONS[t.payment_method] || Wallet
              const pm = PAYMENT_METHODS[t.payment_method as keyof typeof PAYMENT_METHODS]
              return (
                <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${t.type === 'gelir' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                      {t.type === 'gelir' ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}
                      {t.type === 'gelir' ? 'Gelir' : 'Gider'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <p className="text-xs font-semibold text-slate-900">{t.description}</p>
                    {t.customer_name && <p className="text-[10px] text-slate-400">{t.customer_name} {t.order_no && `• ${t.order_no}`}</p>}
                    {t.service_id && <a href={`/dashboard/atolye/${t.service_id}`} className="text-[10px] text-sky-500 hover:text-sky-700 font-semibold">→ Servis detayı</a>}
                  </td>
                  <td className="py-3 px-4 text-xs text-slate-600">{t.category}</td>
                  <td className="py-3 px-4">
                    <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                      <PayIcon size={12} /> {pm?.label || t.payment_method}
                    </span>
                  </td>
                  <td className={`py-3 px-4 text-right text-sm font-black tabular-nums ${t.type === 'gelir' ? 'text-emerald-600' : 'text-red-600'}`}>
                    {t.type === 'gelir' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  <td className="py-3 px-4 text-right text-[10px] text-slate-400">{formatRelativeTime(t.date)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className="flex items-center justify-between px-5 py-3 bg-slate-50 border-t border-slate-100">
          <span className="text-xs text-slate-500">{sorted.length} işlem</span>
          <div className="flex gap-4 text-xs font-bold">
            <span className="text-emerald-600">Gelir: {formatCurrency(sorted.filter(t => t.type === 'gelir').reduce((s, t) => s + t.amount, 0))}</span>
            <span className="text-red-600">Gider: {formatCurrency(sorted.filter(t => t.type === 'gider').reduce((s, t) => s + t.amount, 0))}</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fade-in-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">{modalType === 'gelir' ? '💰 Gelir Ekle' : '📤 Gider Ekle'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><label className="label">Açıklama *</label>
                <input className="input" placeholder="İşlem açıklaması" value={formData.description}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Kategori *</label>
                  <select className="select text-xs" value={formData.category}
                    onChange={e => setFormData(p => ({ ...p, category: e.target.value }))}>
                    <option value="">Seçin...</option>
                    {(modalType === 'gelir' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div><label className="label">Ödeme Yöntemi</label>
                  <select className="select text-xs" value={formData.payment_method}
                    onChange={e => setFormData(p => ({ ...p, payment_method: e.target.value }))}>
                    {Object.entries(PAYMENT_METHODS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Tutar (₺) *</label>
                  <input type="number" className="input" placeholder="0.00" value={formData.amount}
                    onChange={e => setFormData(p => ({ ...p, amount: e.target.value }))} />
                </div>
                <div><label className="label">Tarih</label>
                  <input type="date" className="input" value={formData.date || new Date().toISOString().split('T')[0]}
                    onChange={e => setFormData(p => ({ ...p, date: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">İptal</button>
              <button onClick={handleSave}
                className={`flex-1 text-sm font-semibold py-2.5 rounded-xl text-white transition-all ${modalType === 'gelir' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}>
                Kaydet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
