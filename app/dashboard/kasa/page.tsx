'use client'

import { useState, useEffect, useCallback } from 'react'
import { Wallet, RefreshCw, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageShell, PageHeader } from '@/components/ui/PageShell'
import { AccountCardsGrid } from '@/components/finans/AccountCardsGrid'
import { QuickActionBar } from '@/components/finans/QuickActionBar'
import { DailySummaryCards } from '@/components/finans/DailySummaryCards'
import { LiveLedgerTable, type LedgerTransactionItem } from '@/components/finans/LiveLedgerTable'
import { TransactionModal } from '@/components/finans/TransactionModal'
import { TransferModal } from '@/components/finans/TransferModal'
import { ReconciliationModal } from '@/components/finans/ReconciliationModal'
import { DailyEodModal } from '@/components/finans/DailyEodModal'
import { LegacyShiftsModal } from '@/components/finans/LegacyShiftsModal'
import { ErrorState } from '@/components/ui/ErrorState'
import { useRealtimeSubscription } from '@/hooks/useRealtimeSubscription'
import { createClient } from '@/lib/supabase/client'
import type { FinanceAccount } from '@/lib/finance-accounts'

export default function KasaPage() {
  const [supabase] = useState(() => createClient())
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Finans Verileri
  const [accounts, setAccounts] = useState<FinanceAccount[]>([])
  const [transactions, setTransactions] = useState<LedgerTransactionItem[]>([])
  const [totalTxCount, setTotalTxCount] = useState(0)
  const [dailyStats, setDailyStats] = useState({
    income: 0,
    expense: 0,
    refund: 0,
    transferVolume: 0,
    netFlow: 0,
    veresiyeAccrual: 0,
  })

  // Filtreler & Sayfalama
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [accountFilter, setAccountFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Modallar
  const [isDepositOpen, setIsDepositOpen] = useState(false)
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false)
  const [isTransferOpen, setIsTransferOpen] = useState(false)
  const [isReconcileOpen, setIsReconcileOpen] = useState(false)
  const [isDailyEodOpen, setIsDailyEodOpen] = useState(false)
  const [isLegacyShiftsOpen, setIsLegacyShiftsOpen] = useState(false)
  const [targetAccount, setTargetAccount] = useState<FinanceAccount | null>(null)

  // 1. Hesapları Yükle
  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch('/api/tenant/accounts', { credentials: 'same-origin' })
      const json = await res.json()
      if (res.ok && json.accounts) {
        setAccounts(json.accounts)
      }
    } catch (err: any) {
      console.error('Hesaplar yüklenemedi:', err)
    }
  }, [])

  // 2. Canlı Defter İşlemlerini Yükle
  const loadTransactions = useCallback(async (p = page, q = search, acc = accountFilter, t = typeFilter) => {
    try {
      const limit = 50
      const offset = (p - 1) * limit
      const params = new URLSearchParams({
        limit: String(limit),
        offset: String(offset),
      })
      if (q) params.set('search', q)
      if (acc) params.set('account_id', acc)
      if (t) params.set('type', t)

      const res = await fetch(`/api/tenant/transactions?${params.toString()}`, { credentials: 'same-origin' })
      const json = await res.json()
      if (res.ok && json.transactions) {
        setTransactions(json.transactions)
        setTotalTxCount(json.total || 0)
      }
    } catch (err: any) {
      console.error('İşlemler yüklenemedi:', err)
    }
  }, [page, search, accountFilter, typeFilter])

  // 3. Günlük Finans İstatistiklerini Yükle
  const loadDailyStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const res = await fetch(`/api/tenant/reports/daily-eod?date=${today}`, { credentials: 'same-origin' })
      const json = await res.json()
      if (res.ok && json.report) {
        const rep = json.report
        setDailyStats({
          income: rep.totals.total_income || 0,
          expense: rep.totals.total_expense || 0,
          refund: rep.totals.total_refund || 0,
          transferVolume: rep.totals.total_transfers || 0,
          netFlow: rep.totals.net_flow || 0,
          veresiyeAccrual: (rep.sales.veresiye_sales || 0) + (rep.sales.cek_senet_sales || 0),
        })
      }
    } catch (err: any) {
      console.error('Günlük istatistikler yüklenemedi:', err)
    }
  }, [])

  // Tüm Verileri Yenile
  const refreshAll = useCallback(async () => {
    setError('')
    await Promise.all([
      loadAccounts(),
      loadTransactions(page, search, accountFilter, typeFilter),
      loadDailyStats(),
    ])
  }, [loadAccounts, loadTransactions, loadDailyStats, page, search, accountFilter, typeFilter])

  useEffect(() => {
    setMounted(true)
    void (async () => {
      setLoading(true)
      try {
        await refreshAll()
      } catch (err: any) {
        setError(err.message || 'Finans verileri yüklenemedi')
      } finally {
        setLoading(false)
      }
    })()
  }, [refreshAll])

  // Realtime Supabase Abonelikleri (Hesaplar ve Finansal İşlemler)
  useRealtimeSubscription({
    table: 'financial_transactions',
    supabaseClient: supabase as any,
    onPayload: () => {
      void refreshAll()
    },
  })

  useRealtimeSubscription({
    table: 'accounts',
    supabaseClient: supabase as any,
    onPayload: () => {
      void loadAccounts()
    },
  })

  // Hesap Kartı Aksiyon Tetikleyicileri
  const handleDepositAccount = (acc: FinanceAccount) => {
    setTargetAccount(acc)
    setIsDepositOpen(true)
  }

  const handleWithdrawAccount = (acc: FinanceAccount) => {
    setTargetAccount(acc)
    setIsWithdrawOpen(true)
  }

  const handleTransferAccount = (acc: FinanceAccount) => {
    setTargetAccount(acc)
    setIsTransferOpen(true)
  }

  const handleReconcileAccount = (acc: FinanceAccount) => {
    setTargetAccount(acc)
    setIsReconcileOpen(true)
  }

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
      </div>
    )
  }

  if (error && accounts.length === 0) {
    return (
      <PageShell>
        <ErrorState
          title="Kasa & Finans Konsolu Yüklenemedi"
          description={error}
          onRetry={refreshAll}
        />
      </PageShell>
    )
  }

  const totalLiquidity = accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0)

  return (
    <PageShell>
      {/* Sayfa Başlığı */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <PageHeader
          data-tour="kasa-baslik"
          eyebrow="Finans & Kasa 2.0"
          title="Kasa & Finans Konsolu"
          description="Çoklu hesap yönetimi, canlı defter (ledger), hızlı finansal aksiyonlar ve gün sonu mutabakatı."
          icon={Wallet}
        />
        <button
          type="button"
          onClick={() => {
            void refreshAll()
            toast.success('Finans verileri güncellendi')
          }}
          className="btn-ghost py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center gap-1.5 text-slate-500 hover:text-slate-900 self-start sm:self-auto"
        >
          <RefreshCw size={13} /> Yenile
        </button>
      </div>

      {/* 1. ÜST BÖLÜM: Hesap Kartları & Toplam Likidite */}
      <AccountCardsGrid
        accounts={accounts}
        totalLiquidity={totalLiquidity}
        onDeposit={handleDepositAccount}
        onWithdraw={handleWithdrawAccount}
        onTransfer={handleTransferAccount}
        onReconcile={handleReconcileAccount}
      />

      {/* 2. HIZLI AKSİYON BARI */}
      <QuickActionBar
        onOpenDeposit={() => {
          setTargetAccount(null)
          setIsDepositOpen(true)
        }}
        onOpenWithdraw={() => {
          setTargetAccount(null)
          setIsWithdrawOpen(true)
        }}
        onOpenTransfer={() => {
          setTargetAccount(null)
          setIsTransferOpen(true)
        }}
        onOpenReconcile={() => {
          setTargetAccount(null)
          setIsReconcileOpen(true)
        }}
        onOpenDailyEod={() => setIsDailyEodOpen(true)}
        onOpenLegacyShifts={() => setIsLegacyShiftsOpen(true)}
      />

      {/* 3. BUGÜNKÜ FİNANS ÖZETİ */}
      <DailySummaryCards
        income={dailyStats.income}
        expense={dailyStats.expense}
        refund={dailyStats.refund}
        transferVolume={dailyStats.transferVolume}
        netFlow={dailyStats.netFlow}
        veresiyeAccrual={dailyStats.veresiyeAccrual}
      />

      {/* 4. CANLI DEFTER (LEDGER) TABLOSU */}
      <LiveLedgerTable
        transactions={transactions}
        accounts={accounts}
        loading={loading}
        totalCount={totalTxCount}
        page={page}
        pageSize={50}
        onPageChange={p => {
          setPage(p)
          void loadTransactions(p, search, accountFilter, typeFilter)
        }}
        onSearchChange={q => {
          setSearch(q)
          setPage(1)
          void loadTransactions(1, q, accountFilter, typeFilter)
        }}
        onAccountFilterChange={acc => {
          setAccountFilter(acc)
          setPage(1)
          void loadTransactions(1, search, acc, typeFilter)
        }}
        onTypeFilterChange={t => {
          setTypeFilter(t)
          setPage(1)
          void loadTransactions(1, search, accountFilter, t)
        }}
      />

      {/* ─── MODALLAR ──────────────────────────────────────────────────────── */}

      {/* Para Girişi Modalı */}
      <TransactionModal
        isOpen={isDepositOpen}
        type="gelir"
        accounts={accounts}
        selectedAccount={targetAccount}
        onClose={() => setIsDepositOpen(false)}
        onSuccess={refreshAll}
      />

      {/* Para Çıkışı Modalı */}
      <TransactionModal
        isOpen={isWithdrawOpen}
        type="gider"
        accounts={accounts}
        selectedAccount={targetAccount}
        onClose={() => setIsWithdrawOpen(false)}
        onSuccess={refreshAll}
      />

      {/* Transfer Modalı */}
      <TransferModal
        isOpen={isTransferOpen}
        accounts={accounts}
        fromAccount={targetAccount}
        onClose={() => setIsTransferOpen(false)}
        onSuccess={refreshAll}
      />

      {/* Mutabakat Modalı */}
      <ReconciliationModal
        isOpen={isReconcileOpen}
        accounts={accounts}
        selectedAccount={targetAccount}
        onClose={() => setIsReconcileOpen(false)}
        onSuccess={refreshAll}
      />

      {/* Gün Sonu EOD Modalı */}
      <DailyEodModal
        isOpen={isDailyEodOpen}
        onClose={() => setIsDailyEodOpen(false)}
      />

      {/* Geçmiş Vardiyalar Modalı */}
      <LegacyShiftsModal
        isOpen={isLegacyShiftsOpen}
        onClose={() => setIsLegacyShiftsOpen(false)}
        onShiftChange={refreshAll}
      />
    </PageShell>
  )
}
