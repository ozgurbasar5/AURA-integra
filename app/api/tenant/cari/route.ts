export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canPushFinance, canWriteTenantData } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { normalizePaymentMethod } from '@/lib/payment-method'

/** Cari defter — financial_transactions (Cari Borç / Cari Tahsilat) üzerinden */

export async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const customer = req.nextUrl.searchParams.get('customer')?.trim()

  let query = auth.supabase
    .from('financial_transactions')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .in('category', ['Cari Borç', 'Cari Tahsilat', 'Veresiye'])
    .order('transaction_date', { ascending: false })
    .limit(300)

  if (customer) {
    query = query.ilike('customer_name', `%${customer}%`)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = data ?? []
  const balances = new Map<string, { customer_name: string; borc: number; tahsilat: number; bakiye: number }>()
  for (const r of rows) {
    const name = String(r.customer_name || '—')
    const cur = balances.get(name) || { customer_name: name, borc: 0, tahsilat: 0, bakiye: 0 }
    const amt = Number(r.amount) || 0
    if (r.category === 'Cari Tahsilat' || (r.type === 'gelir' && r.category === 'Veresiye')) {
      cur.tahsilat += amt
    } else {
      cur.borc += amt
    }
    cur.bakiye = cur.borc - cur.tahsilat
    balances.set(name, cur)
  }

  return NextResponse.json({
    ok: true,
    ledger: rows,
    balances: Array.from(balances.values()).sort((a, b) => b.bakiye - a.bakiye),
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canPushFinance(auth.role) && !canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Cari yetkisi yok' }, { status: 403 })
  }

  let body: {
    action?: 'borc' | 'tahsilat'
    customer_name?: string
    amount?: number
    description?: string
    payment_method?: string
    order_no?: string
    service_id?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const amount = Number(body.amount)
  if (!body.customer_name?.trim() || !amount || amount <= 0) {
    return NextResponse.json({ error: 'customer_name ve amount gerekli' }, { status: 400 })
  }

  const action = body.action === 'tahsilat' ? 'tahsilat' : 'borc'
  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const paymentMethod = normalizePaymentMethod(body.payment_method || (action === 'tahsilat' ? 'nakit' : 'veresiye'))
  const row = {
    id: crypto.randomUUID(),
    tenant_id: auth.tenantId,
    type: action === 'tahsilat' ? 'gelir' : 'gider',
    description: body.description || (action === 'tahsilat' ? 'Cari tahsilat' : 'Veresiye / cari borç'),
    category: action === 'tahsilat' ? 'Cari Tahsilat' : 'Cari Borç',
    amount,
    payment_method: paymentMethod,
    transaction_date: new Date().toISOString(),
    customer_name: body.customer_name.trim(),
    order_no: body.order_no || null,
    service_id: body.service_id || null,
    created_by: auth.userId,
  }

  const { data, error } = await admin.from('financial_transactions').insert(row).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let kasaBalance: number | undefined
  if (action === 'tahsilat' && paymentMethod === 'nakit') {
    const { data: bal } = await admin.rpc('adjust_kasa_balance', {
      p_tenant_id: auth.tenantId,
      p_delta: amount,
    })
    if (bal != null) kasaBalance = Number(bal)
  }

  return NextResponse.json({ ok: true, entry: data, kasa_balance: kasaBalance }, { status: 201 })
}
