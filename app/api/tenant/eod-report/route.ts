export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { requireTenantPlanLevel } from '@/lib/tenant-plan-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { buildShiftReportFromDb } from '@/lib/eod-report-from-db'

export async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const plan = await requireTenantPlanLevel(auth.supabase, auth.tenantId, 2)
  if (!plan.ok) {
    return NextResponse.json({ error: plan.message }, { status: plan.status })
  }

  const shiftId = req.nextUrl.searchParams.get('shiftId')
  if (!shiftId) {
    return NextResponse.json({ error: 'shiftId gerekli' }, { status: 400 })
  }

  const { supabase, tenantId } = auth
  const { data: shift, error } = await supabase
    .from('cash_shifts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', shiftId)
    .maybeSingle()

  if (error || !shift) {
    return NextResponse.json({ error: 'Vardiya bulunamadı' }, { status: 404 })
  }

  const snapshot = shift.report_snapshot as Record<string, unknown> | null
  if (snapshot && typeof snapshot === 'object' && snapshot.meta) {
    return NextResponse.json({ ok: true, report: snapshot, source: 'snapshot' })
  }

  const from = String(shift.opened_at)
  const to = String(shift.closed_at ?? new Date().toISOString())

  const [txRes, salesRes, ordersRes, tenantRes] = await Promise.all([
    supabase
      .from('financial_transactions')
      .select('type, amount, category, description, payment_method, transaction_date, created_at')
      .eq('tenant_id', tenantId)
      .gte('transaction_date', from.slice(0, 10))
      .lte('transaction_date', to.slice(0, 10) + 'T23:59:59.999Z')
      .limit(3000),
    supabase
      .from('sales')
      .select('total, total_with_vat, subtotal, net_profit, cost_price, created_at')
      .eq('tenant_id', tenantId)
      .gte('created_at', from)
      .lte('created_at', to)
      .limit(1000),
    supabase
      .from('service_orders')
      .select('status, created_at, updated_at, actual_cost, estimated_cost')
      .eq('tenant_id', tenantId)
      .or(`created_at.gte.${from},updated_at.gte.${from}`)
      .limit(1000),
    supabase.from('tenants').select('shop_name, company_name').eq('id', tenantId).maybeSingle(),
  ])

  const shopName = String(tenantRes.data?.shop_name || tenantRes.data?.company_name || 'Mağaza')
  const report = buildShiftReportFromDb({
    shift: {
      id: String(shift.id),
      opened_at: from,
      closed_at: shift.closed_at,
      opened_by: shift.opened_by,
      closed_by: shift.closed_by,
      opening_balance: Number(shift.opening_balance),
      closing_balance: shift.closing_balance != null ? Number(shift.closing_balance) : null,
      expected_cash: shift.expected_cash != null ? Number(shift.expected_cash) : null,
      difference: shift.difference != null ? Number(shift.difference) : null,
    },
    shopName,
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
  })

  // Kapalı vardiyada snapshot sakla (sonraki çağrılar hızlı)
  if (shift.status === 'closed') {
    const admin = getServiceClient()
    if (admin) {
      await admin
        .from('cash_shifts')
        .update({
          report_snapshot: report,
          expected_cash: report.cash.expected_cash,
        })
        .eq('id', shiftId)
        .eq('tenant_id', tenantId)
    }
  }

  return NextResponse.json({ ok: true, report, source: 'api' })
}
