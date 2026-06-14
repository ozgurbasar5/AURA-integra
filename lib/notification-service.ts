/**
 * SMS / e-posta bildirim servisi — Netgsm veya SMTP (mock mod destekli)
 */

import nodemailer from 'nodemailer'

export interface SendSmsInput {
  to: string
  message: string
  tenantId?: string
  orderNo?: string
  customerName?: string
}

export interface SendEmailInput {
  to: string
  subject: string
  html: string
}

function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^0/, '90')
}

export async function sendSms(input: SendSmsInput): Promise<{ ok: boolean; status: string; error?: string }> {
  const usercode = process.env.NETGSM_USERCODE ?? process.env.NETGSM_USER
  const password = process.env.NETGSM_PASSWORD ?? process.env.NETGSM_PASS
  const header = process.env.NETGSM_HEADER ?? 'AURA'

  if (!usercode || !password) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[SMS mock]', input.to, input.message.slice(0, 80))
      return { ok: true, status: 'mock_sent' }
    }
    return { ok: false, status: 'failed', error: 'SMS yapılandırması eksik (NETGSM_USERCODE, NETGSM_PASSWORD)' }
  }

  try {
    const phone = normalizePhone(input.to)
    const url = new URL('https://api.netgsm.com.tr/sms/send/get')
    url.searchParams.set('usercode', usercode)
    url.searchParams.set('password', password)
    url.searchParams.set('gsmno', phone)
    url.searchParams.set('message', input.message)
    url.searchParams.set('msgheader', header)

    const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })
    const text = await res.text()
    const ok = text.startsWith('00') || text.includes('OK')
    return { ok, status: ok ? 'sent' : 'failed', error: ok ? undefined : text }
  } catch (err) {
    return { ok: false, status: 'failed', error: err instanceof Error ? err.message : 'SMS hatası' }
  }
}

export async function sendEmail(input: SendEmailInput): Promise<{ ok: boolean; error?: string }> {
  const email = process.env.SMTP_EMAIL
  const pass = process.env.SMTP_PASSWORD
  if (!email || !pass) {
    if (process.env.NODE_ENV === 'development') {
      console.log('[Email mock]', input.to, input.subject)
      return { ok: true }
    }
    return { ok: false, error: 'SMTP yapılandırması eksik' }
  }

  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: email, pass },
    })
    await transporter.sendMail({ from: email, to: input.to, subject: input.subject, html: input.html })
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'E-posta hatası' }
  }
}

const STATUS_SMS: Record<string, string> = {
  kalite_kontrol: 'Cihazınız tamir aşamasını tamamladı. Takip: {order_no}',
  teslim: 'Cihazınız teslime hazır! Servisimizi ziyaret edebilirsiniz. Sipariş: {order_no}',
  alindi: 'Cihazınız teslim alındı. Takip kodu: {order_no}',
}

export function buildStatusSmsMessage(dbStatus: string, orderNo: string, shopName: string): string | null {
  const tpl = STATUS_SMS[dbStatus]
  if (!tpl) return null
  return `${shopName}: ${tpl.replace('{order_no}', orderNo)}`
}

export async function logNotification(
  supabase: { from: (t: string) => { insert: (r: Record<string, unknown>) => PromiseLike<{ error: { message: string } | null }> } },
  tenantId: string,
  log: { channel: string; recipient: string; content: string; status: string; order_no?: string; customer_name?: string }
) {
  await supabase.from('notification_logs').insert({
    tenant_id: tenantId,
    channel: log.channel,
    recipient: log.recipient,
    content: log.content,
    status: log.status,
    order_no: log.order_no ?? null,
    customer_name: log.customer_name ?? null,
  })
}
