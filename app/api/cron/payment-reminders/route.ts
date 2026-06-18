export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { verifyCronRequest } from '@/lib/cron-auth'
import { getServerAppUrl } from '@/lib/app-url'
import { sendMail, paymentReminderEmail } from '@/lib/mail'
import { writeAuditLog } from '@/lib/audit-log'
import { wasPaymentReminderSentToday } from '@/lib/cron-idempotency'

type PaymentRow = {
  id: string
  tenant_id: string
  amount: number
  due_date: string
  status: string
  tenants: { company_name: string; email: string; contact_name: string | null; subscription_end: string | null } | { company_name: string; email: string; contact_name: string | null; subscription_end: string | null }[] | null
}

function resolveTenant(row: PaymentRow) {
  const t = row.tenants
  if (!t) return null
  return Array.isArray(t) ? t[0] ?? null : t
}

async function getPlatformSettings(admin: NonNullable<ReturnType<typeof getServiceClient>>) {
  const { data } = await admin.from('platform_settings').select('settings').eq('id', 'default').maybeSingle()
  const settings = (data?.settings ?? {}) as Record<string, unknown>
  return {
    remindDays: Math.max(1, Number(settings.odeme_hatirlama ?? 7) || 7),
    emailEnabled: settings.email_bildirim !== false,
  }
}

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Vercel Cron — vadesi yaklaşan ve gecikmiş ödemeler için otomatik e-posta */
export async function GET(req: NextRequest) {
  const denied = verifyCronRequest(req)
  if (denied) return denied

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  const { remindDays, emailEnabled } = await getPlatformSettings(admin)
  if (!emailEnabled) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'email_bildirim kapalı' })
  }

  const appUrl = getServerAppUrl()
  const today = new Date()
  const target = new Date(today)
  target.setDate(target.getDate() + remindDays)
  const targetDate = dateOnly(target)

  const { data: upcoming } = await admin
    .from('tenant_payments')
    .select('id, tenant_id, amount, due_date, status, tenants(company_name, email, contact_name, subscription_end)')
    .eq('status', 'pending')
    .gte('due_date', `${targetDate}T00:00:00`)
    .lt('due_date', `${targetDate}T23:59:59`)

  const { data: overdue } = await admin
    .from('tenant_payments')
    .select('id, tenant_id, amount, due_date, status, tenants(company_name, email, contact_name, subscription_end)')
    .eq('status', 'overdue')

  const rows = [...(upcoming ?? []), ...(overdue ?? [])] as PaymentRow[]
  const seen = new Set<string>()
  const results: { payment_id: string; email?: string; sent?: boolean; skipped?: boolean; error?: string }[] = []

  for (const row of rows) {
    if (seen.has(row.id)) continue
    seen.add(row.id)

    const tenant = resolveTenant(row)
    const email = tenant?.email
    const entry: (typeof results)[number] = { payment_id: row.id, email }

    if (await wasPaymentReminderSentToday(row.id)) {
      entry.skipped = true
      results.push(entry)
      continue
    }

    if (!email) {
      entry.error = 'E-posta yok'
      results.push(entry)
      continue
    }

    const dueDate = new Date(row.due_date).toLocaleDateString('tr-TR')
    const subEnd = tenant?.subscription_end
      ? new Date(tenant.subscription_end).toLocaleDateString('tr-TR')
      : undefined

    const { subject, html } = paymentReminderEmail({
      contactName: tenant?.contact_name ?? tenant?.company_name ?? 'Bayi',
      companyName: tenant?.company_name ?? 'Bayi',
      amount: row.amount,
      dueDate,
      subscriptionEnd: subEnd,
      payUrl: `${appUrl}/dashboard/plan-yukselt`,
    })

    const mail = await sendMail({ to: email, subject, html })
    entry.sent = mail.ok
    if (!mail.ok) entry.error = mail.error

    if (mail.ok) {
      await writeAuditLog({
        action: 'payment_reminder_cron',
        targetType: 'tenant',
        targetId: row.tenant_id,
        metadata: { payment_id: row.id, email, due_date: row.due_date, status: row.status },
      })
    }

    results.push(entry)
  }

  return NextResponse.json({
    ok: true,
    remind_days: remindDays,
    count: results.length,
    sent: results.filter(r => r.sent).length,
    results,
  })
}
