/**
 * ============================================================================
 * AURA İNTEGRA — KASA 2.0: DAILY FINANCIAL REPORT ENGINE (EOD)
 * ============================================================================
 *
 * Source of Truth:
 * - Date/Time Range (Tenant Timezone aware)
 * - ACCOUNTS (Multi-Account: Kasa, POS, Banka)
 * - FINANCIAL TRANSACTIONS (Ledger)
 * - SALES & SERVICE ORDERS
 * - RECONCILIATIONS (Sayım vs Düzeltme ayrımı)
 * - DATA INTEGRITY AUDITOR (Ledger vs Accounts Drift Detection)
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizePaymentMethod } from './payment-method'

export interface DailyReportDateRange {
  from: string // ISO UTC
  to: string   // ISO UTC
  dateStr: string // YYYY-MM-DD
  timezone: string
}

export interface AccountDailySummary {
  account_id: string
  account_name: string
  account_type: 'kasa' | 'pos' | 'banka' | 'diger'
  currency: string
  opening_balance: number
  income: number
  expense: number
  refund: number
  transfer_in: number
  transfer_out: number
  adjustment: number
  ledger_closing_balance: number
  system_balance: number
  is_balanced: boolean
  difference: number
}

export interface SalesDailySummary {
  total_sales: number
  cash_sales: number
  pos_sales: number
  bank_sales: number
  veresiye_sales: number // Cari tahakkuk (likit toplamdan ayrı tutulur)
  cek_senet_sales: number
  vat_total: number
  cost_total: number
  gross_profit: number
  count: number
}

export interface ServiceDailySummary {
  delivered_count: number
  total_service_fee: number
  cash_revenue: number
  pos_revenue: number
  bank_revenue: number
  veresiye_revenue: number
  parts_cost: number
  net_profit: number
}

export interface ReconciliationDailySummary {
  count: number
  records: Array<{
    id: string
    account_id: string
    account_name?: string
    counted_balance: number
    system_balance: number
    difference: number
    adjusted: boolean
    performed_at: string
    performed_by?: string
    notes?: string
  }>
}

export interface DailyFinancialReport {
  meta: {
    tenant_id: string
    shop_name: string
    date: string
    from: string
    to: string
    timezone: string
    generated_at: string
  }
  accounts: AccountDailySummary[]
  totals: {
    opening_liquidity: number
    total_income: number
    total_expense: number
    total_refund: number
    total_transfers: number
    total_adjustments: number
    closing_liquidity: number
    net_flow: number
  }
  sales: SalesDailySummary
  services: ServiceDailySummary
  reconciliations: ReconciliationDailySummary
  transactions: Array<{
    id: string
    time: string
    type: string
    category: string
    description: string
    amount: number
    payment_method: string
    account_id?: string | null
    account_name?: string | null
    service_id?: string | null
    customer_name?: string | null
  }>
  integrity: {
    balanced: boolean
    mismatches: Array<{
      account_id: string
      account_name: string
      ledger_closing: number
      system_balance: number
      difference: number
    }>
  }
}

/**
 * Timezone duyarlı tarih aralığı çözümleme.
 * Default Timezone: Europe/Istanbul (+03:00)
 */
export function resolveDateRange(
  dateParam?: string | null,
  fromParam?: string | null,
  toParam?: string | null,
  timezone = 'Europe/Istanbul',
): DailyReportDateRange {
  if (fromParam && toParam) {
    const fromDate = new Date(fromParam)
    const toDate = new Date(toParam)
    return {
      from: fromDate.toISOString(),
      to: toDate.toISOString(),
      dateStr: fromParam.slice(0, 10),
      timezone,
    }
  }

  const todayStr = dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)
    ? dateParam
    : new Date().toISOString().slice(0, 10)

  // Europe/Istanbul UTC+3 için gün başlangıcı ve bitişi
  const offsetHours = timezone === 'Europe/Istanbul' || timezone === 'UTC+3' ? 3 : 0
  const pad = (n: number) => String(n).padStart(2, '0')
  const sign = offsetHours >= 0 ? '+' : '-'
  const tzSuffix = `${sign}${pad(Math.abs(offsetHours))}:00`

  const fromIso = new Date(`${todayStr}T00:00:00.000${tzSuffix}`).toISOString()
  const toIso = new Date(`${todayStr}T23:59:59.999${tzSuffix}`).toISOString()

  return {
    from: fromIso,
    to: toIso,
    dateStr: todayStr,
    timezone,
  }
}

/**
 * Hesap bazında Günlük Açılış, Kapanış ve Hareket Özeti
 */
export async function getDailyAccountSummary(
  client: SupabaseClient,
  tenantId: string,
  range: DailyReportDateRange,
): Promise<{ summaries: AccountDailySummary[]; integrityMismatches: any[] }> {
  // 1. Tenant'ın aktif hesaplarını getir
  const { data: accounts, error: accErr } = await client
    .from('accounts')
    .select('id, name, type, balance, currency, is_default, is_active')
    .eq('tenant_id', tenantId)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (accErr) throw new Error(`Hesaplar okunamadı: ${accErr.message}`)
  const activeAccounts = accounts ?? []

  // 2. Bu hesaplara ait tüm finansal işlemleri getir
  const { data: periodTxs, error: txErr } = await client
    .from('financial_transactions')
    .select('id, type, amount, category, account_id, target_account_id, payment_method, transaction_date, created_at')
    .eq('tenant_id', tenantId)
    .gte('transaction_date', range.from)
    .lte('transaction_date', range.to)

  if (txErr) throw new Error(`Finansal hareketler okunamadı: ${txErr.message}`)
  const txList = periodTxs ?? []

  // 3. Geçmiş dönem toplamları (Opening Balance hesabı için)
  const { data: priorTxs, error: priorErr } = await client
    .from('financial_transactions')
    .select('type, amount, account_id, target_account_id')
    .eq('tenant_id', tenantId)
    .lt('transaction_date', range.from)

  if (priorErr) throw new Error(`Geçmiş işlemler okunamadı: ${priorErr.message}`)
  const priorList = priorTxs ?? []

  // Hesap bazında geçmiş net hareketleri hesapla
  const priorNetByAccount = new Map<string, number>()
  for (const t of priorList) {
    const amt = Number(t.amount) || 0
    if (t.account_id) {
      const current = priorNetByAccount.get(t.account_id) ?? 0
      if (t.type === 'gelir') priorNetByAccount.set(t.account_id, current + amt)
      else if (t.type === 'gider' || t.type === 'iade') priorNetByAccount.set(t.account_id, current - amt)
      else if (t.type === 'transfer') priorNetByAccount.set(t.account_id, current - amt)
    }
    if (t.target_account_id && t.type === 'transfer') {
      const current = priorNetByAccount.get(t.target_account_id) ?? 0
      priorNetByAccount.set(t.target_account_id, current + amt)
    }
  }

  const summaries: AccountDailySummary[] = []
  const integrityMismatches: any[] = []

  for (const acc of activeAccounts) {
    const accId = acc.id
    const opening = priorNetByAccount.get(accId) ?? 0
    let income = 0
    let expense = 0
    let refund = 0
    let transferIn = 0
    let transferOut = 0
    let adjustment = 0

    for (const t of txList) {
      const amt = Number(t.amount) || 0
      if (t.account_id === accId) {
        if (t.type === 'gelir') {
          if (t.category === 'Kasa Düzeltme') adjustment += amt
          else income += amt
        } else if (t.type === 'gider') {
          if (t.category === 'Kasa Düzeltme') adjustment -= amt
          else expense += amt
        } else if (t.type === 'iade') {
          refund += amt
        } else if (t.type === 'transfer') {
          transferOut += amt
        }
      }
      if (t.target_account_id === accId && t.type === 'transfer') {
        transferIn += amt
      }
    }

    const ledgerClosing = opening + income - expense - refund + transferIn - transferOut + adjustment
    const systemBalance = Number(acc.balance) || 0
    const diff = Math.round((systemBalance - ledgerClosing) * 100) / 100
    const isBalanced = Math.abs(diff) < 0.01

    if (!isBalanced) {
      integrityMismatches.push({
        account_id: accId,
        account_name: acc.name,
        ledger_closing: ledgerClosing,
        system_balance: systemBalance,
        difference: diff,
      })
    }

    summaries.push({
      account_id: accId,
      account_name: acc.name,
      account_type: acc.type as any,
      currency: acc.currency || 'TRY',
      opening_balance: Math.round(opening * 100) / 100,
      income: Math.round(income * 100) / 100,
      expense: Math.round(expense * 100) / 100,
      refund: Math.round(refund * 100) / 100,
      transfer_in: Math.round(transferIn * 100) / 100,
      transfer_out: Math.round(transferOut * 100) / 100,
      adjustment: Math.round(adjustment * 100) / 100,
      ledger_closing_balance: Math.round(ledgerClosing * 100) / 100,
      system_balance: Math.round(systemBalance * 100) / 100,
      is_balanced: isBalanced,
      difference: diff,
    })
  }

  return { summaries, integrityMismatches }
}

/**
 * Günlük Satış Özeti
 */
export async function getDailySalesSummary(
  client: SupabaseClient,
  tenantId: string,
  range: DailyReportDateRange,
): Promise<SalesDailySummary> {
  const { data: sales, error } = await client
    .from('sales')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('created_at', range.from)
    .lte('created_at', range.to)

  if (error) throw new Error(`Satışlar okunamadı: ${error.message}`)
  const list = sales ?? []

  let totalSales = 0
  let cashSales = 0
  let posSales = 0
  let bankSales = 0
  let veresiyeSales = 0
  let cekSenetSales = 0
  let vatTotal = 0
  let costTotal = 0
  let grossProfit = 0

  for (const s of list) {
    const total = Number(s.total_with_vat) || Number(s.total) || Number(s.subtotal) || 0
    const pm = normalizePaymentMethod(s.payment_method)
    totalSales += total
    vatTotal += Number(s.vat_amount) || 0
    costTotal += Number(s.cost_price) || 0
    grossProfit += Number(s.gross_profit) || (total - (Number(s.cost_price) || 0))

    if (pm === 'nakit') cashSales += total
    else if (pm === 'kredi_karti') posSales += total
    else if (pm === 'havale') bankSales += total
    else if (pm === 'veresiye') veresiyeSales += total
    else if (pm === 'cek' || pm === 'senet') cekSenetSales += total
    else cashSales += total
  }

  return {
    total_sales: Math.round(totalSales * 100) / 100,
    cash_sales: Math.round(cashSales * 100) / 100,
    pos_sales: Math.round(posSales * 100) / 100,
    bank_sales: Math.round(bankSales * 100) / 100,
    veresiye_sales: Math.round(veresiyeSales * 100) / 100,
    cek_senet_sales: Math.round(cekSenetSales * 100) / 100,
    vat_total: Math.round(vatTotal * 100) / 100,
    cost_total: Math.round(costTotal * 100) / 100,
    gross_profit: Math.round(grossProfit * 100) / 100,
    count: list.length,
  }
}

/**
 * Günlük Servis Teslim Özeti
 */
export async function getDailyServiceSummary(
  client: SupabaseClient,
  tenantId: string,
  range: DailyReportDateRange,
): Promise<ServiceDailySummary> {
  const { data: deliveredOrders, error } = await client
    .from('service_orders')
    .select('id, actual_cost, estimated_cost, metadata, closed_at, updated_at')
    .eq('tenant_id', tenantId)
    .eq('status', 'teslim')
    .gte('closed_at', range.from)
    .lte('closed_at', range.to)

  if (error) throw new Error(`Servis siparişleri okunamadı: ${error.message}`)
  const list = deliveredOrders ?? []

  let totalServiceFee = 0
  let cashRevenue = 0
  let posRevenue = 0
  let bankRevenue = 0
  let veresiyeRevenue = 0
  let partsCost = 0

  for (const o of list) {
    const fee = Number(o.actual_cost) || Number(o.estimated_cost) || 0
    totalServiceFee += fee
    const meta = (o.metadata as Record<string, any>) ?? {}
    const usedParts = Array.isArray(meta.used_parts) ? meta.used_parts : []
    const partExpense = usedParts.reduce((s: number, p: any) => s + (Number(p.unit_buy) || 0) * (Number(p.qty) || 1), 0)
    partsCost += partExpense

    const pm = normalizePaymentMethod(meta.payment_method ?? 'nakit')
    if (pm === 'nakit') cashRevenue += fee
    else if (pm === 'kredi_karti') posRevenue += fee
    else if (pm === 'havale') bankRevenue += fee
    else if (pm === 'veresiye') veresiyeRevenue += fee
    else cashRevenue += fee
  }

  return {
    delivered_count: list.length,
    total_service_fee: Math.round(totalServiceFee * 100) / 100,
    cash_revenue: Math.round(cashRevenue * 100) / 100,
    pos_revenue: Math.round(posRevenue * 100) / 100,
    bank_revenue: Math.round(bankRevenue * 100) / 100,
    veresiye_revenue: Math.round(veresiyeRevenue * 100) / 100,
    parts_cost: Math.round(partsCost * 100) / 100,
    net_profit: Math.round((totalServiceFee - partsCost) * 100) / 100,
  }
}

/**
 * Günlük Mutabakat Sayımları Özeti
 */
export async function getDailyReconciliationSummary(
  client: SupabaseClient,
  tenantId: string,
  range: DailyReportDateRange,
): Promise<ReconciliationDailySummary> {
  const { data: recons, error } = await client
    .from('financial_transactions')
    .select('*')
    .eq('tenant_id', tenantId)
    .gte('transaction_date', range.from)
    .lte('transaction_date', range.to)

  if (error) throw new Error(`Mutabakat kayıtları okunamadı: ${error.message}`)
  const allTxs = (recons ?? []) as Array<Record<string, any>>
  const list = allTxs.filter(r => r.type === 'mutabakat' || (typeof r.category === 'string' && r.category.toLowerCase().includes('mutabakat')))

  const records = list.map(r => {
    const extra = (r.extra as Record<string, any>) ?? {}
    return {
      id: r.id,
      account_id: r.account_id,
      counted_balance: Number(extra.counted_balance) || 0,
      system_balance: Number(extra.system_balance) || 0,
      difference: Number(extra.difference) || Number(r.amount) || 0,
      adjusted: Boolean(extra.adjusted),
      performed_at: r.transaction_date,
      performed_by: r.created_by,
      notes: r.description,
    }
  })

  return {
    count: records.length,
    records,
  }
}

/**
 * Ana Gün Sonu / Günlük Finans Rapor Oluşturucu (EOD Engine)
 */
export async function buildDailyFinancialReport(
  client: SupabaseClient,
  tenantId: string,
  options?: {
    date?: string | null
    from?: string | null
    to?: string | null
    timezone?: string
  },
): Promise<DailyFinancialReport> {
  const range = resolveDateRange(
    options?.date,
    options?.from,
    options?.to,
    options?.timezone ?? 'Europe/Istanbul',
  )

  // 1. Tenant Bilgisi
  const { data: tenant } = await client
    .from('tenants')
    .select('shop_name, company_name')
    .eq('id', tenantId)
    .maybeSingle()

  const shopName = String(tenant?.shop_name || tenant?.company_name || 'Mağaza')

  // 2. Paralel sorgulamalar (N+1 engeli)
  const [accountData, salesSummary, serviceSummary, reconSummary, txsResult] = await Promise.all([
    getDailyAccountSummary(client, tenantId, range),
    getDailySalesSummary(client, tenantId, range),
    getDailyServiceSummary(client, tenantId, range),
    getDailyReconciliationSummary(client, tenantId, range),
    client
      .from('financial_transactions')
      .select('id, type, category, description, amount, payment_method, account_id, service_id, customer_name, transaction_date')
      .eq('tenant_id', tenantId)
      .gte('transaction_date', range.from)
      .lte('transaction_date', range.to)
      .order('transaction_date', { ascending: true })
      .limit(3000),
  ])

  const { summaries: accounts, integrityMismatches } = accountData
  const txList = txsResult.data ?? []

  // 3. Toplam Likidite ve Hareket Hesapları
  const openingLiquidity = accounts.reduce((s, a) => s + a.opening_balance, 0)
  const totalIncome = accounts.reduce((s, a) => s + a.income, 0)
  const totalExpense = accounts.reduce((s, a) => s + a.expense, 0)
  const totalRefund = accounts.reduce((s, a) => s + a.refund, 0)
  const totalTransfers = accounts.reduce((s, a) => s + a.transfer_in, 0) // Transfer in == transfer out (zero sum)
  const totalAdjustments = accounts.reduce((s, a) => s + a.adjustment, 0)
  const closingLiquidity = accounts.reduce((s, a) => s + a.ledger_closing_balance, 0)
  const netFlow = totalIncome - totalExpense - totalRefund + totalAdjustments

  // 4. İşlem Listesi Formatlama
  const accountNameMap = new Map<string, string>(accounts.map(a => [a.account_id, a.account_name]))
  const transactions = txList.map(t => ({
    id: t.id,
    time: t.transaction_date,
    type: t.type,
    category: t.category,
    description: t.description,
    amount: Number(t.amount) || 0,
    payment_method: t.payment_method,
    account_id: t.account_id ?? null,
    account_name: t.account_id ? accountNameMap.get(t.account_id) ?? null : null,
    service_id: t.service_id ?? null,
    customer_name: t.customer_name ?? null,
  }))

  return {
    meta: {
      tenant_id: tenantId,
      shop_name: shopName,
      date: range.dateStr,
      from: range.from,
      to: range.to,
      timezone: range.timezone,
      generated_at: new Date().toISOString(),
    },
    accounts,
    totals: {
      opening_liquidity: Math.round(openingLiquidity * 100) / 100,
      total_income: Math.round(totalIncome * 100) / 100,
      total_expense: Math.round(totalExpense * 100) / 100,
      total_refund: Math.round(totalRefund * 100) / 100,
      total_transfers: Math.round(totalTransfers * 100) / 100,
      total_adjustments: Math.round(totalAdjustments * 100) / 100,
      closing_liquidity: Math.round(closingLiquidity * 100) / 100,
      net_flow: Math.round(netFlow * 100) / 100,
    },
    sales: salesSummary,
    services: serviceSummary,
    reconciliations: reconSummary,
    transactions,
    integrity: {
      balanced: integrityMismatches.length === 0,
      mismatches: integrityMismatches,
    },
  }
}
