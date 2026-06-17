export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import type { DashboardStats } from '@/types/database'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'

export async function GET() {
  try {
    const auth = await requireTenantAuth()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status })
    }

    const supabase = auth.supabase
    const tenantId = auth.tenantId

    // Date helpers
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

    // ── Monthly revenue (financial_transactions type=gelir) ─────────────────
    const { data: revenueRows } = await supabase
      .from('financial_transactions')
      .select('amount')
      .eq('tenant_id', tenantId)
      .eq('type', 'gelir')
      .gte('transaction_date', monthStart)

    const monthly_revenue = (revenueRows ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0)

    // ── Monthly expenses ────────────────────────────────────────────────────
    const { data: expenseRows } = await supabase
      .from('financial_transactions')
      .select('amount')
      .eq('tenant_id', tenantId)
      .eq('type', 'gider')
      .gte('transaction_date', monthStart)

    const monthly_expenses = (expenseRows ?? []).reduce((sum, r) => sum + (r.amount ?? 0), 0)

    const net_profit = monthly_revenue - monthly_expenses

    // ── Pending receivables (service_orders actual_cost not paid) ───────────
    const { data: pendingRows } = await supabase
      .from('service_orders')
      .select('actual_cost')
      .eq('tenant_id', tenantId)
      .in('status', ['alindi', 'teshis', 'onay_bekleniyor', 'tamir', 'kalite_kontrol'])
      .not('actual_cost', 'is', null)

    const pending_receivables = (pendingRows ?? []).reduce(
      (sum, r) => sum + (r.actual_cost ?? 0),
      0
    )

    // ── Today's deliveries ──────────────────────────────────────────────────
    const { count: today_deliveries } = await supabase
      .from('service_orders')
      .select('*', { count: 'exact', head: true })
      .eq('tenant_id', tenantId)
      .eq('status', 'teslim')
      .gte('closed_at', todayStart)
      .lt('closed_at', todayEnd)

    // ── Workshop counts by status ────────────────────────────────────────────
    const statuses = ['alindi', 'teshis', 'tamir', 'kalite_kontrol', 'teslim'] as const

    const workshopCountsArr = await Promise.all(
      statuses.map(async (s) => {
        const { count } = await supabase
          .from('service_orders')
          .select('*', { count: 'exact', head: true })
          .eq('tenant_id', tenantId)
          .eq('status', s)
        return { status: s, count: count ?? 0 }
      })
    )

    const workshop_counts = {
      alindi: workshopCountsArr.find((w) => w.status === 'alindi')?.count ?? 0,
      teshis: workshopCountsArr.find((w) => w.status === 'teshis')?.count ?? 0,
      tamir: workshopCountsArr.find((w) => w.status === 'tamir')?.count ?? 0,
      hazir: workshopCountsArr.find((w) => w.status === 'kalite_kontrol')?.count ?? 0, // kalite_kontrol = teslime yakın
      teslim: workshopCountsArr.find((w) => w.status === 'teslim')?.count ?? 0,
    }

    // ── Revenue trend (last 7 days) ─────────────────────────────────────────
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

    // Aggregate by date
    const trendMap = new Map<string, number>()
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      trendMap.set(key, 0)
    }
    for (const row of trendRows ?? []) {
      const key = row.transaction_date.split('T')[0]
      if (trendMap.has(key)) {
        trendMap.set(key, (trendMap.get(key) ?? 0) + row.amount)
      }
    }
    const revenue_trend = Array.from(trendMap.entries()).map(([date, amount]) => ({ date, amount }))

    // ── Brand distribution (top 5) ──────────────────────────────────────────
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

    const stats: DashboardStats = {
      monthly_revenue,
      net_profit,
      pending_receivables,
      today_deliveries: today_deliveries ?? 0,
      workshop_counts,
      revenue_trend,
      brand_distribution,
    }

    return NextResponse.json({ data: stats })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
