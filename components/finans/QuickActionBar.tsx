'use client'

import { memo } from 'react'
import { Plus, Minus, ArrowRightLeft, Scale, FileSpreadsheet, History } from 'lucide-react'

interface QuickActionBarProps {
  onOpenDeposit: () => void
  onOpenWithdraw: () => void
  onOpenTransfer: () => void
  onOpenReconcile: () => void
  onOpenDailyEod: () => void
  onOpenLegacyShifts: () => void
}

function QuickActionBarInner({
  onOpenDeposit,
  onOpenWithdraw,
  onOpenTransfer,
  onOpenReconcile,
  onOpenDailyEod,
  onOpenLegacyShifts,
}: QuickActionBarProps) {
  return (
    <div
      data-tour="kasa-quick-actions"
      className="surface p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-sm"
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={onOpenDeposit}
          className="btn-primary py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus size={16} /> Para Girişi
        </button>

        <button
          type="button"
          onClick={onOpenWithdraw}
          className="btn-secondary py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Minus size={16} /> Para Çıkışı
        </button>

        <button
          type="button"
          onClick={onOpenTransfer}
          className="btn-secondary py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 text-sky-700 bg-sky-50 hover:bg-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:hover:bg-sky-900/60 border border-sky-200 dark:border-sky-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <ArrowRightLeft size={16} /> Transfer
        </button>

        <button
          type="button"
          onClick={onOpenReconcile}
          className="btn-secondary py-2 px-4 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 text-amber-700 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:hover:bg-amber-900/60 border border-amber-200 dark:border-amber-800 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Scale size={16} /> Sayım / Mutabakat
        </button>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onOpenDailyEod}
          className="btn-secondary py-2 px-3.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800"
        >
          <FileSpreadsheet size={15} /> Gün Sonu Raporu
        </button>

        <button
          type="button"
          onClick={onOpenLegacyShifts}
          title="Geçmiş Kasa Vardiyaları ve Z-Raporları"
          className="btn-ghost py-2 px-3 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center gap-1.5"
        >
          <History size={15} /> Vardiyalar
        </button>
      </div>
    </div>
  )
}

export const QuickActionBar = memo(QuickActionBarInner)
