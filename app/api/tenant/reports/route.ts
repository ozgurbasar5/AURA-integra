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

  const [revenueRes, statusRes, salesRes, personnelRes, ordersRes] = await Promise.all([
    supabase.from('daily_revenue_summary').select('*').eq('tenant_id', tenantId).gte('day', thirtyDaysAgo.toISOString().slice(0, 10)).order('day'),
    supabase.from('service_status_distribution').select('*').eq('tenant_id', tenantId),
    supabase.from('sales').select('total, created_at, items').eq('tenant_id', tenantId).gte('created_at', thirtyDaysAgo.toISOString()).order('created_at', { ascending: false }).limit(100),
    supabase.from('personnel_profiles').select('full_name, completed_month, role').eq('tenant_id', tenantId).eq('is_active', true),
    supabase.from('service_orders').select('status, technician_id').eq('tenant_id', tenantId).gte('created_at', thirtyDaysAgo.toISOString()),
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

  const technicianWorkload = (personnelRes.data ?? [])
    .filter(p => p.role === 'teknisyen')
    .map(p => ({
      name: p.full_name,
      completed_month: Number(p.completed_month ?? 0),
    }))
    .sort((a, b) => b.completed_month - a.completed_month)
    .slice(0, 10)

  const openOrders = (ordersRes.data ?? []).filter(o => !['teslim', 'delivered', 'iptal', 'cancelled'].includes(String(o.status))).length

  return NextResponse.json({
    ok: true,
    revenue_by_day: revenueByDay,
    status_distribution: statusDist,
    technician_workload: technicianWorkload,
    summary: {
      revenue_30d: totalRevenue30d || totalSales30d,
      sales_count_30d: salesRes.data?.length ?? 0,
      open_service_orders: openOrders,
    },
  })
}
