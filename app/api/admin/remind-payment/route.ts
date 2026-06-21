export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/notification-service'
import { writeAuditLog } from '@/lib/audit-log'
import { getServerAppUrl } from '@/lib/app-url'
import { buildPaymentReminderWaUrl, paymentReminderEmail } from '@/lib/mail'

type RemindChannel = 'email' | 'whatsapp'

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  let body: { tenant_id?: string; channel?: RemindChannel }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const tenantId = body.tenant_id
  const channel: RemindChannel = body.channel === 'whatsapp' ? 'whatsapp' : 'email'
  if (!tenantId) return NextResponse.json({ error: 'tenant_id gerekli' }, { status: 400 })

  const { data: tenant, error: tErr } = await admin
    .from('tenants')
    .select('company_name, email, contact_name, phone, subscription_end')
    .eq('id', tenantId)
    .single()

  if (tErr || !tenant) return NextResponse.json({ error: 'Bayi bulunamadı' }, { status: 404 })

  const { data: payment } = await admin
    .from('tenant_payments')
    .select('amount, due_date, status')
    .eq('tenant_id', tenantId)
    .in('status', ['pending', 'overdue'])
    .order('due_date', { ascending: true })
    .limit(1)
    .maybeSingle()

  const amount = payment?.amount ?? '—'
  const dueDate = payment?.due_date
    ? new Date(payment.due_date).toLocaleDateString('tr-TR')
    : '—'
  const subEnd = tenant.subscription_end
    ? new Date(tenant.subscription_end).toLocaleDateString('tr-TR')
    : undefined

  const appUrl = getServerAppUrl(request.nextUrl.origin)
  const reminderOpts = {
    contactName: tenant.contact_name ?? tenant.company_name,
    companyName: tenant.company_name,
    amount,
    dueDate,
    subscriptionEnd: subEnd,
    payUrl: `${appUrl}/dashboard/plan-yukselt`,
  }

  if (channel === 'whatsapp') {
    const phone = tenant.phone?.trim()
    if (!phone || phone.replace(/\D/g, '').length < 10) {
      return NextResponse.json({ error: 'Bayi telefon numarası tanımlı değil' }, { status: 400 })
    }

    const waUrl = buildPaymentReminderWaUrl(phone, reminderOpts)

    await writeAuditLog({
      actorId: auth.userId,
      action: 'payment_reminder_whatsapp',
      targetType: 'tenant',
      targetId: tenantId,
      metadata: { phone, channel: 'whatsapp' },
    })

    return NextResponse.json({
      ok: true,
      channel: 'whatsapp',
      wa_url: waUrl,
      message: 'WhatsApp mesajı hazır',
    })
  }

  if (!tenant.email) {
    return NextResponse.json({ error: 'Bayi e-posta adresi tanımlı değil' }, { status: 400 })
  }

  const { subject, html } = paymentReminderEmail(reminderOpts)

  const result = await sendEmail({
    to: tenant.email,
    subject,
    html,
  })

  await writeAuditLog({
    actorId: auth.userId,
    action: 'payment_reminder_sent',
    targetType: 'tenant',
    targetId: tenantId,
    metadata: { email: tenant.email, ok: result.ok, channel: 'email' },
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'E-posta gönderilemedi' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, channel: 'email', message: 'Hatırlatıcı e-posta ile gönderildi' })
}
