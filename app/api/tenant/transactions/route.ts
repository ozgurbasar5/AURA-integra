export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { canPushFinance } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { txToDb } from '@/lib/db-mappers'
import { normalizePaymentMethod } from '@/lib/payment-method'
import { withApiHandler } from '@/lib/api-handler'
import type { FinanceTransaction } from '@/lib/store'

/**
 * POST /api/tenant/transactions
 * Finansal işlem oluşturma.
 *
 * Kasa 2.0 ve Legacy uyumlu:
 * - Hem düz `{ type, amount, category, description, payment_method, account_id?, ... }`
 * - Hem legacy `{ transaction: { ... } }` zarfını destekler.
 */
export const POST = withApiHandler(async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canPushFinance(auth.role)) {
    return NextResponse.json({ error: 'Finans yazma yetkisi yok' }, { status: 403 })
  }

  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const tx = body.transaction ?? body
  if (!tx?.type || !tx.amount || !tx.description) {
    return NextResponse.json({ error: 'transaction.type, amount, description gerekli' }, { status: 400 })
  }

  const amount = Number(tx.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'transaction.type, amount, description gerekli' }, { status: 400 })
  }
  if (amount > 10_000_000) {
    return NextResponse.json({ error: 'Tutar çok büyük' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const row = txToDb(
    { ...tx, id: tx.id && isUuid(tx.id) ? tx.id : crypto.randomUUID() } as FinanceTransaction,
    auth.tenantId,
    auth.userId,
  ) as Record<string, unknown>

  if (tx.account_id && isUuid(tx.account_id)) {
    row.account_id = tx.account_id
  }

  const { data: inserted, error: insErr } = await admin
    .from('financial_transactions')
    .insert(row)
    .select('id')
    .single()

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  const paymentMethod = normalizePaymentMethod(tx.payment_method)
  let newBalance: number | undefined
  if (paymentMethod === 'nakit') {
    const delta = tx.type === 'gelir' ? amount : -amount
    const { data: bal, error: kasaErr } = await admin.rpc('adjust_kasa_balance', {
      p_tenant_id: auth.tenantId,
      p_delta: delta,
    })
    if (kasaErr) {
      return NextResponse.json({ error: kasaErr.message, transaction_id: inserted?.id }, { status: 500 })
    }
    newBalance = Number(bal)
  }

  return NextResponse.json({
    ok: true,
    transaction_id: inserted?.id,
    account_id: row.account_id ?? null,
    new_balance: newBalance,
    kasa_balance: newBalance,
  })
}, 'tenant/transactions')

/**
 * GET /api/tenant/transactions
 * Canlı Defter (Ledger) İşlem Listesi
 *
 * Query:
 * - limit?: number (default 50)
 * - offset?: number (default 0)
 * - account_id?: string
 * - type?: 'gelir' | 'gider' | 'iade' | 'transfer' | 'mutabakat'
 * - search?: string
 * - from?: string (ISO)
 * - to?: string (ISO)
 */
export const GET = withApiHandler(async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { searchParams } = req.nextUrl
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 200)
  const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)
  const accountId = searchParams.get('account_id')
  const type = searchParams.get('type')
  const search = searchParams.get('search')?.trim()
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  let query = admin
    .from('financial_transactions')
    .select('id, type, amount, category, description, payment_method, account_id, target_account_id, service_id, customer_name, order_no, transaction_date, created_at', { count: 'exact' })
    .eq('tenant_id', auth.tenantId)
    .order('transaction_date', { ascending: false })

  if (accountId && isUuid(accountId)) {
    query = query.or(`account_id.eq.${accountId},target_account_id.eq.${accountId}`)
  }
  if (type) {
    query = query.eq('type', type)
  }
  if (from) {
    query = query.gte('transaction_date', from)
  }
  if (to) {
    query = query.lte('transaction_date', to)
  }
  if (search) {
    query = query.or(`description.ilike.%${search}%,customer_name.ilike.%${search}%,category.ilike.%${search}%`)
  }

  query = query.range(offset, offset + limit - 1)

  const { data, count, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    transactions: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  })
}, 'tenant/transactions')



