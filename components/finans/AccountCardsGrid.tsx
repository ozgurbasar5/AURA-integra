'use client'

import { memo } from 'react'
import { Banknote, CreditCard, Building2, Wallet, Plus, Minus, ArrowRightLeft, CheckCircle2, type LucideIcon } from 'lucide-react'
import { formatCurrency } from '@/lib/validators'
import type { FinanceAccount } from '@/lib/finance-accounts'

const TYPE_ICONS: Record<string, LucideIcon> = {
  kasa: Banknote,
  nakit: Banknote,
  pos: CreditCard,
  banka: Building2,
  diger: Wallet,
}

const TYPE_LABELS: Record<string, string> = {
  kasa: 'Nakit Kasa',
  nakit: 'Nakit Kasa',
  pos: 'POS Hesabı',
  banka: 'Banka Hesabı',
  diger: 'Diğer Hesap',
}

const TYPE_COLORS: Record<string, string> = {
  kasa: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
  nakit: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/60',
  pos: 'text-sky-600 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-800/60',
  banka: 'text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800/60',
  diger: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800/60',
}

interface AccountCardsGridProps {
  accounts: FinanceAccount[]
  totalLiquidity: number
  onDeposit: (account: FinanceAccount) => void
  onWithdraw: (account: FinanceAccount) => void
  onTransfer: (fromAccount: FinanceAccount) => void
  onReconcile: (account: FinanceAccount) => void
}

function AccountCardsGridInner({
  accounts,
  totalLiquidity,
  onDeposit,
  onWithdraw,
  onTransfer,
  onReconcile,
}: AccountCardsGridProps) {
  return (
    <div className="space-y-4">
      {/* Toplam Likidite Hero Banner */}
      <div className="surface p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Toplam Şirket Likiditesi
          </p>
          <div className="flex items-baseline gap-3 mt-1">
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white tabular-nums">
              {formatCurrency(totalLiquidity)}
            </h2>
            <span className="text-xs text-slate-300 bg-white/10 px-2.5 py-1 rounded-full font-medium">
              {accounts.length} Aktif Hesap
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Nakit, POS ve Banka hesaplarının anlık net toplamı.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {accounts.map(acc => {
            const Icon = TYPE_ICONS[acc.type] || Wallet
            return (
              <div
                key={acc.id}
                className="bg-white/5 border border-white/10 rounded-xl px-3 py-1.5 flex items-center gap-2 text-xs"
              >
                <Icon size={14} className="text-indigo-400" />
                <span className="text-slate-300 font-medium">{acc.name}:</span>
                <span className="text-white font-bold tabular-nums">
                  {formatCurrency(acc.balance)}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Hesap Kartları Izgarası */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4" data-tour="kasa-hesap-kartlari">
        {accounts.map(acc => {
          const Icon = TYPE_ICONS[acc.type] || Wallet
          const colorClass = TYPE_COLORS[acc.type] || TYPE_COLORS.diger
          const label = TYPE_LABELS[acc.type] || 'Hesap'

          return (
            <div
              key={acc.id}
              className="surface p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:shadow-md transition-all duration-200 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl border ${colorClass}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white line-clamp-1">
                        {acc.name}
                      </h3>
                      <p className="text-[11px] font-medium text-slate-500">
                        {label}
                      </p>
                    </div>
                  </div>
                  {acc.is_default && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-sky-600 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-200 dark:border-sky-800">
                      <CheckCircle2 size={10} /> Ana
                    </span>
                  )}
                </div>

                <div className="mt-4">
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                    Bakiye
                  </p>
                  <p className="text-2xl font-black text-slate-900 dark:text-white tabular-nums tracking-tight mt-0.5">
                    {formatCurrency(acc.balance)}
                  </p>
                </div>
              </div>

              {/* Hızlı Hesap İşlemleri */}
              <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => onDeposit(acc)}
                  title={`${acc.name} - Para Girişi`}
                  className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-900/60 transition-colors flex items-center justify-center gap-1"
                >
                  <Plus size={13} /> Giriş
                </button>
                <button
                  type="button"
                  onClick={() => onWithdraw(acc)}
                  title={`${acc.name} - Para Çıkışı`}
                  className="flex-1 py-1.5 px-2 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/60 transition-colors flex items-center justify-center gap-1"
                >
                  <Minus size={13} /> Çıkış
                </button>
                <button
                  type="button"
                  onClick={() => onTransfer(acc)}
                  title={`${acc.name} - Transfer Yap`}
                  className="py-1.5 px-2 rounded-lg text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                >
                  <ArrowRightLeft size={13} />
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const AccountCardsGrid = memo(AccountCardsGridInner)
