'use client'

import { memo } from 'react'
import { TrendingUp, TrendingDown, ArrowRightLeft, DollarSign, Wallet, Scale } from 'lucide-react'
import { formatCurrency } from '@/lib/validators'

interface DailySummaryProps {
  income: number
  expense: number
  refund: number
  transferVolume: number
  netFlow: number
  veresiyeAccrual: number
  reconciliationDiff?: number
}

function DailySummaryCardsInner({
  income,
  expense,
  refund,
  transferVolume,
  netFlow,
  veresiyeAccrual,
  reconciliationDiff = 0,
}: DailySummaryProps) {
  const isNetPositive = netFlow >= 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4" data-tour="kasa-gunluk-ozet">
      {/* Bugünkü Gelir */}
      <div className="surface p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Bugün Gelir
          </span>
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400">
            <TrendingUp size={14} />
          </div>
        </div>
        <p className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-2">
          +{formatCurrency(income)}
        </p>
      </div>

      {/* Bugünkü Gider & İade */}
      <div className="surface p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Bugün Gider / İade
          </span>
          <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <TrendingDown size={14} />
          </div>
        </div>
        <p className="text-lg sm:text-xl font-black text-rose-600 dark:text-rose-400 tabular-nums mt-2">
          -{formatCurrency(expense + refund)}
        </p>
      </div>

      {/* Net Likit Akış */}
      <div className="surface p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Net Likit Akış
          </span>
          <div className={`p-1.5 rounded-lg ${isNetPositive ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'}`}>
            <DollarSign size={14} />
          </div>
        </div>
        <p className={`text-lg sm:text-xl font-black tabular-nums mt-2 ${isNetPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {isNetPositive ? '+' : ''}{formatCurrency(netFlow)}
        </p>
      </div>

      {/* Transfer Hacmi */}
      <div className="surface p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Transfer Hacmi
          </span>
          <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400">
            <ArrowRightLeft size={14} />
          </div>
        </div>
        <p className="text-lg sm:text-xl font-black text-sky-600 dark:text-sky-400 tabular-nums mt-2">
          {formatCurrency(transferVolume)}
        </p>
      </div>

      {/* Cari / Tahakkuk (Veresiye) */}
      <div className="col-span-2 lg:col-span-1 surface p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            Veresiye / Çek
          </span>
          <div className="p-1.5 rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400">
            <Wallet size={14} />
          </div>
        </div>
        <div className="mt-2 flex items-baseline justify-between">
          <p className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400 tabular-nums">
            {formatCurrency(veresiyeAccrual)}
          </p>
          <span className="text-[10px] text-slate-400 font-medium">Likit Dışı</span>
        </div>
      </div>
    </div>
  )
}

export const DailySummaryCards = memo(DailySummaryCardsInner)
