/**
 * AURA İntegra — Kasa 2.0 Core Finance Library
 *
 * Tüm hesap/ledger/transfer işlemlerinin merkezi, composable katmanı.
 * API endpoint'leri ve server action'lar bu modülü kullanır.
 *
 * ARCHITECTURE:
 * USER → API → finance-accounts.ts → Supabase RPC / Query → accounts + financial_transactions
 */

import { normalizePaymentMethod } from './payment-method'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Account {
  id: string
  tenant_id: string
  name: string
  type: 'kasa' | 'nakit' | 'pos' | 'banka' | 'diger'
  balance: number
  currency: string
  is_default: boolean
  is_active: boolean
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type FinanceAccount = Account

export interface LedgerEntry {
  id: string
  tenant_id: string
  type: string
  amount: number
  category: string
  description: string
  payment_method: string
  account_id: string | null
  target_account_id: string | null
  transaction_date: string
  created_at: string
  created_by: string | null
  customer_name?: string
  order_no?: string
  service_id?: string
}

export interface CreateTransactionInput {
  type: 'gelir' | 'gider' | 'iade'
  amount: number
  category: string
  description: string
  payment_method: string
  account_id?: string
  date?: string
  customer_name?: string
  order_no?: string
  service_id?: string
}

export interface TransferInput {
  source_account_id: string
  target_account_id: string
  amount: number
  description?: string
}

export interface ReconciliationInput {
  account_id: string
  counted_balance: number
  notes?: string
}

export type SupabaseClient = {
  from: (table: string) => any
  rpc: (fn: string, params: Record<string, unknown>) => any
}

// ─── Payment Method → Account Type Mapping ──────────────────────────────────

/**
 * Likit ödeme yöntemleri ve karşılık geldikleri hesap tipleri.
 * Veresiye, çek ve senet LİKİT DEĞİLDİR (tahakkuk / bekleyen alacaktır).
 * Likit hesap bakiyesini (kasa/pos/banka) doğrudan etkilemezler.
 */
const LIQUID_PAYMENT_METHOD_TO_ACCOUNT_TYPE: Record<string, 'kasa' | 'pos' | 'banka'> = {
  nakit: 'kasa',
  kredi_karti: 'pos',
  havale: 'banka',
}

const NON_LIQUID_METHODS = new Set(['veresiye', 'cek', 'senet'])

/**
 * Ödeme yönteminin likit bir hesapla ilişkili olup olmadığını döner.
 */
export function isLiquidPaymentMethod(paymentMethod?: string | null): boolean {
  if (!paymentMethod) return false
  const normalized = normalizePaymentMethod(paymentMethod)
  return normalized in LIQUID_PAYMENT_METHOD_TO_ACCOUNT_TYPE
}

/**
 * Ödeme yönteminden hesap tipini belirler.
 * Likit olmayan yöntemler (veresiye, çek, senet) null döner — kasaya yazılmaz!
 */
export function resolveAccountTypeForPayment(paymentMethod: string): 'kasa' | 'pos' | 'banka' | null {
  const normalized = normalizePaymentMethod(paymentMethod)
  if (NON_LIQUID_METHODS.has(normalized)) return null
  return LIQUID_PAYMENT_METHOD_TO_ACCOUNT_TYPE[normalized] ?? 'kasa'
}

// ─── Account Queries ─────────────────────────────────────────────────────────

export async function getTenantAccounts(
  client: SupabaseClient,
  tenantId: string,
  opts?: { includeInactive?: boolean },
): Promise<Account[]> {
  try {
    let q = client
      .from('accounts')
      .select('*')
      .eq('tenant_id', tenantId)

    if (typeof q?.order === 'function') {
      q = q.order('is_default', { ascending: false }).order('name')
    }
    if (!opts?.includeInactive && typeof q?.eq === 'function') {
      try {
        q = q.eq('is_active', true)
      } catch {}
    }

    const res = await q
    const data = res?.data
    const error = res?.error

    if (error) throw new Error(`Hesaplar alınamadı: ${error.message}`)

    if (!data || !Array.isArray(data) || data.length === 0) {
      // Otomatik varsayılan hesapları oluştur
      const defaultAccounts = [
        { tenant_id: tenantId, name: 'Nakit Kasa', type: 'kasa', balance: 0, currency: 'TRY', is_default: true, is_active: true },
        { tenant_id: tenantId, name: 'POS Hesabı', type: 'pos', balance: 0, currency: 'TRY', is_default: false, is_active: true },
        { tenant_id: tenantId, name: 'Banka Hesabı', type: 'banka', balance: 0, currency: 'TRY', is_default: false, is_active: true },
      ]

      try {
        const { data: inserted } = await client
          .from('accounts')
          .insert(defaultAccounts)
          .select('*')

        if (inserted && Array.isArray(inserted)) {
          return inserted as Account[]
        }
      } catch {}
      return defaultAccounts as unknown as Account[]
    }

    return (data ?? []) as Account[]
  } catch (err: any) {
    if (err?.message?.includes('Hesaplar alınamadı:')) throw err
    return [
      { id: 'default-kasa', tenant_id: tenantId, name: 'Nakit Kasa', type: 'kasa', balance: 0, currency: 'TRY', is_default: true, is_active: true, metadata: {}, created_at: '', updated_at: '' },
      { id: 'default-pos', tenant_id: tenantId, name: 'POS Hesabı', type: 'pos', balance: 0, currency: 'TRY', is_default: false, is_active: true, metadata: {}, created_at: '', updated_at: '' },
      { id: 'default-banka', tenant_id: tenantId, name: 'Banka Hesabı', type: 'banka', balance: 0, currency: 'TRY', is_default: false, is_active: true, metadata: {}, created_at: '', updated_at: '' },
    ]
  }
}

export async function getAccountById(
  client: SupabaseClient,
  tenantId: string,
  accountId: string,
): Promise<Account | null> {
  const { data, error } = await client
    .from('accounts')
    .select('*')
    .eq('id', accountId)
    .eq('tenant_id', tenantId)
    .maybeSingle()

  if (error) throw new Error(`Hesap alınamadı: ${error.message}`)
  return data as Account | null
}

/**
 * Ödeme yöntemi veya hesap tipine göre tenant'ın varsayılan hesabını bulur.
 * Veresiye/çek/senet gibi likit olmayan yöntemler için null döner.
 */
export async function getDefaultAccountForPaymentMethod(
  client: SupabaseClient,
  tenantId: string,
  paymentMethod: string,
): Promise<Account | null> {
  const accountType = resolveAccountTypeForPayment(paymentMethod)
  if (!accountType) return null
  const types = accountType === 'kasa' ? ['kasa', 'nakit'] : [accountType]

  try {
    const { data: accounts } = await client
      .from('accounts')
      .select('*')
      .eq('tenant_id', tenantId)

    if (Array.isArray(accounts) && accounts.length > 0) {
      const matching = accounts.filter((a: any) => types.includes(a.type) && a.is_active !== false)
      if (matching.length > 0) {
        const defaultMatch = matching.find((a: any) => a.is_default)
        return (defaultMatch || matching[0]) as Account
      }
    }
  } catch {
    /* fallback to getTenantAccounts */
  }

  // 2. Hesap bulunamadıysa (yeni tenant / eksik veri): getTenantAccounts ile varsayılanları oluştur ve dönder
  try {
    const allAccounts = await getTenantAccounts(client, tenantId)
    const match = allAccounts.find(a => types.includes(a.type) && a.is_active) ??
                  allAccounts.find(a => types.includes(a.type)) ??
                  allAccounts[0]
    return (match as Account) ?? null
  } catch {
    return null
  }
}

// ─── Account Balance ─────────────────────────────────────────────────────────

/**
 * Atomik hesap bakiye güncellemesi.
 * adjust_account_balance RPC'sini çağırır.
 */
export async function adjustAccountBalance(
  client: SupabaseClient,
  tenantId: string,
  accountId: string,
  delta: number,
): Promise<number> {
  const { data, error } = await client.rpc('adjust_account_balance', {
    p_tenant_id: tenantId,
    p_account_id: accountId,
    p_delta: delta,
  })
  if (error) throw new Error(`Bakiye güncellenemedi: ${error.message}`)
  return Number(data)
}

// ─── Account Transfer ────────────────────────────────────────────────────────

/**
 * Atomik hesaplar arası transfer.
 * execute_account_transfer RPC'sini çağırır.
 */
export async function executeAccountTransfer(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  input: TransferInput,
): Promise<{
  ok: boolean
  transaction_id: string
  amount: number
  source_balance: number
  target_balance: number
}> {
  try {
    const { data, error } = await client.rpc('execute_account_transfer', {
      p_tenant_id: tenantId,
      p_user_id: userId,
      p_source_account_id: input.source_account_id,
      p_target_account_id: input.target_account_id,
      p_amount: input.amount,
      p_description: input.description ?? null,
    })
    if (!error && data) return data as any
    if (error && !error.message.includes('violates check constraint') && !error.message.includes('function execute_account_transfer')) {
      throw new Error(`Transfer başarısız: ${error.message}`)
    }
  } catch (rpcErr: any) {
    if (!rpcErr.message.includes('violates check constraint')) {
      throw rpcErr
    }
  }

  // Fallback Transfer: atomik bakiye güncellemeleri ve uyumlu ledger kaydı
  const src = await getAccountById(client, tenantId, input.source_account_id)
  const tgt = await getAccountById(client, tenantId, input.target_account_id)
  if (!src) throw new Error('Kaynak hesap bulunamadı')
  if (!tgt) throw new Error('Hedef hesap bulunamadı')
  if (Number(src.balance) < input.amount) {
    throw new Error(`Yetersiz bakiye. Mevcut bakiye: ₺${src.balance}`)
  }

  const newSrcBal = await adjustAccountBalance(client, tenantId, input.source_account_id, -input.amount)
  const newTgtBal = await adjustAccountBalance(client, tenantId, input.target_account_id, input.amount)

  const txId = crypto.randomUUID()
  const now = new Date().toISOString()
  await client.from('financial_transactions').insert({
    id: txId,
    tenant_id: tenantId,
    type: 'gider',
    amount: input.amount,
    category: 'Hesap Transferi',
    description: input.description || `${src.name} -> ${tgt.name} Transfer`,
    payment_method: 'havale',
    account_id: input.source_account_id,
    target_account_id: input.target_account_id,
    transaction_date: now,
    created_by: userId,
    created_at: now,
  })

  return {
    ok: true,
    transaction_id: txId,
    amount: input.amount,
    source_balance: newSrcBal,
    target_balance: newTgtBal,
  }
}

// ─── Transaction Creation ────────────────────────────────────────────────────

/**
 * Gelir/gider/iade transaction oluşturur ve ilgili hesap bakiyesini günceller.
 *
 * Veresiye/çek/senet gibi tahakkuk/alacak işlemlerinde likit hesap bakiyesi DEĞİŞMEZ.
 */
export async function createIncome(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  input: CreateTransactionInput,
): Promise<{ transaction_id: string; account_id: string | null; new_balance: number | null }> {
  return createFinanceRecord(client, tenantId, userId, { ...input, type: 'gelir' })
}

export async function createExpense(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  input: CreateTransactionInput,
): Promise<{ transaction_id: string; account_id: string | null; new_balance: number | null }> {
  return createFinanceRecord(client, tenantId, userId, { ...input, type: 'gider' })
}

export async function createRefund(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  input: CreateTransactionInput,
): Promise<{ transaction_id: string; account_id: string | null; new_balance: number | null }> {
  return createFinanceRecord(client, tenantId, userId, { ...input, type: 'iade' })
}

/**
 * Mutabakat kaydı oluşturur.
 *
 * ÖNEMLİ AYRIM:
 * - Sayım / Mutabakat kaydı (Reconciliation Record): Sayılan bakiye ile sistem bakiyesini
 *   karşılaştırır, farkı hesaplar ve loglar. Otomatik bakiye DEĞİŞTİRMEZ.
 * - Bakiye Düzeltme (Balance Adjustment): Yalnızca auto_adjust=true açıkça istendiğinde
 *   ayrı bir düzeltme hareketiyle bakiye eşitlenir.
 */
export async function createReconciliation(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  input: ReconciliationInput & { auto_adjust?: boolean },
): Promise<{
  transaction_id: string
  adjustment_id?: string
  system_balance: number
  counted_balance: number
  difference: number
  adjusted: boolean
  new_balance: number
}> {
  // 1. DB'den account'ın mevcut bakiyesini oku
  const account = await getAccountById(client, tenantId, input.account_id)
  if (!account) throw new Error('Hesap bulunamadı')
  if (!account.is_active) throw new Error('Hesap pasif durumda')

  const systemBalance = Number(account.balance)
  const countedBalance = Number(input.counted_balance)
  const difference = countedBalance - systemBalance

  const reconTxId = crypto.randomUUID()
  const now = new Date().toISOString()

  // 2. Her durumda Mutabakat Sayım kaydı oluştur (Log/Audit)
  const { error: reconErr } = await client.from('financial_transactions').insert({
    id: reconTxId,
    tenant_id: tenantId,
    type: 'gelir',
    amount: 0,
    category: 'Mutabakat Sayımı',
    description: difference === 0
      ? `Mutabakat — Fark yok. ${input.notes ?? ''}`.trim()
      : `Mutabakat Sayımı — Sayım: ${countedBalance}, Sistem: ${systemBalance}, Fark: ${difference > 0 ? '+' : ''}${difference}. ${input.notes ?? ''}`.trim(),
    payment_method: 'nakit',
    account_id: input.account_id,
    transaction_date: now,
    created_by: userId,
  })
  if (reconErr) throw new Error(`Mutabakat kaydı oluşturulamadı: ${reconErr.message}`)

  // 3. auto_adjust istenmediyse veya fark 0 ise bakiye değiştirme
  if (!input.auto_adjust || difference === 0) {
    return {
      transaction_id: reconTxId,
      system_balance: systemBalance,
      counted_balance: countedBalance,
      difference,
      adjusted: false,
      new_balance: systemBalance,
    }
  }

  // 4. auto_adjust=true istendiyse: Bakiyeyi atomik güncelle ve açık bir düzeltme kaydı oluştur
  const newBalance = await adjustAccountBalance(client, tenantId, input.account_id, difference)
  const adjTxId = crypto.randomUUID()

  await client.from('financial_transactions').insert({
    id: adjTxId,
    tenant_id: tenantId,
    type: difference > 0 ? 'gelir' : 'gider',
    amount: Math.abs(difference),
    category: 'Kasa Düzeltme',
    description: `Mutabakat Fark Düzeltmesi — Sayım ID: ${reconTxId}, Fark: ${difference > 0 ? '+' : ''}${difference}`,
    payment_method: 'nakit',
    account_id: input.account_id,
    transaction_date: now,
    created_by: userId,
    reference_id: reconTxId,
  })

  return {
    transaction_id: reconTxId,
    adjustment_id: adjTxId,
    system_balance: systemBalance,
    counted_balance: countedBalance,
    difference,
    adjusted: true,
    new_balance: newBalance,
  }
}

// ─── Ledger Queries ──────────────────────────────────────────────────────────

export async function getAccountLedger(
  client: SupabaseClient,
  tenantId: string,
  opts?: {
    accountId?: string
    from?: string
    to?: string
    limit?: number
  },
): Promise<LedgerEntry[]> {
  let q = client
    .from('financial_transactions')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('transaction_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (opts?.accountId) {
    q = q.or(`account_id.eq.${opts.accountId},target_account_id.eq.${opts.accountId}`)
  }
  if (opts?.from) {
    q = q.gte('transaction_date', opts.from)
  }
  if (opts?.to) {
    q = q.lte('transaction_date', opts.to)
  }

  q = q.limit(opts?.limit ?? 500)

  const { data, error } = await q
  if (error) throw new Error(`Ledger alınamadı: ${error.message}`)
  return (data ?? []) as LedgerEntry[]
}

export async function getDailyLedger(
  client: SupabaseClient,
  tenantId: string,
  date: string,
  accountId?: string,
): Promise<LedgerEntry[]> {
  return getAccountLedger(client, tenantId, {
    accountId,
    from: `${date}T00:00:00.000Z`,
    to: `${date}T23:59:59.999Z`,
    limit: 1000,
  })
}

// ─── Internal Helpers ────────────────────────────────────────────────────────

async function createFinanceRecord(
  client: SupabaseClient,
  tenantId: string,
  userId: string,
  input: CreateTransactionInput,
): Promise<{ transaction_id: string; account_id: string | null; new_balance: number | null }> {
  const amount = Number(input.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error('Tutar pozitif bir sayı olmalıdır')
  }

  const paymentMethod = normalizePaymentMethod(input.payment_method)
  const isLiquid = isLiquidPaymentMethod(paymentMethod)

  // 1. Account resolve (yalnızca likit yöntemler veya client açıkça account_id verdiyse)
  let accountId: string | null = input.account_id ?? null

  if (!accountId && isLiquid) {
    const defaultAccount = await getDefaultAccountForPaymentMethod(client, tenantId, paymentMethod)
    if (!defaultAccount) {
      throw new Error(`${paymentMethod} için uygun hesap bulunamadı`)
    }
    accountId = defaultAccount.id
  } else if (accountId) {
    // Client account_id verdi — tenant ownership + active kontrolü
    const acc = await getAccountById(client, tenantId, accountId)
    if (!acc) throw new Error('Hesap bulunamadı veya bu tenant\'a ait değil')
    if (!acc.is_active) throw new Error('Hesap pasif durumda')
  }

  // 2. Transaction oluştur
  const txId = crypto.randomUUID()
  const { error: insErr } = await client.from('financial_transactions').insert({
    id: txId,
    tenant_id: tenantId,
    type: input.type,
    amount,
    category: input.category,
    description: input.description,
    payment_method: paymentMethod,
    account_id: accountId,
    transaction_date: input.date ?? new Date().toISOString(),
    created_by: userId,
    customer_name: input.customer_name ?? null,
    order_no: input.order_no ?? null,
    service_id: input.service_id ?? null,
  })
  if (insErr) throw new Error(`İşlem kaydı başarısız: ${insErr.message}`)

  // 3. Likit hesap bakiye güncellemesi (veresiye/çek/senet ise bakiye değişmez)
  let newBalance: number | null = null
  if (isLiquid && accountId) {
    const delta = input.type === 'gelir' ? amount : -amount
    newBalance = await adjustAccountBalance(client, tenantId, accountId, delta)
  }

  return { transaction_id: txId, account_id: accountId, new_balance: newBalance }
}

// ─── Backfill Helpers ────────────────────────────────────────────────────────

export interface BackfillResult {
  total: number
  mapped: number
  ambiguous: number
  unresolved: number
  details: {
    payment_method: string | null
    target_account_type: string | null
    count: number
    status: 'clear' | 'ambiguous' | 'unresolved'
  }[]
}

/**
 * Mevcut financial_transactions'ları analiz eder.
 * Henüz account_id atanmamış (NULL) kayıtların hangi hesaba atanabileceğini raporlar.
 *
 * DİKKAT: veresiye, cek, senet ve NULL kayıtlar hesap atanmadan NULL bırakılır.
 */
export async function auditBackfill(
  client: SupabaseClient,
  tenantId: string,
): Promise<BackfillResult> {
  const { data: rows, error } = await client
    .from('financial_transactions')
    .select('id, payment_method, type, account_id, category')
    .eq('tenant_id', tenantId)
    .is('account_id', null)
    .limit(10000)

  if (error) throw new Error(`Backfill audit başarısız: ${error.message}`)

  const entries = rows ?? []
  const groups = new Map<string, number>()

  for (const row of entries) {
    const pm = row.payment_method ?? 'NULL'
    groups.set(pm, (groups.get(pm) ?? 0) + 1)
  }

  const details: BackfillResult['details'] = []
  let mapped = 0
  let ambiguous = 0
  let unresolved = 0

  for (const [pm, count] of groups) {
    if (pm === 'NULL') {
      details.push({ payment_method: pm, target_account_type: null, count, status: 'unresolved' })
      unresolved += count
    } else if (NON_LIQUID_METHODS.has(pm)) {
      // Veresiye / Çek / Senet tahakkuktur — likit hesap atanmaz (unresolved/non_liquid)
      details.push({ payment_method: pm, target_account_type: null, count, status: 'unresolved' })
      unresolved += count
    } else {
      const normalized = normalizePaymentMethod(pm)
      const type = resolveAccountTypeForPayment(normalized)
      if (type) {
        details.push({ payment_method: pm, target_account_type: type, count, status: 'clear' })
        mapped += count
      } else {
        details.push({ payment_method: pm, target_account_type: null, count, status: 'ambiguous' })
        ambiguous += count
      }
    }
  }

  return { total: entries.length, mapped, ambiguous, unresolved, details }
}

/**
 * Güvenli likit kayıtları (clear: nakit, kredi_karti, havale) backfill eder.
 * Veresiye, çek, senet ve NULL kayıtlara DOKUNULMAZ (NULL kalır).
 */
export async function executeBackfill(
  client: SupabaseClient,
  tenantId: string,
): Promise<{ updated: number; skipped: number }> {
  // 1. Tenant hesaplarını al
  const accounts = await getTenantAccounts(client, tenantId)

  // 2. Yalnızca likit payment_method'ları işle
  const methodsToProcess = ['nakit', 'kredi_karti', 'havale']
  let updated = 0
  let skipped = 0

  for (const pm of methodsToProcess) {
    const accountType = resolveAccountTypeForPayment(pm)
    if (!accountType) { skipped++; continue }

    // Bu tip için uygun hesap bul
    const types = accountType === 'kasa' ? ['kasa', 'nakit'] : [accountType]
    const acc = accounts.find(a => types.includes(a.type) && a.is_active) ??
                accounts.find(a => types.includes(a.type))
    if (!acc) { skipped++; continue }

    const { data: affected, error } = await client
      .from('financial_transactions')
      .update({ account_id: acc.id })
      .eq('tenant_id', tenantId)
      .eq('payment_method', pm)
      .is('account_id', null)
      .select('id')

    if (error) {
      console.error(`Backfill error for ${pm}:`, error.message)
      skipped++
      continue
    }
    updated += affected?.length ?? 0
  }

  return { updated, skipped }
}
