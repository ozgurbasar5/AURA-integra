export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { sendMail, trialReminderEmail } from '@/lib/mail'

const REMINDER_DAYS = [7, 3, 1]

/** Vercel Cron veya CRON_SECRET ile çağrılır — trial bitiş hatırlatması */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://integra.aurabilisim.net'
  const today = new Date()
  const reminders: { tenant_id: string; days_left: number; email?: string; sent?: boolean; error?: string }[] = []

  for (const days of REMINDER_DAYS) {
    const target = new Date(today)
    target.setDate(target.getDate() + days)
    const targetDate = target.toISOString().slice(0, 10)

    const { data: tenants } = await admin
      .from('tenants')
      .select('id, company_name, subscription_end, status')
      .eq('status', 'active')
      .gte('subscription_end', `${targetDate}T00:00:00`)
      .lt('subscription_end', `${targetDate}T23:59:59`)

    for (const t of tenants ?? []) {
      const { data: users } = await admin
        .from('user_profiles')
        .select('email')
        .eq('tenant_id', t.id)
        .eq('role', 'tenant_admin')
        .limit(1)

      const email = users?.[0]?.email
      const entry: (typeof reminders)[number] = {
        tenant_id: t.id,
        days_left: days,
        email,
      }

      if (email) {
        const checkoutUrl = `${appUrl}/dashboard/plan-yukselt`
        const { subject, html } = trialReminderEmail({
          companyName: t.company_name ?? 'Bayi',
          daysLeft: days,
          checkoutUrl,
        })
        const mail = await sendMail({ to: email, subject, html })
        entry.sent = mail.ok
        if (!mail.ok) entry.error = mail.error
      }

      reminders.push(entry)
    }
  }

  return NextResponse.json({
    ok: true,
    count: reminders.length,
    sent: reminders.filter(r => r.sent).length,
    reminders,
  })
}
