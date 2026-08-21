'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Printer, Calendar, CheckCircle2, AlertTriangle, Loader2, FileSpreadsheet } from 'lucide-react'
import { formatCurrency } from '@/lib/validators'
import type { DailyFinancialReport } from '@/lib/daily-financial-report'

interface DailyEodModalProps {
  isOpen: boolean
  onClose: () => void
}

export function DailyEodModal({ isOpen, onClose }: DailyEodModalProps) {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [report, setReport] = useState<DailyFinancialReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const loadReport = useCallback(async (date: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/tenant/reports/daily-eod?date=${encodeURIComponent(date)}`, {
        credentials: 'same-origin',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Rapor getirilemedi')
      setReport(json.report)
    } catch (err: any) {
      setError(err.message || 'Rapor yüklenirken hata oluştu')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      void loadReport(selectedDate)
    }
  }, [isOpen, selectedDate, loadReport])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div
        className="surface w-full max-w-4xl max-h-[92vh] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 my-auto"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="no-print p-4 sm:p-5 flex items-center justify-between border-b bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-600 text-white">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Gün Sonu Finans Raporu (EOD Z-Report)
              </h3>
              <p className="text-xs text-slate-500">
                Tarih ve defter bazlı resmi hesap, satış ve servis özeti.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tarih Seçici */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
              <Calendar size={14} className="text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={e => setSelectedDate(e.target.value)}
                className="text-xs font-semibold bg-transparent border-0 focus:outline-none text-slate-900 dark:text-white cursor-pointer"
              />
            </div>

            <button
              type="button"
              onClick={() => window.print()}
              disabled={loading || !report}
              className="btn-primary py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              <Printer size={14} /> Yazdır
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Gövdesi */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6">
          {loading && (
            <div className="py-20 flex flex-col items-center justify-center gap-2 text-slate-500">
              <Loader2 className="animate-spin text-indigo-500" size={28} />
              <p className="text-sm font-medium">Defter ve hesap hareketleri hesaplanıyor…</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}

          {!loading && report && (
            <>
              {/* Rapor Başlık Kartı */}
              <div className="surface p-5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h4 className="text-lg font-black text-slate-900 dark:text-white">
                    {report.meta.shop_name}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Rapor Tarihi: <strong>{new Date(report.meta.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong> • Timezone: {report.meta.timezone}
                  </p>
                </div>

                {/* Veri Bütünlüğü Rozeti */}
                <div>
                  {report.integrity.balanced ? (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                      <CheckCircle2 size={15} /> Defter ve Bakiyeler Tam Dengeli
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800">
                      <AlertTriangle size={15} /> {report.integrity.mismatches.length} Hesapta Bakiye Farkı Var
                    </div>
                  )}
                </div>
              </div>

              {/* Likidite Özeti */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="surface p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Gün Başı Likidite</span>
                  <p className="text-base sm:text-lg font-black text-slate-900 dark:text-white tabular-nums mt-1">
                    {formatCurrency(report.totals.opening_liquidity)}
                  </p>
                </div>
                <div className="surface p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-emerald-500 uppercase">Toplam Giriş</span>
                  <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-1">
                    +{formatCurrency(report.totals.total_income)}
                  </p>
                </div>
                <div className="surface p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] font-bold text-rose-500 uppercase">Toplam Çıkış</span>
                  <p className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums mt-1">
                    -{formatCurrency(report.totals.total_expense + report.totals.total_refund)}
                  </p>
                </div>
                <div className="surface p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                  <span className="text-[10px] font-bold text-slate-500 uppercase">Gün Sonu Likidite</span>
                  <p className="text-base sm:text-lg font-black text-indigo-600 dark:text-indigo-400 tabular-nums mt-1">
                    {formatCurrency(report.totals.closing_liquidity)}
                  </p>
                </div>
              </div>

              {/* Hesap Hareketleri Tablosu */}
              <div className="surface rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 font-bold text-xs text-slate-700 dark:text-slate-300">
                  Hesap Bazlı Kapanış ve Defter Doğrulama
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 dark:bg-slate-800/30 text-slate-500 border-b border-slate-200 dark:border-slate-800 font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Hesap</th>
                        <th className="py-2.5 px-3 text-right">Açılış</th>
                        <th className="py-2.5 px-3 text-right">Gelir</th>
                        <th className="py-2.5 px-3 text-right">Gider/İade</th>
                        <th className="py-2.5 px-3 text-right">Transfer</th>
                        <th className="py-2.5 px-3 text-right">Defter Kapanış</th>
                        <th className="py-2.5 px-3 text-right">Sistem Bakiyesi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                      {report.accounts.map(acc => (
                        <tr key={acc.account_id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 dark:text-white">
                            {acc.account_name} ({acc.account_type.toUpperCase()})
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-slate-600 dark:text-slate-400">
                            {formatCurrency(acc.opening_balance)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-emerald-600">
                            +{formatCurrency(acc.income)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-rose-600">
                            -{formatCurrency(acc.expense + acc.refund)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums text-sky-600">
                            {formatCurrency(acc.transfer_in - acc.transfer_out)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-bold text-slate-900 dark:text-white">
                            {formatCurrency(acc.ledger_closing_balance)}
                          </td>
                          <td className="py-2.5 px-3 text-right tabular-nums font-bold">
                            <span className={acc.is_balanced ? 'text-emerald-600' : 'text-amber-600'}>
                              {formatCurrency(acc.system_balance)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Satış & Servis Özeti */}
              <div className="grid sm:grid-cols-2 gap-4">
                {/* Satış Özeti */}
                <div className="surface p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <h5 className="font-bold text-sm text-slate-900 dark:text-white pb-1 border-b border-slate-100 dark:border-slate-800">
                    POS & Mağaza Satış Özeti ({report.sales.count} Satış)
                  </h5>
                  <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                    <span className="text-slate-500">Nakit Satışlar:</span>
                    <span className="font-bold tabular-nums">{formatCurrency(report.sales.cash_sales)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                    <span className="text-slate-500">POS / Kredi Kartı:</span>
                    <span className="font-bold tabular-nums">{formatCurrency(report.sales.pos_sales)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                    <span className="text-slate-500">Banka Havalesi:</span>
                    <span className="font-bold tabular-nums">{formatCurrency(report.sales.bank_sales)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40 text-amber-600">
                    <span>Veresiye / Çek (Tahakkuk):</span>
                    <span className="font-bold tabular-nums">{formatCurrency(report.sales.veresiye_sales + report.sales.cek_senet_sales)}</span>
                  </div>
                  <div className="flex justify-between pt-1 font-bold text-slate-900 dark:text-white">
                    <span>Toplam Satış Cirosu:</span>
                    <span className="tabular-nums text-sm">{formatCurrency(report.sales.total_sales)}</span>
                  </div>
                </div>

                {/* Servis Özeti */}
                <div className="surface p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 text-xs">
                  <h5 className="font-bold text-sm text-slate-900 dark:text-white pb-1 border-b border-slate-100 dark:border-slate-800">
                    Servis Teslimatları ({report.services.delivered_count} Cihaz)
                  </h5>
                  <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                    <span className="text-slate-500">Servis İşçilik / Ücret Geliri:</span>
                    <span className="font-bold tabular-nums">{formatCurrency(report.services.total_service_fee)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50 dark:border-slate-800/40">
                    <span className="text-slate-500">Kullanılan Parça Maliyeti:</span>
                    <span className="font-bold tabular-nums text-rose-600">-{formatCurrency(report.services.parts_cost)}</span>
                  </div>
                  <div className="flex justify-between pt-2 font-bold text-slate-900 dark:text-white">
                    <span>Net Servis Kârı:</span>
                    <span className="tabular-nums text-sm text-emerald-600">{formatCurrency(report.services.net_profit)}</span>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
