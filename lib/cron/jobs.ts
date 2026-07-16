import { getServiceClient } from '@/lib/supabase/service'
import { getServerAppUrl } from '@/lib/app-url'
import { sendMail, trialReminderEmail, paymentReminderEmail } from '@/lib/mail'
import { writeAuditLog } from '@/lib/audit-log'
import { wasPaymentReminderSentToday, wasCronActionSentToday } from '@/lib/cron-idempotency'
import { sendSms } from '@/lib/notification-service'
import { getTenantSmsCredentials, logSmsToDb } from '@/lib/tenant-sms'
import { computeHealthScore, suggestInterventions } from '@/lib/admin/health-score'

export type CronJobId =
  | 'trial-reminders'
  | 'payment-reminders'
  | 'appointment-reminders'
  | 'churn-interventions'
  | 'efatura-queue'

type PaymentRow = {
  id: string
  tenant_id: string
  amount: number
  due_date: string
  status: string
  tenants:
    | { company_name: string; email: string; contact_name: string | null; subscription_end: string | null }
    | { company_name: string; email: string; contact_name: string | null; subscription_end: string | null }[]
    | null
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

export async function runTrialRemindersJob() {
  const admin = getServiceClient()
  if (!admin) return { ok: false as const, status: 503, body: { error: 'Service unavailable' } }

  const appUrl = getServerAppUrl()
  const today = new Date()
  const reminders: { tenant_id: string; days_left: number; email?: string; sent?: boolean; error?: string }[] = []
  const REMINDER_DAYS = [7, 3, 1]

  for (const days of REMINDER_DAYS) {
    const target = new Date(today)
    target.setDate(target.getDate() + days)
    const targetDate = target.toISOString().slice(0, 10)

    const { data: tenants } = await admin
      .from('tenants')
      .select('id, company_name, subscription_end, status')
      .in('status', ['trial', 'active'])
      .gte('subscription_end', `${targetDate}T00:00:00`)
      .lt('subscription_end', `${targetDate}T23:59:59`)

    for (const t of tenants ?? []) {
      const { data: users } = await admin
        .from('user_profiles')
        .select('email')
        .eq('tenant_id', t.id)
        .in('role', ['tenant_admin', 'owner', 'admin'])
        .limit(1)

      const email = users?.[0]?.email
      const entry: (typeof reminders)[number] = { tenant_id: t.id, days_left: days, email }

      if (email) {
        const { subject, html } = trialReminderEmail({
          companyName: t.company_name ?? 'Bayi',
          daysLeft: days,
          checkoutUrl: `${appUrl}/dashboard/plan-yukselt`,
        })
        const mail = await sendMail({ to: email, subject, html })
        entry.sent = mail.ok
        if (!mail.ok) entry.error = mail.error
      }

      reminders.push(entry)
    }
  }

  return {
    ok: true as const,
    status: 200,
    body: {
      ok: true,
      count: reminders.length,
      sent: reminders.filter((r) => r.sent).length,
      reminders,
    },
  }
}

export async function runPaymentRemindersJob() {
  const admin = getServiceClient()
  if (!admin) return { ok: false as const, status: 503, body: { error: 'Service unavailable' } }

  const { remindDays, emailEnabled } = await getPlatformSettings(admin)
  if (!emailEnabled) {
    return { ok: true as const, status: 200, body: { ok: true, skipped: true, reason: 'email_bildirim kapalı' } }
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

  return {
    ok: true as const,
    status: 200,
    body: {
      ok: true,
      remind_days: remindDays,
      count: results.length,
      sent: results.filter((r) => r.sent).length,
      results,
    },
  }
}

export async function runAppointmentRemindersJob() {
  const admin = getServiceClient()
  if (!admin) return { ok: false as const, status: 503, body: { error: 'Service role gerekli' } }

  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const dayStart = tomorrow.toISOString().slice(0, 10)
  const dayEnd = new Date(tomorrow)
  dayEnd.setDate(dayEnd.getDate() + 1)
  const dayEndStr = dayEnd.toISOString().slice(0, 10)

  const { data: appointments, error } = await admin
    .from('appointments')
    .select('id, tenant_id, customer_name, customer_phone, appointment_date, appointment_time, notes')
    .gte('appointment_date', dayStart)
    .lt('appointment_date', dayEndStr)
    .in('status', ['beklemede', 'onaylandi'])

  if (error) return { ok: false as const, status: 500, body: { error: error.message } }

  let sent = 0
  const credCache = new Map<string, Awaited<ReturnType<typeof getTenantSmsCredentials>>>()
  for (const apt of appointments ?? []) {
    if (!apt.customer_phone) continue

    const tenantId = String(apt.tenant_id)
    if (!credCache.has(tenantId)) {
      credCache.set(tenantId, await getTenantSmsCredentials(tenantId))
    }
    const credentials = credCache.get(tenantId) ?? null

    const time = apt.appointment_time ? String(apt.appointment_time).slice(0, 5) : ''
    const timePart = time ? ` saat ${time}` : ''
    const msg = `Sayın ${apt.customer_name}, yarın (${dayStart})${timePart} randevunuz var. AURA İntegra`

    const result = await sendSms({ to: apt.customer_phone, message: msg, tenantId, credentials })
    if (result.ok) sent++

    await logSmsToDb({
      tenantId,
      recipient: apt.customer_phone,
      message: msg,
      status: result.status,
      providerRef: result.providerRef,
      errorMessage: result.error,
      customerName: apt.customer_name ? String(apt.customer_name) : undefined,
    })
  }

  return {
    ok: true as const,
    status: 200,
    body: { ok: true, checked: appointments?.length ?? 0, sent },
  }
}

export async function runChurnInterventionsJob() {
  const admin = getServiceClient()
  if (!admin) return { ok: false as const, status: 503, body: { error: 'Service unavailable' } }

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
    const activeUsers = profiles.filter((u) => u.is_active).length
    const revenue30d = (salesRes.data ?? []).reduce((s, r) => s + Number(r.total), 0)
    const overdue = (paymentsRes.data ?? []).filter((p) => p.status === 'overdue').length
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
        <ul>${interventions.map((i) => `<li>${i.message}</li>`).join('')}</ul>
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
      metadata: { score, interventions: interventions.map((i) => i.message), email_sent: entry.sent ?? false },
    })

    results.push(entry)
  }

  return {
    ok: true as const,
    status: 200,
    body: {
      ok: true,
      processed: results.length,
      emailed: results.filter((r) => r.sent).length,
      results,
    },
  }
}

export async function runEfaturaQueueJob() {
  const admin = getServiceClient()
  if (!admin) return { ok: false as const, status: 503, body: { error: 'Service unavailable' } }

  const { submitInvoiceToGib, getEfaturaProviderId } = await import('@/lib/efatura/provider')

  const { data: pending, error } = await admin
    .from('efatura_queue')
    .select('*')
    .eq('status', 'pending')
    .lt('retry_count', 5)
    .order('created_at', { ascending: true })
    .limit(20)

  if (error) {
    return { ok: false as const, status: 500, body: { error: error.message } }
  }

  const provider = getEfaturaProviderId()
  const results: { id: string; ok: boolean; status?: string; error?: string }[] = []

  for (const row of pending ?? []) {
    await admin
      .from('efatura_queue')
      .update({ status: 'processing', updated_at: new Date().toISOString() })
      .eq('id', row.id)

    const payload = (row.payload ?? {}) as Record<string, unknown>
    const invoice = {
      invoice_no: String(payload.invoice_no ?? row.invoice_id),
      customer_name: String(payload.customer_name ?? ''),
      customer_vkn: payload.customer_vkn ? String(payload.customer_vkn) : null,
      subtotal: Number(payload.subtotal ?? 0),
      tax_amount: Number(payload.tax_amount ?? 0),
      total: Number(payload.total ?? 0),
      invoice_date: String(payload.invoice_date ?? new Date().toISOString().slice(0, 10)),
      description: payload.description ? String(payload.description) : null,
    }

    // Stub: mark submitted with existing/fake ref — real providers attempt HTTP
    if (provider === 'stub') {
      const ref = row.gib_reference || `GIB-Q-${Date.now()}`
      await admin
        .from('efatura_queue')
        .update({
          status: 'submitted',
          gib_reference: ref,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      results.push({ id: row.id, ok: true, status: 'submitted' })
      continue
    }

    const result = await submitInvoiceToGib(invoice)
    if (result.ok) {
      await admin
        .from('efatura_queue')
        .update({
          status: 'submitted',
          gib_reference: result.gib_reference,
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      if (row.invoice_id) {
        await admin
          .from('invoices')
          .update({
            status: 'submitted',
            gib_reference: result.gib_reference,
            submitted_at: new Date().toISOString(),
            ...(result.xml ? { xml_content: result.xml } : {}),
          })
          .eq('id', row.invoice_id)
      }
      results.push({ id: row.id, ok: true, status: 'submitted' })
    } else {
      const retries = Number(row.retry_count ?? 0) + 1
      await admin
        .from('efatura_queue')
        .update({
          status: retries >= 5 ? 'failed' : 'pending',
          retry_count: retries,
          error_message: result.message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      results.push({ id: row.id, ok: false, error: result.message })
    }
  }

  return {
    ok: true as const,
    status: 200,
    body: {
      ok: true,
      provider,
      processed: results.length,
      results,
    },
  }
}

export async function dispatchCronJob(job: CronJobId) {
  switch (job) {
    case 'trial-reminders':
      return runTrialRemindersJob()
    case 'payment-reminders':
      return runPaymentRemindersJob()
    case 'appointment-reminders':
      return runAppointmentRemindersJob()
    case 'churn-interventions':
      return runChurnInterventionsJob()
    case 'efatura-queue':
      return runEfaturaQueueJob()
    default:
      return { ok: false as const, status: 400, body: { error: 'Geçersiz job' } }
  }
}
