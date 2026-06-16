export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getAdminDataClient } from '@/lib/supabase/admin-data'

export async function GET(request: Request) {
  const auth = await requireSuperAdmin(request as import('next/server').NextRequest)
  if (!auth.authorized) return auth.error

  const admin = getAdminDataClient()
  const today = new Date().toISOString().split('T')[0]
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [tenantsRes, overdueRes, paymentsRes, ticketsRes] = await Promise.all([
    admin.from('tenants').select('id, company_name, status, created_at, subscription_end, plan_id, subscription_plans(name)'),
    admin.from('tenant_payments').select('tenant_id, amount, due_date').eq('status', 'overdue'),
    admin.from('tenant_payments').select('tenant_id, paid_at').gte('paid_at', thirtyDaysAgo.toISOString()),
    admin.from('support_tickets').select('tenant_id, status, created_at').gte('created_at', thirtyDaysAgo.toISOString()),
  ])

  const tenants = tenantsRes.data ?? []
  const overdueByTenant = new Map<string, number>()
  for (const p of overdueRes.data ?? []) {
    overdueByTenant.set(p.tenant_id, (overdueByTenant.get(p.tenant_id) ?? 0) + Number(p.amount))
  }

  const paidTenants = new Set((paymentsRes.data ?? []).map(p => p.tenant_id))
  const openTickets = (ticketsRes.data ?? []).filter(t => t.status !== 'closed' && t.status !== 'resolved')

  const atRisk = tenants
    .filter(t => t.status === 'active')
    .map(t => {
      const overdue = overdueByTenant.get(t.id) ?? 0
      const subEnd = t.subscription_end ? new Date(t.subscription_end) : null
      const expiringSoon = subEnd && subEnd < new Date(Date.now() + 14 * 86400000)
      const noRecentPayment = !paidTenants.has(t.id)
      const tickets = openTickets.filter(x => x.tenant_id === t.id).length
      let riskScore = 0
      if (overdue > 0) riskScore += 40
      if (expiringSoon) riskScore += 25
      if (noRecentPayment) riskScore += 20
      if (tickets >= 3) riskScore += 15
      return {
        id: t.id,
        company_name: t.company_name,
        plan: (t.subscription_plans as { name?: string } | null)?.name ?? '—',
        overdue_amount: overdue,
        subscription_end: t.subscription_end,
        open_tickets: tickets,
        risk_score: Math.min(100, riskScore),
      }
    })
    .filter(t => t.risk_score >= 25)
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 20)

  return NextResponse.json({
    summary: {
      total_tenants: tenants.length,
      active: tenants.filter(t => t.status === 'active').length,
      overdue_count: overdueByTenant.size,
      at_risk_count: atRisk.length,
    },
    at_risk: atRisk,
  })
}
