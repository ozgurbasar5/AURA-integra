export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canPushFinance } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { data, error } = await auth.supabase
    .from('cash_shifts')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('opened_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canPushFinance(auth.role)) {
    return NextResponse.json({ error: 'Kasa yetkisi yok' }, { status: 403 })
  }

  let body: { action: 'open' | 'close'; opening_balance?: number; closing_balance?: number; opened_by?: string; closed_by?: string; notes?: string; shift_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  if (body.action === 'open') {
    const { data: existing } = await admin
      .from('cash_shifts')
      .select('id')
      .eq('tenant_id', auth.tenantId)
      .eq('status', 'open')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Açık vardiya zaten var' }, { status: 409 })
    }

    const row = {
      id: crypto.randomUUID(),
      tenant_id: auth.tenantId,
      status: 'open',
      opening_balance: Number(body.opening_balance) || 0,
      opened_by: body.opened_by ?? auth.userId,
      opened_at: new Date().toISOString(),
    }

    const { data, error } = await admin.from('cash_shifts').insert(row).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, shift: data })
  }

  if (body.action === 'close') {
    const { data: openShift, error: findErr } = await admin
      .from('cash_shifts')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .eq('status', 'open')
      .maybeSingle()

    if (findErr || !openShift) {
      return NextResponse.json({ error: 'Açık vardiya bulunamadı' }, { status: 404 })
    }

    const closing = Number(body.closing_balance) || 0
    const opening = Number(openShift.opening_balance) || 0
    const closedAt = new Date().toISOString()
    const openedAt = String(openShift.opened_at || '')

    // Vardiya süresindeki nakit hareketler → beklenen kasa
    const { data: nakitTxs } = await admin
      .from('financial_transactions')
      .select('type, amount, payment_method, category')
      .eq('tenant_id', auth.tenantId)
      .eq('payment_method', 'nakit')
      .gte('transaction_date', openedAt)
      .lte('transaction_date', closedAt)

    const CARI = new Set(['Cari Borç', 'Cari Tahsilat'])
    let nakitNet = 0
    for (const t of nakitTxs ?? []) {
      if (CARI.has(String(t.category ?? ''))) continue
      const amt = Number(t.amount) || 0
      if (t.type === 'gelir') nakitNet += amt
      else if (t.type === 'gider') nakitNet -= amt
    }
    const expected = opening + nakitNet
    const difference = closing - expected

    // Snapshot için işlem/satış/sipariş özeti (EOD API ile aynı mantık — kapanışta kalıcı)
    let reportSnapshot: Record<string, unknown> | null = null
    try {
      const { buildShiftReportFromDb } = await import('@/lib/eod-report-from-db')
      const [txRes, salesRes, ordersRes, tenantRes] = await Promise.all([
        admin
          .from('financial_transactions')
          .select('type, amount, category, description, payment_method, transaction_date, created_at')
          .eq('tenant_id', auth.tenantId)
          .gte('transaction_date', openedAt.slice(0, 10))
          .limit(3000),
        admin
          .from('sales')
          .select('total, total_with_vat, subtotal, net_profit, cost_price, created_at')
          .eq('tenant_id', auth.tenantId)
          .gte('created_at', openedAt)
          .lte('created_at', closedAt)
          .limit(1000),
        admin
          .from('service_orders')
          .select('status, created_at, updated_at, actual_cost, estimated_cost')
          .eq('tenant_id', auth.tenantId)
          .limit(1000),
        admin.from('tenants').select('shop_name, company_name').eq('id', auth.tenantId).maybeSingle(),
      ])
      reportSnapshot = buildShiftReportFromDb({
        shift: {
          id: String(openShift.id),
          opened_at: openedAt,
          closed_at: closedAt,
          opened_by: openShift.opened_by,
          closed_by: body.closed_by ?? auth.userId,
          opening_balance: opening,
          closing_balance: closing,
          expected_cash: expected,
          difference,
        },
        shopName: String(tenantRes.data?.shop_name || tenantRes.data?.company_name || 'Mağaza'),
        transactions: (txRes.data ?? []).map(t => ({
          type: String(t.type),
          amount: Number(t.amount) || 0,
          category: t.category,
          description: t.description,
          payment_method: t.payment_method,
          transaction_date: t.transaction_date,
          created_at: t.created_at,
        })),
        sales: salesRes.data ?? [],
        orders: ordersRes.data ?? [],
      }) as unknown as Record<string, unknown>
    } catch {
      reportSnapshot = null
    }

    const { data, error } = await admin
      .from('cash_shifts')
      .update({
        status: 'closed',
        closing_balance: closing,
        expected_cash: expected,
        difference,
        closed_by: body.closed_by ?? auth.userId,
        closed_at: closedAt,
        notes: body.notes ?? null,
        ...(reportSnapshot ? { report_snapshot: reportSnapshot } : {}),
      })
      .eq('id', openShift.id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, shift: data, expected_cash: expected, report: reportSnapshot })
  }

  return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 })
}
