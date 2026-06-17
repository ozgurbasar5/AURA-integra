export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'

/** Bayi abonelik özeti — plan, bitiş tarihi, ödeme geçmişi */
export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const [{ data: tenant, error: tenantErr }, { count: activeUsers }] = await Promise.all([
    admin
      .from('tenants')
      .select('status, subscription_end, subscription_start, plan_id, subscription_plans(name, price, max_users, features)')
      .eq('id', auth.tenantId)
      .single(),
    admin
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('tenant_id', auth.tenantId)
      .eq('is_active', true),
  ])

  if (tenantErr || !tenant) {
    return NextResponse.json({ error: tenantErr?.message ?? 'Bayi bulunamadı' }, { status: 404 })
  }

  const plan = tenant.subscription_plans as {
    name?: string
    price?: number
    max_users?: number
    features?: string[] | Record<string, unknown>
  } | null

  const { data: payments } = await admin
    .from('tenant_payments')
    .select('id, amount, status, due_date, paid_at, payment_method, notes')
    .eq('tenant_id', auth.tenantId)
    .order('due_date', { ascending: false })
    .limit(12)

  const features = Array.isArray(plan?.features)
    ? plan.features
    : plan?.features
      ? Object.keys(plan.features)
      : []

  return NextResponse.json({
    status: tenant.status,
    subscription_end: tenant.subscription_end,
    subscription_start: tenant.subscription_start,
    plan: {
      id: tenant.plan_id,
      name: plan?.name ?? 'Deneme',
      price: plan?.price ?? 0,
      max_users: plan?.max_users ?? 5,
      features,
    },
    usage: {
      active_users: activeUsers ?? 0,
      max_users: plan?.max_users ?? 5,
    },
    payments: payments ?? [],
  })
}
