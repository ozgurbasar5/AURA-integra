'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  Search, Filter, ArrowUpCircle, ArrowDownCircle,
  ArrowRightLeft, Scale, ChevronLeft, ChevronRight,
  Banknote, CreditCard, Building2, Wallet
} from 'lucide-react'
import { formatCurrency, formatRelativeTime } from '@/lib/validators'
import { EmptyState } from '@/components/ui/EmptyState'
import { Skeleton } from '@/components/ui/Skeleton'
import type { FinanceAccount } from '@/lib/finance-accounts'

export interface LedgerTransactionItem {
  id: string
  type: string
  amount: number
  category?: string | null
  description?: string | null
  payment_method?: string | null
  account_id?: string | null
  target_account_id?: string | null
  service_id?: string | null
  customer_name?: string | null
  order_no?: string | null
  transaction_date?: string | null
  created_at?: string | null
}

interface LiveLedgerTableProps {
  transactions: LedgerTransactionItem[]
  accounts: FinanceAccount[]
  loading?: boolean
  totalCount?: number
  page?: number
  pageSize?: number
  onPageChange?: (page: number) => void
  onSearchChange?: (search: string) => void
  onAccountFilterChange?: (accountId: string) => void
  onTypeFilterChange?: (type: string) => void
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof ArrowUpCircle; color: string; prefix: string }> = {
  gelir: { label: 'Gelir', icon: ArrowUpCircle, color: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800', prefix: '+' },
  gider: { label: 'Gider', icon: ArrowDownCircle, color: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 dark:text-rose-400 border-rose-200 dark:border-rose-800', prefix: '-' },
  iade: { label: 'İade', icon: ArrowDownCircle, color: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-800', prefix: '-' },
  transfer: { label: 'Transfer', icon: ArrowRightLeft, color: 'text-sky-700 bg-sky-50 dark:bg-sky-950/40 dark:text-sky-400 border-sky-200 dark:border-sky-800', prefix: '⇄' },
  mutabakat: { label: 'Mutabakat', icon: Scale, color: 'text-indigo-700 bg-indigo-50 dark:bg-indigo-950/40 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800', prefix: '' },
}

export function LiveLedgerTable({
  transactions,
  accounts,
  loading = false,
  totalCount = 0,
  page = 1,
  pageSize = 50,
  onPageChange,
  onSearchChange,
  onAccountFilterChange,
  onTypeFilterChange,
}: LiveLedgerTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedAccountId, setSelectedAccountId] = useState('')
  const [selectedType, setSelectedType] = useState('')

  const accountMap = useMemo(() => {
    return new Map<string, FinanceAccount>(accounts.map(a => [a.id, a]))
  }, [accounts])

  const handleSearch = (val: string) => {
    setSearchTerm(val)
    onSearchChange?.(val)
  }

  const handleAccountChange = (val: string) => {
    setSelectedAccountId(val)
    onAccountFilterChange?.(val)
  }

  const handleTypeChange = (val: string) => {
    setSelectedType(val)
    onTypeFilterChange?.(val)
  }

  const totalPages = Math.ceil(totalCount / pageSize) || 1

  return (
    <div className="surface rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm" data-tour="kasa-canli-defter">
      {/* Header & Filtreler */}
      <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-900/50">
        <div>
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            Canlı Defter (Ledger) Hareketleri
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Tüm hesaplara ait gerçek zamanlı kasa ve finans hareketleri.
          </p>
        </div>

        {/* Arama ve Filtre Kontrolleri */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Arama Input */}
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              type="text"
              placeholder="Ara (açıklama, müşteri)…"
              value={searchTerm}
              onChange={e => handleSearch(e.target.value)}
              className="input pl-8 py-1.5 text-xs w-full"
            />
          </div>

          {/* Hesap Filtresi */}
          <select
            value={selectedAccountId}
            onChange={e => handleAccountChange(e.target.value)}
            className="input py-1.5 text-xs font-medium"
          >
            <option value="">Tüm Hesaplar</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.name}
              </option>
            ))}
          </select>

          {/* İşlem Tipi Filtresi */}
          <select
            value={selectedType}
            onChange={e => handleTypeChange(e.target.value)}
            className="input py-1.5 text-xs font-medium"
          >
            <option value="">Tüm Tipler</option>
            <option value="gelir">Gelir</option>
            <option value="gider">Gider</option>
            <option value="iade">İade</option>
            <option value="transfer">Transfer</option>
            <option value="mutabakat">Mutabakat</option>
          </select>
        </div>
      </div>

      {/* Tablo Alanı */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Tarih & Saat</th>
              <th className="py-3 px-4">Hesap</th>
              <th className="py-3 px-4">İşlem Tipi</th>
              <th className="py-3 px-4">Kategori</th>
              <th className="py-3 px-4">Açıklama & Detay</th>
              <th className="py-3 px-4 text-right">Tutar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="py-3 px-4"><Skeleton className="h-4 w-24" /></td>
                  <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
                  <td className="py-3 px-4"><Skeleton className="h-4 w-20" /></td>
                  <td className="py-3 px-4"><Skeleton className="h-4 w-36" /></td>
                  <td className="py-3 px-4 text-right"><Skeleton className="h-4 w-16 ml-auto" /></td>
                </tr>
              ))
            ) : transactions.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-12 text-center">
                  <EmptyState
                    title="İşlem Bulunamadı"
                    description="Seçilen filtrelere uygun finansal hareket bulunmuyor."
                  />
                </td>
              </tr>
            ) : (
              transactions.map(t => {
                const config = TYPE_CONFIG[t.type] || TYPE_CONFIG.gelir
                const Icon = config.icon
                const dateStr = t.transaction_date || t.created_at || ''
                const dateObj = dateStr ? new Date(dateStr) : new Date()
                const account = t.account_id ? accountMap.get(t.account_id) : null
                const targetAccount = t.target_account_id ? accountMap.get(t.target_account_id) : null

                return (
                  <tr
                    key={t.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                  >
                    {/* Tarih & Saat */}
                    <td className="py-3 px-4 text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {dateObj.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })} • {formatRelativeTime(dateStr)}
                      </div>
                    </td>

                    {/* Hesap */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      {account ? (
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800 dark:text-slate-200">
                          {account.type === 'kasa' && <Banknote size={13} className="text-emerald-500" />}
                          {account.type === 'pos' && <CreditCard size={13} className="text-sky-500" />}
                          {account.type === 'banka' && <Building2 size={13} className="text-indigo-500" />}
                          {account.type === 'diger' && <Wallet size={13} className="text-amber-500" />}
                          <span>{account.name}</span>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Genel Kasa</span>
                      )}
                      {targetAccount && (
                        <div className="text-[10px] text-sky-600 font-medium">
                          → {targetAccount.name}
                        </div>
                      )}
                    </td>

                    {/* Tip */}
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${config.color}`}>
                        <Icon size={11} /> {config.label}
                      </span>
                    </td>

                    {/* Kategori */}
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                      {t.category || 'Genel'}
                    </td>

                    {/* Açıklama & Detay */}
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900 dark:text-white line-clamp-1">
                        {t.description || '—'}
                      </p>
                      {t.customer_name && (
                        <p className="text-[10px] text-slate-400">
                          Müşteri: {t.customer_name} {t.order_no && `• Sipariş #${t.order_no}`}
                        </p>
                      )}
                      {t.service_id && (
                        <Link
                          href={`/dashboard/atolye/${t.service_id}`}
                          className="text-[10px] text-sky-500 hover:text-sky-700 font-semibold"
                        >
                          → Servis Kaydı
                        </Link>
                      )}
                    </td>

                    {/* Tutar */}
                    <td className={`py-3 px-4 text-right font-black tabular-nums whitespace-nowrap text-sm ${t.type === 'gelir' ? 'text-emerald-600 dark:text-emerald-400' : t.type === 'transfer' ? 'text-sky-600 dark:text-sky-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {config.prefix}{formatCurrency(t.amount)}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Sayfalama (Pagination) */}
      {totalPages > 1 && (
        <div className="p-3.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 bg-slate-50/40 dark:bg-slate-900/40">
          <span>Toplam {totalCount} işlem (Sayfa {page} / {totalPages})</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => onPageChange?.(page - 1)}
              className="btn-secondary py-1 px-2.5 rounded-lg text-xs font-semibold disabled:opacity-40 flex items-center gap-0.5"
            >
              <ChevronLeft size={13} /> Önceki
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => onPageChange?.(page + 1)}
              className="btn-secondary py-1 px-2.5 rounded-lg text-xs font-semibold disabled:opacity-40 flex items-center gap-0.5"
            >
              Sonraki <ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
