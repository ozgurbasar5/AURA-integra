export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase/service'

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

  return NextResponse.json({
    tenant: tenantRes.data,
    health: {
      active_users: activeUsers,
      total_users: usersRes.data?.length ?? 0,
      orders_30d: ordersRes.count ?? 0,
      revenue_30d: revenue30d,
      overdue_payments: overdue.length,
      subscription_end: tenantRes.data.subscription_end,
      status: tenantRes.data.status,
    },
  })
}
