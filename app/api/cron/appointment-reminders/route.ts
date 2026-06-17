export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { sendSms } from '@/lib/notification-service'
import { getTenantSmsCredentials, logSmsToDb } from '@/lib/tenant-sms'

/** Randevu hatırlatma cron — Authorization: Bearer CRON_SECRET */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  if (process.env.NODE_ENV === 'production' && !secret) {
    return NextResponse.json({ error: 'CRON_SECRET yapılandırılmamış' }, { status: 503 })
  }
  if (!secret) {
    if (process.env.CRON_ALLOW_DEV !== '1') {
      return NextResponse.json({ error: 'CRON_SECRET gerekli (dev: CRON_ALLOW_DEV=1 ile geçici açılabilir)' }, { status: 503 })
    }
  } else if (authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

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

  return NextResponse.json({ ok: true, checked: appointments?.length ?? 0, sent })
}
