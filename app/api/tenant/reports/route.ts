export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { requireTenantPlanLevel } from '@/lib/tenant-plan-guard'

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

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [revenueRes, statusRes, salesRes] = await Promise.all([
    supabase.from('daily_revenue_summary').select('*').eq('tenant_id', tenantId).gte('day', thirtyDaysAgo.toISOString().slice(0, 10)).order('day'),
    supabase.from('service_status_distribution').select('*').eq('tenant_id', tenantId),
    supabase.from('sales').select('total, created_at, items').eq('tenant_id', tenantId).gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: false }).limit(100),
  ])

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

  const totalRevenue30d = revenueByDay.reduce((s, r) => s + r.revenue, 0)
  const totalSales30d = (salesRes.data ?? []).reduce((s, r) => s + Number(r.total), 0)

  return NextResponse.json({
    ok: true,
    revenue_by_day: revenueByDay,
    status_distribution: statusDist,
    summary: {
      revenue_30d: totalRevenue30d || totalSales30d,
      sales_count_30d: salesRes.data?.length ?? 0,
    },
  })
}
