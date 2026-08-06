export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { tenantQuery } from '@/lib/supabase/query-helpers'
import { canPushFinance } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { txToDb } from '@/lib/db-mappers'
import { normalizePaymentMethod } from '@/lib/payment-method'
import { withApiHandler } from '@/lib/api-handler'
import type { FinanceTransaction } from '@/lib/store'

export const POST = withApiHandler(async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canPushFinance(auth.role)) {
    return NextResponse.json({ error: 'Finans yazma yetkisi yok' }, { status: 403 })
  }

  let body: { transaction?: Omit<FinanceTransaction, 'id'> & { id?: string } }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const tx = body.transaction
  if (!tx?.type || !tx.amount || !tx.description) {
    return NextResponse.json({ error: 'transaction.type, amount, description gerekli' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const row = txToDb(
    { ...tx, id: tx.id && isUuid(tx.id) ? tx.id : crypto.randomUUID() } as FinanceTransaction,
    auth.tenantId,
    auth.userId,
  ) as Record<string, unknown>

  const { data: inserted, error: insErr } = await admin
    .from('financial_transactions')
    .insert(row)
    .select('id')
    .single()

  if (insErr) {
    return NextResponse.json({ error: insErr.message }, { status: 500 })
  }

  // Nakit kasa yalnızca nakit ödemelerde değişir (kart/havale/veresiye kasaya girmez)
  const paymentMethod = normalizePaymentMethod(tx.payment_method)
  let newBalance: number | undefined
  if (paymentMethod === 'nakit') {
    const delta = tx.type === 'gelir' ? Number(tx.amount) : -Number(tx.amount)
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
    kasa_balance: newBalance,
  })
}, 'tenant/transactions')
