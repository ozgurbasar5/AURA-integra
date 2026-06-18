export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { verifyCronRequest } from '@/lib/cron-auth'
import { getServerAppUrl } from '@/lib/app-url'
import { computeHealthScore, suggestInterventions } from '@/lib/admin/health-score'
import { sendMail } from '@/lib/mail'
import { writeAuditLog } from '@/lib/audit-log'
import { wasCronActionSentToday } from '@/lib/cron-idempotency'

/** Risk skoru düşük bayilere otomatik e-posta + admin görev kaydı */
export async function GET(req: NextRequest) {
  const denied = verifyCronRequest(req)
  if (denied) return denied

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  const appUrl = getServerAppUrl()
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: tenants } = await admin
    .from('tenants')
    .select('id, company_name, email, contact_name, status, subscription_end')
    .in('status', ['active', 'trial'])

  const results: { tenant_id: string; score: number; sent?: boolean; skipped?: boolean; error?: string }[] = []

  for (const t of tenants ?? []) {
    const already = await wasCronActionSentToday('churn_intervention_cron', t.id)
    if (already) {
      results.push({ tenant_id: t.id, score: 0, skipped: true })
      continue
    }

    const [usersRes, ordersRes, salesRes, paymentsRes] = await Promise.all([
      admin.from('user_profiles').select('id, is_active, created_at').eq('tenant_id', t.id),
      admin.from('service_orders').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id).gte('created_at', thirtyDaysAgo.toISOString()),
      admin.from('sales').select('total').eq('tenant_id', t.id).gte('created_at', thirtyDaysAgo.toISOString()),
      admin.from('tenant_payments').select('status').eq('tenant_id', t.id),
    ])

    const profiles = usersRes.data ?? []
    const activeUsers = profiles.filter(u => u.is_active).length
    const revenue30d = (salesRes.data ?? []).reduce((s, r) => s + Number(r.total), 0)
    const overdue = (paymentsRes.data ?? []).filter(p => p.status === 'overdue').length
    const lastLogin = profiles.reduce<Date | null>((acc, u) => {
      const d = u.created_at ? new Date(u.created_at) : null
      if (!d) return acc
      return !acc || d > acc ? d : acc
    }, null)
    const lastLoginDays = lastLogin ? Math.floor((Date.now() - lastLogin.getTime()) / 86400000) : null

    const healthBase = {
      active_users: activeUsers,
      orders_30d: ordersRes.count ?? 0,
      revenue_30d: revenue30d,
      overdue_payments: overdue,
      subscription_end: t.subscription_end,
      status: t.status,
      last_login_days: lastLoginDays,
    }

    const score = computeHealthScore(healthBase)
    if (score >= 50) continue

    const interventions = suggestInterventions(healthBase, t.company_name ?? 'Bayi')
    const email = t.email
    const entry: (typeof results)[number] = { tenant_id: t.id, score }

    if (email && interventions.length > 0) {
      const html = `
        <p>Merhaba ${t.contact_name ?? t.company_name},</p>
        <p>AURA İntegra hesabınızda kullanım düşüklüğü tespit edildi (sağlık skoru: ${score}/100).</p>
        <ul>${interventions.map(i => `<li>${i.message}</li>`).join('')}</ul>
        <p><a href="${appUrl}/dashboard">Panele git</a> · <a href="${appUrl}/dashboard/destek">Destek</a></p>
      `
      const mail = await sendMail({
        to: email,
        subject: `AURA İntegra — ${t.company_name} hesap desteği`,
        html,
      })
      entry.sent = mail.ok
      if (!mail.ok) entry.error = mail.error
    }

    await writeAuditLog({
      action: 'churn_intervention_cron',
      targetType: 'tenant',
      targetId: t.id,
      metadata: { score, interventions: interventions.map(i => i.message), email_sent: entry.sent ?? false },
    })

    results.push(entry)
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    emailed: results.filter(r => r.sent).length,
    results,
  })
}
