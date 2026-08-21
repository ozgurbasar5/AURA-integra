'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { X, History, FileText, Lock, Unlock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getCashShifts, getOpenCashShift, type CashShift } from '@/lib/store'
import { openCashShiftViaApi, closeCashShiftViaApi, loadCashShiftsFromApi } from '@/lib/cash-bridge'
import { formatCurrency } from '@/lib/validators'

interface LegacyShiftsModalProps {
  isOpen: boolean
  onClose: () => void
  onShiftChange?: () => void
}

export function LegacyShiftsModal({ isOpen, onClose, onShiftChange }: LegacyShiftsModalProps) {
  const [shifts, setShifts] = useState<CashShift[]>([])
  const [openShift, setOpenShift] = useState<CashShift | undefined>()
  const [loading, setLoading] = useState(false)
  const [openingBalance, setOpeningBalance] = useState('')
  const [closingBalance, setClosingBalance] = useState('')
  const [notes, setNotes] = useState('')

  const refresh = () => {
    setOpenShift(getOpenCashShift())
    setShifts(getCashShifts())
  }

  useEffect(() => {
    if (isOpen) {
      setLoading(true)
      void loadCashShiftsFromApi()
        .then(refresh)
        .finally(() => setLoading(false))
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleOpen = async () => {
    const bal = Number(openingBalance) || 0
    try {
      await openCashShiftViaApi(bal, 'Kasiyer')
      toast.success('Vardiya açıldı')
      setOpeningBalance('')
      refresh()
      onShiftChange?.()
    } catch (err: any) {
      toast.error(err.message || 'Vardiya açılamadı')
    }
  }

  const handleClose = async () => {
    const bal = Number(closingBalance)
    if (Number.isNaN(bal)) {
      toast.error('Kapanış tutarı girin')
      return
    }
    try {
      const res = await closeCashShiftViaApi(bal, 'Kasiyer', notes)
      if (res) {
        toast.success(`Vardiya kapandı (Fark: ${formatCurrency(res.difference || 0)})`)
        setClosingBalance('')
        setNotes('')
        refresh()
        onShiftChange?.()
      }
    } catch (err: any) {
      toast.error(err.message || 'Vardiya kapatılamadı')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="surface w-full max-w-2xl max-h-[85vh] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Başlık */}
        <div className="p-4 sm:p-5 flex items-center justify-between border-b bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-700 text-white">
              <History size={18} />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                Kasa Vardiyaları ve Geçmiş Z-Raporları
              </h3>
              <p className="text-xs text-slate-500">
                Geriye dönük vardiya kayıtları ve Z-raporu arşivi.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Gövde */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4">
          {/* Açık / Kapalı Vardiya İşlemi */}
          <div className="surface p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
            {openShift ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400">
                    <Unlock size={14} /> Açık Vardiya: {new Date(openShift.opened_at).toLocaleString('tr-TR')} ({openShift.opened_by})
                  </div>
                  <span className="text-xs font-bold tabular-nums">
                    Açılış: {formatCurrency(openShift.opening_balance)}
                  </span>
                </div>
                <div className="grid sm:grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Sayım tutarı (₺)"
                    value={closingBalance}
                    onChange={e => setClosingBalance(e.target.value)}
                    className="input text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Kapanış notu"
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    className="input text-xs"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleClose}
                  className="btn-secondary w-full py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 text-rose-700 bg-rose-50 border-rose-200 hover:bg-rose-100"
                >
                  <Lock size={13} /> Vardiyayı Kapat
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Açılış kasa tutarı (₺)"
                  value={openingBalance}
                  onChange={e => setOpeningBalance(e.target.value)}
                  className="input text-xs flex-1"
                />
                <button
                  type="button"
                  onClick={handleOpen}
                  className="btn-primary py-1.5 px-3 rounded-lg text-xs font-bold flex items-center gap-1"
                >
                  <Unlock size={13} /> Vardiya Aç
                </button>
              </div>
            )}
          </div>

          {/* Geçmiş Vardiyalar Listesi */}
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="py-8 text-center text-slate-400 text-xs">Yükleniyor…</div>
            ) : shifts.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs">Kayıtlı vardiya bulunmuyor.</div>
            ) : (
              shifts.map(s => (
                <div key={s.id} className="py-2.5 px-2 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      {new Date(s.opened_at).toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className={`ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold ${s.status === 'open' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {s.status === 'open' ? 'Açık' : 'Kapalı'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold tabular-nums">
                      {formatCurrency(s.closing_balance ?? s.opening_balance)}
                    </span>
                    {s.status === 'closed' && (
                      <Link
                        href={`/dashboard/kasa/rapor/${s.id}`}
                        className="text-sky-600 hover:text-sky-800 flex items-center gap-1 font-semibold"
                      >
                        <FileText size={12} /> Z-Raporu
                      </Link>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
