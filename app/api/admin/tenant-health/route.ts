export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase/service'

import { computeHealthScore, suggestInterventions } from '@/lib/admin/health-score'

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const tenantId = request.nextUrl.searchParams.get('tenant_id')
  if (!tenantId) return NextResponse.json({ error: 'tenant_id gerekli' }, { status: 400 })

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [
    tenantRes,
    usersRes,
    ordersRes,
    paymentsRes,
    salesRes,
  ] = await Promise.all([
    admin.from('tenants').select('*, subscription_plans(name, price)').eq('id', tenantId).single(),
    admin.from('user_profiles').select('id, full_name, role, is_active, created_at').eq('tenant_id', tenantId),
    admin.from('service_orders').select('id', { count: 'exact', head: true }).eq('tenant_id', tenantId).gte('created_at', thirtyDaysAgo.toISOString()),
    admin.from('tenant_payments').select('status, amount, due_date').eq('tenant_id', tenantId).order('due_date', { ascending: false }).limit(5),
    admin.from('sales').select('total').eq('tenant_id', tenantId).gte('created_at', thirtyDaysAgo.toISOString()),
  ])

  if (tenantRes.error || !tenantRes.data) {
    return NextResponse.json({ error: 'Bayi bulunamadı' }, { status: 404 })
  }

  const revenue30d = (salesRes.data ?? []).reduce((s, r) => s + Number(r.total), 0)
  const activeUsers = (usersRes.data ?? []).filter(u => u.is_active).length
  const overdue = (paymentsRes.data ?? []).filter(p => p.status === 'overdue')

  const profiles = usersRes.data ?? []
  const lastLogin = profiles.reduce<Date | null>((acc, u) => {
    const d = u.created_at ? new Date(u.created_at) : null
    if (!d) return acc
    return !acc || d > acc ? d : acc
  }, null)
  const lastLoginDays = lastLogin ? Math.floor((Date.now() - lastLogin.getTime()) / 86400000) : null

  const healthBase = {
    active_users: activeUsers,
    total_users: profiles.length,
    orders_30d: ordersRes.count ?? 0,
    revenue_30d: revenue30d,
    overdue_payments: overdue.length,
    subscription_end: tenantRes.data.subscription_end,
    status: tenantRes.data.status,
    last_login_days: lastLoginDays,
  }

  const health_score = computeHealthScore(healthBase)
  const interventions = suggestInterventions(healthBase, tenantRes.data.company_name ?? 'Bayi')

  const { data: auditRows } = await admin
    .from('admin_audit_logs')
    .select('action, actor_email, created_at, metadata')
    .eq('target_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(8)

  return NextResponse.json({
    tenant: tenantRes.data,
    health: {
      ...healthBase,
      health_score,
    },
    interventions,
    audit_logs: auditRows ?? [],
  })
}
