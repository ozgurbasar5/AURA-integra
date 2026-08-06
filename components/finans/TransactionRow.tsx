'use client'

import { memo } from 'react'
import Link from 'next/link'
import { ArrowUpCircle, ArrowDownCircle, Banknote, Building2, CreditCard, Wallet } from 'lucide-react'
import { PAYMENT_METHODS } from '@/lib/constants'
import { formatCurrency, formatRelativeTime } from '@/lib/validators'
import type { FinanceTransaction } from '@/lib/store'

const PAYMENT_ICONS: Record<string, typeof CreditCard> = {
  nakit: Banknote,
  kredi_karti: CreditCard,
  havale: Building2,
  eft: Building2,
  veresiye: Wallet,
}

export type TransactionRowProps = {
  transaction: FinanceTransaction
}

function TransactionRowInner({ transaction: t }: TransactionRowProps) {
  const PayIcon = PAYMENT_ICONS[t.payment_method] || Wallet
  const pm = PAYMENT_METHODS[t.payment_method as keyof typeof PAYMENT_METHODS]

  return (
    <tr className="hover:bg-slate-50/80 transition-colors">
      <td className="py-3 px-4">
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${t.type === 'gelir' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
          {t.type === 'gelir' ? <ArrowUpCircle size={10} /> : <ArrowDownCircle size={10} />}
          {t.type === 'gelir' ? 'Gelir' : 'Gider'}
        </span>
      </td>
      <td className="py-3 px-4">
        <p className="text-xs font-semibold text-slate-900">{t.description}</p>
        {t.customer_name && (
          <p className="text-[10px] text-slate-400">
            {t.customer_name} {t.order_no && `• ${t.order_no}`}
          </p>
        )}
        {t.service_id && (
          <Link href={`/dashboard/atolye/${t.service_id}`} className="text-[10px] text-sky-500 hover:text-sky-700 font-semibold">
            → Servis detayı
          </Link>
        )}
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
}

const TransactionRow = memo(TransactionRowInner)
export default TransactionRow
