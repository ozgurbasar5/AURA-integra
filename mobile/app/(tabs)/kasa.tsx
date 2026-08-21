import React, { useCallback, useMemo, useRef, useState } from 'react'
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useFocusEffect } from 'expo-router'
import FontAwesome from '@expo/vector-icons/FontAwesome'
import { apiFetch, invalidateApiCache } from '@/lib/api'
import { supabase } from '@/lib/supabase'
import { useAppTheme } from '@/lib/ThemeContext'
import { useRealtimeSubscription } from '@/lib/useRealtimeSubscription'
import { ErrorBanner, LoadingBlock } from '@/components/ui/States'
import { SectionHeader } from '@/components/ui/SectionHeader'
import { LiquidityBanner } from '@/components/kasa/LiquidityBanner'
import { AccountCardStrip, type AccountItem } from '@/components/kasa/AccountCardStrip'
import { QuickActions } from '@/components/kasa/QuickActions'
import { DailySummaryRow } from '@/components/kasa/DailySummaryRow'
import { TransactionListItem, type TransactionItem } from '@/components/kasa/TransactionListItem'
import { NetworkBanner } from '@/components/kasa/NetworkBanner'
import { IncomeSheet } from '@/components/kasa/IncomeSheet'
import { ExpenseSheet } from '@/components/kasa/ExpenseSheet'
import { TransferSheet } from '@/components/kasa/TransferSheet'
import { ReconcileSheet } from '@/components/kasa/ReconcileSheet'
import { FilterSheet } from '@/components/kasa/FilterSheet'

const PAGE_SIZE = 20

/**
 * KasaScreen — Mobile Kasa 2.0
 *
 * ARCHITECTURE:
 * - Server-authoritative: all balances from GET /api/tenant/accounts
 * - No local balance manipulation
 * - Realtime: invalidate+refetch on postgres_changes
 * - No cash-shift dependency
 * - No duplicate state store
 */
export default function KasaScreen() {
  const { colors } = useAppTheme()

  // ─── Server Data ──────────────────────────────────────────────────────────
  const [accounts, setAccounts] = useState<AccountItem[]>([])
  const [transactions, setTransactions] = useState<TransactionItem[]>([])
  const [totalTxCount, setTotalTxCount] = useState(0)
  const [dailyStats, setDailyStats] = useState({ income: 0, expense: 0, net: 0 })

  // ─── UI State ─────────────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [accountFilter, setAccountFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const hasData = useRef(false)

  // ─── Modal States ─────────────────────────────────────────────────────────
  const [incomeOpen, setIncomeOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [reconcileOpen, setReconcileOpen] = useState(false)
  const [filterOpen, setFilterOpen] = useState(false)
  const [targetAccount, setTargetAccount] = useState<AccountItem | null>(null)

  // ─── Data Loaders ─────────────────────────────────────────────────────────

  const loadAccounts = useCallback(async () => {
    try {
      const json = await apiFetch('/api/tenant/accounts', { fresh: true }) as { accounts?: AccountItem[] }
      if (json.accounts) {
        setAccounts(json.accounts.map(a => ({
          ...a,
          balance: Number(a.balance) || 0,
        })))
      }
    } catch (e) {
      console.warn('[Kasa] accounts load failed:', e)
    }
  }, [])

  const loadTransactions = useCallback(async (p = 1, acc = '', t = '') => {
    try {
      const limit = PAGE_SIZE
      const offset = (p - 1) * limit
      const params = new URLSearchParams({ limit: String(limit), offset: String(offset) })
      if (acc) params.set('account_id', acc)
      if (t) params.set('type', t)

      const json = await apiFetch(`/api/tenant/transactions?${params.toString()}`, { fresh: true }) as {
        transactions?: TransactionItem[]
        total?: number
      }
      if (json.transactions) {
        setTransactions(json.transactions.map(tx => ({
          ...tx,
          amount: Number(tx.amount) || 0,
        })))
        setTotalTxCount(json.total || 0)
      }
    } catch (e) {
      console.warn('[Kasa] transactions load failed:', e)
    }
  }, [])

  const loadDailyStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10)
      const json = await apiFetch(`/api/tenant/reports/daily-eod?date=${today}`, { fresh: true }) as {
        report?: { totals?: { total_income?: number; total_expense?: number; net_flow?: number } }
      }
      if (json.report?.totals) {
        const t = json.report.totals
        setDailyStats({
          income: t.total_income || 0,
          expense: t.total_expense || 0,
          net: t.net_flow || 0,
        })
      }
    } catch (e) {
      console.warn('[Kasa] daily stats load failed:', e)
    }
  }, [])

  const refreshAll = useCallback(async () => {
    setError('')
    await Promise.all([
      loadAccounts(),
      loadTransactions(page, accountFilter, typeFilter),
      loadDailyStats(),
    ])
  }, [loadAccounts, loadTransactions, loadDailyStats, page, accountFilter, typeFilter])

  // ─── Initial Load + Focus Refetch ─────────────────────────────────────────

  useFocusEffect(
    useCallback(() => {
      void (async () => {
        if (!hasData.current) {
          setLoading(true)
          try {
            await refreshAll()
            hasData.current = true
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Kasa verileri yüklenemedi')
          } finally {
            setLoading(false)
          }
        } else {
          // Stale-while-revalidate: show cached, refetch in background
          void refreshAll()
        }
      })()
    }, [refreshAll])
  )

  // ─── Realtime Subscriptions ───────────────────────────────────────────────
  // Rule #4: invalidate+refetch, never blindly increment

  useRealtimeSubscription({
    table: 'accounts',
    supabaseClient: supabase as any,
    onPayload: () => {
      void loadAccounts()
    },
  })

  useRealtimeSubscription({
    table: 'financial_transactions',
    supabaseClient: supabase as any,
    onPayload: () => {
      void loadTransactions(page, accountFilter, typeFilter)
      void loadAccounts()
      void loadDailyStats()
    },
  })

  // ─── Action Handlers ──────────────────────────────────────────────────────

  const handleMutationSuccess = useCallback(() => {
    setIsSaving(true)
    void refreshAll().finally(() => setIsSaving(false))
  }, [refreshAll])

  const handleAccountCardTap = useCallback((acc: AccountItem) => {
    // Filter ledger by this account
    setAccountFilter(acc.id)
    setPage(1)
    void loadTransactions(1, acc.id, typeFilter)
  }, [loadTransactions, typeFilter])

  const handleQuickIncome = useCallback((acc: AccountItem) => {
    setTargetAccount(acc)
    setIncomeOpen(true)
  }, [])

  const handleQuickExpense = useCallback((acc: AccountItem) => {
    setTargetAccount(acc)
    setExpenseOpen(true)
  }, [])

  const handleFilterChange = useCallback((acc: string, t: string) => {
    setAccountFilter(acc)
    setTypeFilter(t)
    setPage(1)
    void loadTransactions(1, acc, t)
  }, [loadTransactions])

  const handleLoadMore = useCallback(() => {
    if (transactions.length >= totalTxCount) return
    const nextPage = page + 1
    setPage(nextPage)
    void loadTransactions(nextPage, accountFilter, typeFilter)
  }, [page, transactions.length, totalTxCount, loadTransactions, accountFilter, typeFilter])

  // ─── Computed ─────────────────────────────────────────────────────────────

  const totalLiquidity = useMemo(
    () => accounts.reduce((s, a) => s + (Number(a.balance) || 0), 0),
    [accounts]
  )

  const accountNameMap = useMemo(
    () => Object.fromEntries(accounts.map(a => [a.id, a.name])),
    [accounts]
  )

  const hasActiveFilters = accountFilter !== '' || typeFilter !== ''

  // ─── Loading State ────────────────────────────────────────────────────────

  if (loading && !hasData.current) {
    return (
      <View style={[styles.root, { backgroundColor: colors.bg }]}>
        <LoadingBlock label="Kasa yükleniyor…" />
      </View>
    )
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  const ListHeader = (
    <View style={styles.headerContent}>
      {/* Network status */}
      <NetworkBanner isConnected={true} isSaving={isSaving} />

      {/* Error */}
      {error ? <ErrorBanner message={error} onRetry={() => void refreshAll()} /> : null}

      {/* 1. Total Liquidity */}
      <View style={styles.padH}>
        <LiquidityBanner totalLiquidity={totalLiquidity} />
      </View>

      {/* 2. Account Cards */}
      <AccountCardStrip
        accounts={accounts}
        onSelectAccount={handleAccountCardTap}
        onQuickIncome={handleQuickIncome}
        onQuickExpense={handleQuickExpense}
      />

      {/* 3. Quick Actions */}
      <QuickActions
        onIncome={() => { setTargetAccount(null); setIncomeOpen(true) }}
        onExpense={() => { setTargetAccount(null); setExpenseOpen(true) }}
        onTransfer={() => { setTargetAccount(null); setTransferOpen(true) }}
        onReconcile={() => { setTargetAccount(null); setReconcileOpen(true) }}
      />

      {/* 4. Daily Summary */}
      <DailySummaryRow
        income={dailyStats.income}
        expense={dailyStats.expense}
        net={dailyStats.net}
      />

      {/* 5. Transaction List Header */}
      <View style={styles.txHeaderRow}>
        <SectionHeader title="Son Hareketler" />
        <Pressable
          onPress={() => setFilterOpen(true)}
          style={[styles.filterBtn, { backgroundColor: hasActiveFilters ? colors.primarySoft : colors.card, borderColor: colors.border, borderRadius: colors.radiusSm }]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Filtreleri aç"
        >
          <FontAwesome name="filter" size={13} color={hasActiveFilters ? colors.primary : colors.muted} />
          <Text style={[styles.filterText, { color: hasActiveFilters ? colors.primary : colors.muted }]}>
            {hasActiveFilters ? 'Filtreli' : 'Filtre'}
          </Text>
        </Pressable>
      </View>

      {/* Active filter badge */}
      {hasActiveFilters ? (
        <Pressable
          onPress={() => { setAccountFilter(''); setTypeFilter(''); setPage(1); void loadTransactions(1, '', '') }}
          style={[styles.clearFilter, { backgroundColor: colors.warningSoft, borderRadius: colors.radiusSm }]}
          accessibilityRole="button"
          accessibilityLabel="Filtreleri temizle"
        >
          <Text style={[styles.clearFilterText, { color: colors.warning }]}>
            ✕ Filtreleri temizle
          </Text>
        </Pressable>
      ) : null}
    </View>
  )

  return (
    <View style={[styles.root, { backgroundColor: colors.bg }]}>
      <FlatList
        data={transactions}
        keyExtractor={(item, idx) => item.id || String(idx)}
        ListHeaderComponent={ListHeader}
        renderItem={({ item }) => (
          <TransactionListItem item={item} accountNames={accountNameMap} />
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={[styles.emptyText, { color: colors.muted }]}>Hareket bulunamadı</Text>
          </View>
        }
        ListFooterComponent={
          transactions.length < totalTxCount ? (
            <Pressable
              onPress={handleLoadMore}
              style={[styles.loadMore, { borderColor: colors.border, borderRadius: colors.radius }]}
              accessibilityRole="button"
              accessibilityLabel="Daha fazla hareket yükle"
            >
              <Text style={[styles.loadMoreText, { color: colors.primary }]}>
                Daha fazla yükle ({transactions.length}/{totalTxCount})
              </Text>
            </Pressable>
          ) : transactions.length > 0 ? (
            <Text style={[styles.endText, { color: colors.muted }]}>
              {totalTxCount} hareket gösteriliyor
            </Text>
          ) : null
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true)
              void refreshAll().finally(() => setRefreshing(false))
            }}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={{ paddingBottom: 32, gap: 0 }}
        showsVerticalScrollIndicator={false}
      />

      {/* ─── Bottom Sheet Modals ────────────────────────────────────────── */}

      <IncomeSheet
        visible={incomeOpen}
        accounts={accounts}
        preselectedAccount={targetAccount}
        onClose={() => setIncomeOpen(false)}
        onSuccess={handleMutationSuccess}
      />

      <ExpenseSheet
        visible={expenseOpen}
        accounts={accounts}
        preselectedAccount={targetAccount}
        onClose={() => setExpenseOpen(false)}
        onSuccess={handleMutationSuccess}
      />

      <TransferSheet
        visible={transferOpen}
        accounts={accounts}
        preselectedFrom={targetAccount}
        onClose={() => setTransferOpen(false)}
        onSuccess={handleMutationSuccess}
      />

      <ReconcileSheet
        visible={reconcileOpen}
        accounts={accounts}
        preselectedAccount={targetAccount}
        onClose={() => setReconcileOpen(false)}
        onSuccess={handleMutationSuccess}
      />

      <FilterSheet
        visible={filterOpen}
        accounts={accounts}
        accountFilter={accountFilter}
        typeFilter={typeFilter}
        onAccountChange={acc => handleFilterChange(acc, typeFilter)}
        onTypeChange={t => handleFilterChange(accountFilter, t)}
        onClear={() => handleFilterChange('', '')}
        onClose={() => setFilterOpen(false)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  headerContent: { gap: 12, paddingTop: 8, paddingBottom: 8 },
  padH: { paddingHorizontal: 16 },
  txHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 4,
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
    minHeight: 32,
  },
  filterText: { fontSize: 12, fontWeight: '700' },
  clearFilter: {
    marginHorizontal: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  clearFilterText: { fontSize: 12, fontWeight: '700' },
  emptyBox: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, fontWeight: '600' },
  loadMore: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    minHeight: 48,
    justifyContent: 'center',
  },
  loadMoreText: { fontSize: 13, fontWeight: '700' },
  endText: { textAlign: 'center', fontSize: 12, fontWeight: '600', paddingVertical: 16 },
})
