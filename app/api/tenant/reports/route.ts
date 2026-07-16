export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { requireTenantPlanLevel } from '@/lib/tenant-plan-guard'
import {
  aggregateCategories,
  aggregateMonthly,
  buildVatFromApi,
  summarizeFinance,
  type ReportTx,
} from '@/lib/reports-aggregate'

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const plan = await requireTenantPlanLevel(auth.supabase, auth.tenantId, 3)
  if (!plan.ok) {
    return NextResponse.json({ error: plan.message }, { status: plan.status })
  }

  const { supabase, tenantId } = auth
  const twelveMonthsAgo = new Date()
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)
  const since = twelveMonthsAgo.toISOString().slice(0, 10)
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [txRes, salesRes, partsRes, shiftsRes, statusRes, personnelRes, ordersRes, revenueRes] =
    await Promise.all([
      supabase
        .from('financial_transactions')
        .select('type, amount, category, transaction_date, created_at')
        .eq('tenant_id', tenantId)
        .gte('transaction_date', since)
        .order('transaction_date', { ascending: false })
        .limit(5000),
      supabase
        .from('sales')
        .select('total, subtotal, vat_amount, total_with_vat, created_at, items')
        .eq('tenant_id', tenantId)
        .gte('created_at', twelveMonthsAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(500),
      supabase
        .from('parts')
        .select('stock_qty, min_stock, purchase_price, sale_price')
        .eq('tenant_id', tenantId)
        .limit(2000),
      supabase
        .from('cash_shifts')
        .select('id, opened_at, closed_at, opened_by, closed_by, difference, status, closing_cash, expected_cash')
        .eq('tenant_id', tenantId)
        .eq('status', 'closed')
        .order('closed_at', { ascending: false })
        .limit(30),
      supabase.from('service_status_distribution').select('*').eq('tenant_id', tenantId),
      supabase
        .from('personnel_profiles')
        .select('full_name, completed_month, role')
        .eq('tenant_id', tenantId)
        .eq('is_active', true),
      supabase
        .from('service_orders')
        .select('status')
        .eq('tenant_id', tenantId)
        .gte('created_at', thirtyDaysAgo.toISOString()),
      supabase
        .from('daily_revenue_summary')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('day', thirtyDaysAgo.toISOString().slice(0, 10))
        .order('day'),
    ])

  const txs: ReportTx[] = (txRes.data ?? []).map(r => ({
    type: String(r.type ?? ''),
    amount: Number(r.amount) || 0,
    category: r.category != null ? String(r.category) : null,
    date: String(r.transaction_date ?? r.created_at ?? '').slice(0, 10),
  }))

  const finance = summarizeFinance(txs)
  const monthly = aggregateMonthly(txs, 12)
  const categories = aggregateCategories(txs, 6)
  const vat = buildVatFromApi(txs, salesRes.data ?? [])

  const parts = partsRes.data ?? []
  let totalStockValue = 0
  let criticalStockCount = 0
  for (const p of parts) {
    const qty = Number(p.stock_qty) || 0
    const price = Number(p.purchase_price) || Number(p.sale_price) || 0
    totalStockValue += qty * price
    const min = Number(p.min_stock) || 0
    if (qty <= min) criticalStockCount += 1
  }

  const revenueByDay = (revenueRes.data ?? []).map(r => ({
    day: String(r.transaction_date ?? r.day ?? ''),
    revenue: Number(r.total_gelir ?? r.total_revenue ?? r.revenue ?? 0),
    expense: Number(r.total_gider ?? r.expense ?? 0),
    orders: Number(r.order_count ?? 0),
  }))

  const statusDist = (statusRes.data ?? []).map(r => ({
    status: String(r.status ?? ''),
    count: Number(r.count ?? 0),
  }))

  const technicianWorkload = (personnelRes.data ?? [])
    .filter(p => p.role === 'teknisyen')
    .map(p => ({
      name: p.full_name,
      completed_month: Number(p.completed_month ?? 0),
    }))
    .sort((a, b) => b.completed_month - a.completed_month)
    .slice(0, 10)

  const openOrders = (ordersRes.data ?? []).filter(
    o => !['teslim', 'delivered', 'iptal', 'cancelled'].includes(String(o.status)),
  ).length

  const sales30d = (salesRes.data ?? []).filter(
    s => new Date(String(s.created_at)).getTime() >= thirtyDaysAgo.getTime(),
  )
  const revenue30d =
    revenueByDay.reduce((s, r) => s + r.revenue, 0) ||
    sales30d.reduce((s, r) => s + Number(r.total), 0)

  const closedShifts = (shiftsRes.data ?? []).map(s => ({
    id: s.id,
    opened_at: s.opened_at,
    closed_at: s.closed_at,
    opened_by: s.opened_by,
    closed_by: s.closed_by,
    difference: Number(s.difference) || 0,
    closing_cash: s.closing_cash != null ? Number(s.closing_cash) : null,
    expected_cash: s.expected_cash != null ? Number(s.expected_cash) : null,
  }))

  return NextResponse.json({
    ok: true,
    source: 'api',
    revenue_by_day: revenueByDay,
    monthly,
    categories,
    vat,
    status_distribution: statusDist,
    technician_workload: technicianWorkload,
    closed_shifts: closedShifts,
    summary: {
      totalGelir: finance.totalGelir,
      totalGider: finance.totalGider,
      netKar: finance.netKar,
      totalStockValue,
      criticalStockCount,
      totalStockItems: parts.length,
      salesCount: (salesRes.data ?? []).length,
      txCount: finance.txCount,
      revenue_30d: revenue30d,
      sales_count_30d: sales30d.length,
      open_service_orders: openOrders,
    },
    errors: {
      transactions: txRes.error?.message ?? null,
      sales: salesRes.error?.message ?? null,
      parts: partsRes.error?.message ?? null,
    },
  })
}
