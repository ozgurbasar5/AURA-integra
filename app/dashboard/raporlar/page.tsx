'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import {
  BarChart3, TrendingUp, Clock, DollarSign,
  Download, FileText, Inbox, Wallet, ChevronRight, Cloud, HardDrive,
} from 'lucide-react'
import { formatCurrency } from '@/lib/validators'
import { getTransactions, getFinanceSummary, getSales, getStock, getCashShifts, onStoreChange, isCariTransaction } from '@/lib/store'
import { buildVatReport } from '@/lib/erp-features'
import {
  aggregateCategories,
  aggregateMonthly,
  summarizeFinance,
  type VatRow,
} from '@/lib/reports-aggregate'
import { PageShell, PageHeader, PageCard, LoadingCenter } from '@/components/ui/PageShell'
import { toast } from 'sonner'

const RaporlarCharts = dynamic(() => import('@/components/reports/RaporlarCharts'), {
  ssr: false,
  loading: () => (
    <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 surface h-64 animate-pulse bg-slate-50" />
      <div className="surface h-64 animate-pulse bg-slate-50" />
    </div>
  ),
})

type Tab = 'analitik' | 'gun-sonu'

type ApiSummary = {
  totalGelir: number
  totalGider: number
  netKar: number
  totalStockValue: number
  criticalStockCount: number
  totalStockItems: number
  salesCount: number
  txCount: number
  open_service_orders?: number
}

type ClosedShift = {
  id: string
  opened_at: string
  closed_at?: string | null
  opened_by?: string
  closed_by?: string
  difference?: number
}

export default function RaporlarPage() {
  const [mounted, setMounted] = useState(false)
  const [tab, setTab] = useState<Tab>('analitik')
  const [loadingApi, setLoadingApi] = useState(true)
  const [dataSource, setDataSource] = useState<'api' | 'local'>('local')
  const dataSourceRef = useRef<'api' | 'local'>('local')
  const [closedShifts, setClosedShifts] = useState<ClosedShift[]>([])
  const [summary, setSummary] = useState<ApiSummary>({
    totalGelir: 0, totalGider: 0, netKar: 0, totalStockValue: 0,
    criticalStockCount: 0, totalStockItems: 0, salesCount: 0, txCount: 0,
  })
  const [monthlyData, setMonthlyData] = useState<Array<{ month: string; gelir: number; gider: number }>>([])
  const [categoryData, setCategoryData] = useState<Array<{ name: string; value: number; color: string }>>([])
  const [vatRows, setVatRows] = useState<VatRow[]>([])
  const [vatTotals, setVatTotals] = useState({ totalVat: 0, totalGross: 0 })

  const applyLocal = useCallback(() => {
    const txs = getTransactions().filter(t => !isCariTransaction(t))
    const fin = summarizeFinance(txs.map(t => ({ type: t.type, amount: t.amount, category: t.category, date: t.date })))
    const stock = getStock()
    const localSummary = getFinanceSummary()
    setSummary({
      totalGelir: fin.totalGelir || localSummary.totalGelir,
      totalGider: fin.totalGider || localSummary.totalGider,
      netKar: fin.netKar || localSummary.netKar,
      totalStockValue: localSummary.totalStockValue,
      criticalStockCount: localSummary.criticalStockCount,
      totalStockItems: stock.length,
      salesCount: getSales().length,
      txCount: fin.txCount,
    })
    setMonthlyData(aggregateMonthly(txs.map(t => ({ type: t.type, amount: t.amount, category: t.category, date: t.date }))))
    setCategoryData(aggregateCategories(txs.map(t => ({ type: t.type, amount: t.amount, category: t.category, date: t.date }))))
    const vat = buildVatReport(getTransactions(), getSales())
    setVatRows(vat.rows)
    setVatTotals({ totalVat: vat.totalVat, totalGross: vat.totalGross })
    setClosedShifts(getCashShifts().filter(s => s.status === 'closed').map(s => ({
      id: s.id,
      opened_at: s.opened_at,
      closed_at: s.closed_at,
      opened_by: s.opened_by,
      closed_by: s.closed_by,
      difference: s.difference,
    })))
    dataSourceRef.current = 'local'
    setDataSource('local')
  }, [])

  const loadApi = useCallback(async () => {
    setLoadingApi(true)
    try {
      const res = await fetch('/api/tenant/reports', { credentials: 'same-origin' })
      if (!res.ok) {
        throw new Error(res.status === 403 ? 'Paket seviyeniz bu rapor için yetersiz' : 'Rapor verisi alınamadı')
      }
      const json = await res.json()
      if (!json.ok) throw new Error(json.error || 'Rapor hatası')

      setSummary({
        totalGelir: Number(json.summary?.totalGelir) || 0,
        totalGider: Number(json.summary?.totalGider) || 0,
        netKar: Number(json.summary?.netKar) || 0,
        totalStockValue: Number(json.summary?.totalStockValue) || 0,
        criticalStockCount: Number(json.summary?.criticalStockCount) || 0,
        totalStockItems: Number(json.summary?.totalStockItems) || 0,
        salesCount: Number(json.summary?.salesCount) || 0,
        txCount: Number(json.summary?.txCount) || 0,
        open_service_orders: Number(json.summary?.open_service_orders) || 0,
      })
      if (Array.isArray(json.monthly) && json.monthly.length) {
        setMonthlyData(json.monthly.map((m: { month: string; gelir: number; gider: number }) => ({
          month: m.month,
          gelir: Number(m.gelir) || 0,
          gider: Number(m.gider) || 0,
        })))
      }
      if (Array.isArray(json.categories)) setCategoryData(json.categories)
      if (json.vat?.rows) {
        setVatRows(json.vat.rows)
        setVatTotals({ totalVat: Number(json.vat.totalVat) || 0, totalGross: Number(json.vat.totalGross) || 0 })
      }
      if (Array.isArray(json.closed_shifts)) setClosedShifts(json.closed_shifts)
      dataSourceRef.current = 'api'
      setDataSource('api')
    } catch (err: unknown) {
      applyLocal()
      const msg = err instanceof Error ? err.message : 'Rapor API yanıt vermedi — yerel veri gösteriliyor'
      toast.message(msg)
    } finally {
      setLoadingApi(false)
    }
  }, [applyLocal])

  useEffect(() => {
    setMounted(true)
    applyLocal()
    void loadApi()
    const unsub = onStoreChange(() => {
      if (dataSourceRef.current === 'local') applyLocal()
    })
    return unsub
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-once hydrate
  }, [])

  if (!mounted) return <LoadingCenter />

  const hasData = summary.totalGelir > 0 || summary.totalGider > 0

  function exportExcel() {
    // Önce sunucu CSV (DB), yoksa yerel xlsx
    void (async () => {
      try {
        const res = await fetch('/api/tenant/reports/export?days=90', { credentials: 'same-origin' })
        if (!res.ok) throw new Error('export failed')
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `aura-finans-${new Date().toISOString().slice(0, 10)}.csv`
        a.click()
        URL.revokeObjectURL(url)
        toast.success('Sunucu CSV indirildi (Excel ile açılır)')
        return
      } catch {
        /* fallback */
      }
      const XLSX = await import('xlsx')
      const rows = getTransactions().filter(t => !isCariTransaction(t)).map(t => ({
        Tarih: t.date,
        Tür: t.type,
        Kategori: t.category,
        Tutar: t.amount,
        Açıklama: t.description ?? '',
      }))
      const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [
        { Tarih: '', Tür: 'özet', Kategori: 'Gelir', Tutar: summary.totalGelir, Açıklama: 'API özeti' },
        { Tarih: '', Tür: 'özet', Kategori: 'Gider', Tutar: summary.totalGider, Açıklama: 'API özeti' },
      ])
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Finans')
      XLSX.writeFile(wb, `aura-rapor-${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast.success('Yerel Excel indirildi')
    })()
  }

  function exportPdf() {
    import('jspdf').then(({ jsPDF }) => {
      const doc = new jsPDF()
      doc.setFontSize(12)
      doc.text('AURA Integra — Finans Ozeti', 14, 16)
      doc.setFontSize(10)
      doc.text(`Kaynak: ${dataSource === 'api' ? 'Sunucu' : 'Yerel'}`, 14, 24)
      doc.text(`Gelir: ${formatCurrency(summary.totalGelir)}`, 14, 32)
      doc.text(`Gider: ${formatCurrency(summary.totalGider)}`, 14, 38)
      doc.text(`Net: ${formatCurrency(summary.netKar)}`, 14, 44)
      doc.text(`KDV: ${formatCurrency(vatTotals.totalVat)}`, 14, 50)
      doc.save(`aura-rapor-${new Date().toISOString().slice(0, 10)}.pdf`)
      toast.success('PDF indirildi')
    })
  }

  return (
    <PageShell>
      <PageHeader
        data-tour="rapor-baslik"
        eyebrow="Finans"
        title="Raporlar & Analitik"
        description="Sunucu verisinden gelir, gider, KDV ve vardiya özeti"
        icon={BarChart3}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
              dataSource === 'api'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            }`}>
              {dataSource === 'api' ? <Cloud size={12} /> : <HardDrive size={12} />}
              {dataSource === 'api' ? 'Sunucu' : 'Yerel yedek'}
            </span>
            <button data-tour="rapor-excel-btn" type="button" onClick={exportExcel} className="btn-secondary text-xs flex items-center gap-1">
              <Download size={14} /> Excel
            </button>
            <button type="button" onClick={exportPdf} className="btn-secondary text-xs flex items-center gap-1">
              <FileText size={14} /> PDF
            </button>
            <div data-tour="rapor-sekmeler" className="flex rounded-xl border border-slate-200 overflow-hidden text-xs font-bold">
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
                <Wallet size={14} /> Gün Sonu
              </button>
            </div>
          </div>
        )}
      />

      {loadingApi && (
        <p className="text-xs text-slate-400 -mt-2">Sunucu raporu yükleniyor…</p>
      )}

      {tab === 'gun-sonu' ? (
        <PageCard title="Kapanmış Vardiyalar" action={
          <button type="button" onClick={() => void loadApi()} className="text-xs font-bold text-sky-600">Yenile</button>
        }>
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
        </PageCard>
      ) : (
        <>
          <div data-tour="rapor-metrikler" className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { label: 'Toplam Gelir', val: formatCurrency(summary.totalGelir), icon: DollarSign, tone: 'bg-sky-600' },
              { label: 'Toplam Gider', val: formatCurrency(summary.totalGider), icon: BarChart3, tone: 'bg-cyan-600' },
              { label: 'Net Kâr', val: formatCurrency(summary.netKar), icon: TrendingUp, tone: 'bg-emerald-600' },
              { label: 'Stok Değeri', val: formatCurrency(summary.totalStockValue), icon: Clock, tone: 'bg-amber-500' },
            ].map(m => (
              <div key={m.label} className="surface p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
                <div className={`w-9 h-9 rounded-xl ${m.tone} flex items-center justify-center shadow-sm mb-3`}>
                  <m.icon size={16} className="text-white" />
                </div>
                <p className="text-lg font-black text-slate-900 tabular-nums">{m.val}</p>
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mt-0.5">{m.label}</p>
              </div>
            ))}
          </div>

          {!hasData ? (
            <PageCard>
              <div className="text-center py-10">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Inbox size={28} className="text-slate-300" />
                </div>
                <p className="text-sm font-semibold text-slate-600 mb-1">Henüz rapor verisi yok</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Satış, servis teslim ve alış işlemleri oluştukça buradaki özet otomatik dolar.
                </p>
              </div>
            </PageCard>
          ) : (
            <>
              <RaporlarCharts monthlyData={monthlyData} categoryData={categoryData} />

              <PageCard title="KDV & Vergi Özeti">
                <p className="text-[11px] text-slate-400 mb-4">POS ve servis gelirlerinden hesaplanan KDV</p>
                {vatRows.length === 0 ? (
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
                          {vatRows.map(r => (
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
                      <span className="text-slate-500">Toplam KDV: <strong className="text-amber-700">{formatCurrency(vatTotals.totalVat)}</strong></span>
                      <span className="text-slate-500">Brüt: <strong>{formatCurrency(vatTotals.totalGross)}</strong></span>
                    </div>
                  </>
                )}
              </PageCard>

              <PageCard title="İşletme Özeti">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <p className="text-2xl font-black text-sky-600">{summary.txCount}</p>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase mt-1">Toplam İşlem</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <p className="text-2xl font-black text-blue-600">{summary.salesCount}</p>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase mt-1">POS Satış</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <p className="text-2xl font-black text-emerald-600">{summary.totalStockItems}</p>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase mt-1">Stok Çeşidi</p>
                  </div>
                  <div className="text-center p-3 bg-slate-50 rounded-xl">
                    <p className="text-2xl font-black text-amber-600">{summary.criticalStockCount}</p>
                    <p className="text-[10px] text-slate-500 font-semibold uppercase mt-1">Kritik Stok</p>
                  </div>
                </div>
              </PageCard>
            </>
          )}
        </>
      )}
    </PageShell>
  )
}
