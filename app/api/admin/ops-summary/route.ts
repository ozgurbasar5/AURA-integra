export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getAdminDataClient } from '@/lib/supabase/admin-data'
import { getServiceClient } from '@/lib/supabase/service'
import { suggestInterventions, computeHealthScore } from '@/lib/admin/health-score'

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  const admin = getAdminDataClient()
  const service = getServiceClient()
  const now = new Date()
  const fourteenDays = new Date(now.getTime() + 14 * 86400000).toISOString().split('T')[0]
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000).toISOString()

  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [basvuruRes, overdueRes, expiringRes, webhookRes, tenantsRes, paidRes, ticketsRes] = await Promise.all([
    admin.from('basvurular').select('id', { count: 'exact', head: true }).eq('status', 'beklemede'),
    admin.from('tenant_payments').select('id, tenant_id, amount, tenants(company_name)').eq('status', 'overdue'),
    admin.from('tenants').select('id, company_name, subscription_end').eq('status', 'active').lte('subscription_end', fourteenDays),
    service?.from('webhook_failures').select('id', { count: 'exact', head: true }).gte('created_at', sevenDaysAgo) ?? Promise.resolve({ count: 0 }),
    admin.from('tenants').select('id, company_name, status, subscription_end, plan_id, subscription_plans(name)').eq('status', 'active'),
    admin.from('tenant_payments').select('tenant_id').gte('paid_at', thirtyDaysAgo.toISOString()),
    admin.from('support_tickets').select('tenant_id, status').gte('created_at', thirtyDaysAgo.toISOString()),
  ])

  const pendingBasvuru = basvuruRes.count ?? 0
  const overduePayments = overdueRes.data ?? []
  const expiringTenants = expiringRes.data ?? []
  const webhookCount = (webhookRes as { count?: number }).count ?? 0

  const overdueByTenant = new Map<string, number>()
  for (const p of overduePayments) {
    overdueByTenant.set(p.tenant_id, (overdueByTenant.get(p.tenant_id) ?? 0) + Number(p.amount))
  }
  const paidTenants = new Set((paidRes.data ?? []).map(p => p.tenant_id))
  const openTickets = (ticketsRes.data ?? []).filter(t => t.status !== 'closed' && t.status !== 'resolved')

  const atRisk = (tenantsRes.data ?? [])
    .map(t => {
      const overdue = overdueByTenant.get(t.id) ?? 0
      const subEnd = t.subscription_end ? new Date(t.subscription_end) : null
      const expiringSoon = subEnd && subEnd < new Date(Date.now() + 14 * 86400000)
      const tickets = openTickets.filter(x => x.tenant_id === t.id).length
      let riskScore = 0
      if (overdue > 0) riskScore += 40
      if (expiringSoon) riskScore += 25
      if (!paidTenants.has(t.id)) riskScore += 20
      if (tickets >= 3) riskScore += 15
      return {
        id: t.id,
        company_name: t.company_name,
        plan: (t.subscription_plans as { name?: string } | null)?.name ?? '—',
        overdue_amount: overdue,
        risk_score: Math.min(100, riskScore),
      }
    })
    .filter(t => t.risk_score >= 25)
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, 10)

  const alerts: Array<{ id: string; severity: 'critical' | 'warning' | 'info'; title: string; href: string; count?: number }> = []

  if (pendingBasvuru > 0) {
    alerts.push({ id: 'basvuru', severity: 'info', title: 'Bekleyen başvuru', href: '/admin/basvurular', count: pendingBasvuru })
  }
  if (overduePayments.length > 0) {
    alerts.push({ id: 'overdue', severity: 'critical', title: 'Gecikmiş ödeme', href: '/admin/odemeler', count: overduePayments.length })
  }
  if (expiringTenants.length > 0) {
    alerts.push({ id: 'expiring', severity: 'warning', title: 'Abonelik bitiyor (14g)', href: '/admin/bayiler', count: expiringTenants.length })
  }
  if (webhookCount > 0) {
    alerts.push({ id: 'webhook', severity: 'critical', title: 'Webhook hatası (7g)', href: '/admin/operasyon/webhook', count: webhookCount })
  }
  if (atRisk.length > 0) {
    alerts.push({ id: 'churn', severity: 'warning', title: 'Churn riski', href: '/admin', count: atRisk.length })
  }

  const interventions = atRisk.slice(0, 8).map(t => ({
    priority: t.risk_score >= 60 ? 'high' as const : 'medium' as const,
    message: t.overdue_amount > 0
      ? `${t.company_name}: ₺${t.overdue_amount.toLocaleString('tr-TR')} gecikmiş ödeme`
      : `${t.company_name}: churn riski yüksek`,
    action: t.overdue_amount > 0 ? 'Ödeme hatırlat' : 'Bayi incele',
    tenant_id: t.id,
    risk_score: t.risk_score,
  }))

  return NextResponse.json({
    alerts,
    interventions,
    at_risk: atRisk.slice(0, 10),
    stats: {
      pending_basvuru: pendingBasvuru,
      overdue_count: overduePayments.length,
      expiring_count: expiringTenants.length,
      webhook_failures_7d: webhookCount,
      at_risk_count: atRisk.length,
    },
  })
}
