export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import type { DashboardStats } from '@/types/database'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { withApiHandler } from '@/lib/api-handler'

export const GET = withApiHandler(async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const supabase = auth.supabase
  const tenantId = auth.tenantId

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

  const { data: revenueRows } = await supabase
    .from('financial_transactions')
    .select('amount')
    .eq('tenant_id', tenantId)
    .eq('type', 'gelir')
    .gte('transaction_date', monthStart)

  const monthly_revenue = (revenueRows ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0)

  const { data: expenseRows } = await supabase
    .from('financial_transactions')
    .select('amount')
    .eq('tenant_id', tenantId)
    .eq('type', 'gider')
    .gte('transaction_date', monthStart)

  const monthly_expenses = (expenseRows ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0)
  const net_profit = monthly_revenue - monthly_expenses

  const { data: pendingRows } = await supabase
    .from('service_orders')
    .select('actual_cost')
    .eq('tenant_id', tenantId)
    .in('status', ['alindi', 'teshis', 'onay_bekleniyor', 'tamir', 'kalite_kontrol'])
    .not('actual_cost', 'is', null)

  const pending_receivables = (pendingRows ?? []).reduce(
    (sum, r) => sum + (r.actual_cost ?? 0),
    0,
  )

  const { count: today_deliveries } = await supabase
    .from('service_orders')
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', 'teslim')
    .gte('closed_at', todayStart)
    .lt('closed_at', todayEnd)

  const statuses = ['alindi', 'teshis', 'tamir', 'kalite_kontrol', 'teslim'] as const

  const workshopCountsArr = await Promise.all(
    statuses.map(async (s) => {
      const { count } = await supabase
        .from('service_orders')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('status', s)
      return { status: s, count: count ?? 0 }
    }),
  )

  const workshop_counts = {
    alindi: workshopCountsArr.find((w) => w.status === 'alindi')?.count ?? 0,
    teshis: workshopCountsArr.find((w) => w.status === 'teshis')?.count ?? 0,
    tamir: workshopCountsArr.find((w) => w.status === 'tamir')?.count ?? 0,
    hazir: workshopCountsArr.find((w) => w.status === 'kalite_kontrol')?.count ?? 0,
    teslim: workshopCountsArr.find((w) => w.status === 'teslim')?.count ?? 0,
  }

  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6)
  sevenDaysAgo.setHours(0, 0, 0, 0)

  const { data: trendRows } = await supabase
    .from('financial_transactions')
    .select('amount, transaction_date')
    .eq('tenant_id', tenantId)
    .eq('type', 'gelir')
    .gte('transaction_date', sevenDaysAgo.toISOString())
    .order('transaction_date', { ascending: true })

  const trendMap = new Map<string, number>()
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    trendMap.set(d.toISOString().split('T')[0], 0)
  }
  for (const row of trendRows ?? []) {
    const key = row.transaction_date.split('T')[0]
    if (trendMap.has(key)) {
      trendMap.set(key, (trendMap.get(key) ?? 0) + row.amount)
    }
  }
  const revenue_trend = Array.from(trendMap.entries()).map(([date, amount]) => ({ date, amount }))

  const { data: brandRows } = await supabase
    .from('service_orders')
    .select('device_brand')
    .eq('tenant_id', tenantId)

  const brandMap = new Map<string, number>()
  for (const row of brandRows ?? []) {
    const b = row.device_brand ?? 'Diğer'
    brandMap.set(b, (brandMap.get(b) ?? 0) + 1)
  }
  const brand_distribution = Array.from(brandMap.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([brand, count]) => ({ brand, count }))

  const { data: stockSummary } = await supabase
    .from('tenant_stock_summary')
    .select('total_skus, low_stock_count, total_value')
    .eq('tenant_id', tenantId)
    .maybeSingle()

  const stats: DashboardStats & {
    stock_summary?: { total_skus: number; low_stock_count: number; total_value: number }
  } = {
    monthly_revenue,
    net_profit,
    pending_receivables,
    today_deliveries: today_deliveries ?? 0,
    workshop_counts,
    revenue_trend,
    brand_distribution,
    stock_summary: stockSummary
      ? {
          total_skus: stockSummary.total_skus,
          low_stock_count: stockSummary.low_stock_count,
          total_value: Number(stockSummary.total_value),
        }
      : undefined,
  }

  return NextResponse.json({ data: stats })
}, 'dashboard/stats')
