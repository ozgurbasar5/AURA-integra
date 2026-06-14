export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { sendEmail } from '@/lib/notification-service'
import { writeAuditLog } from '@/lib/audit-log'

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  let body: { tenant_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const tenantId = body.tenant_id
  if (!tenantId) return NextResponse.json({ error: 'tenant_id gerekli' }, { status: 400 })

  const { data: tenant, error: tErr } = await admin
    .from('tenants')
    .select('company_name, email, contact_name, subscription_end')
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

  const html = `
    <p>Merhaba ${tenant.contact_name ?? tenant.company_name},</p>
    <p>AURA İntegra abonelik ödemeniz hatırlatması:</p>
    <ul>
      <li><strong>Tutar:</strong> ₺${amount}</li>
      <li><strong>Son ödeme:</strong> ${dueDate}</li>
      <li><strong>Abonelik bitiş:</strong> ${tenant.subscription_end ? new Date(tenant.subscription_end).toLocaleDateString('tr-TR') : '—'}</li>
    </ul>
    <p>Ödeme için bizimle iletişime geçebilirsiniz.</p>
    <p>AURA İntegra Ekibi</p>
  `

  const result = await sendEmail({
    to: tenant.email,
    subject: `AURA İntegra — Ödeme Hatırlatması (${tenant.company_name})`,
    html,
  })

  await writeAuditLog({
    actorId: auth.userId,
    action: 'payment_reminder_sent',
    targetType: 'tenant',
    targetId: tenantId,
    metadata: { email: tenant.email, ok: result.ok },
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? 'E-posta gönderilemedi' }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: 'Hatırlatıcı gönderildi' })
}
