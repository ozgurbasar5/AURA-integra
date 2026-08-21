'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { txToDb } from '@/lib/db-mappers'
import { normalizePaymentMethod } from '@/lib/payment-method'
import { canPushFinance } from '@/lib/api-role-guard'
import type { FinanceTransaction } from '@/lib/store'

export type CreateFinanceTransactionInput = {
  type: 'gelir' | 'gider'
  description: string
  category: string
  amount: number
  payment_method: string
  date?: string
  customer_name?: string
}

export async function createFinanceTransactionAction(input: CreateFinanceTransactionInput) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return { ok: false as const, error: auth.message }
  }

  const { tenantId, userId, role } = auth

  if (!canPushFinance(role)) {
    return { ok: false as const, error: 'Finans yazma yetkisi yok' }
  }

  const admin = getServiceClient()
  if (!admin) {
    return { ok: false as const, error: 'Service role gerekli' }
  }

  const tx: FinanceTransaction = {
    id: crypto.randomUUID(),
    type: input.type,
    description: input.description,
    category: input.category,
    amount: input.amount,
    payment_method: input.payment_method,
    date: input.date ?? new Date().toISOString(),
    customer_name: input.customer_name,
  }

  const row = txToDb(tx, tenantId, userId) as Record<string, unknown>

  const { error: insErr } = await admin.from('financial_transactions').insert(row)
  if (insErr) {
    return { ok: false as const, error: insErr.message }
  }

  let kasaBalance: number | undefined
  const paymentMethod = normalizePaymentMethod(input.payment_method)
  if (paymentMethod === 'nakit') {
    const delta = input.type === 'gelir' ? input.amount : -input.amount
    const { data: bal, error: kasaErr } = await admin.rpc('adjust_kasa_balance', {
      p_tenant_id: tenantId,
      p_delta: delta,
    })
    if (kasaErr) {
      return { ok: false as const, error: kasaErr.message }
    }
    kasaBalance = Number(bal)
  }

  revalidatePath('/dashboard/finans')
  revalidatePath('/dashboard/kasa')

  return { ok: true as const, transaction_id: tx.id, kasa_balance: kasaBalance }
}
