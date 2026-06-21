import nodemailer from 'nodemailer'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import { WA } from '@/lib/whatsapp-emojis'
import { buildWaMeUrl } from '@/lib/portal-messaging'

export type SendMailInput = {
  to: string
  subject: string
  html: string
  text?: string
  /** Gönderen görünen ad (varsayılan: AURA İntegra) */
  fromName?: string
}

export function isSmtpConfigured(): boolean {
  return !!(process.env.SMTP_EMAIL?.trim() && process.env.SMTP_PASSWORD?.trim())
}

function smtpAuthUser(): string {
  return (process.env.SMTP_USER || process.env.SMTP_EMAIL || '').trim()
}

function smtpFromAddress(): string {
  return process.env.SMTP_EMAIL?.trim() || smtpAuthUser()
}

function smtpPortConfigs(): Array<{ port: number; secure: boolean; requireTLS?: boolean }> {
  const primary = Number(process.env.SMTP_PORT || 465)
  const configs: Array<{ port: number; secure: boolean; requireTLS?: boolean }> = [
    { port: primary, secure: primary === 465, requireTLS: primary === 587 },
  ]
  if (primary === 465) configs.push({ port: 587, secure: false, requireTLS: true })
  else if (primary === 587) configs.push({ port: 465, secure: true })
  return configs
}

function formatSmtpError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/535|authentication failed|invalid login/i.test(msg)) {
    return (
      'SMTP kimlik doğrulama başarısız (535). ' +
      'Webmail ile giriş yapıp şifreyi doğrulayın; Vercel/.env.local SMTP_PASSWORD güncel olmalı. ' +
      'Turk Ticaret: smtp.turkticaret.net, kullanıcı tam e-posta (destek@aurabilisim.com).'
    )
  }
  if (/ECONNREFUSED|ETIMEDOUT|timeout/i.test(msg)) {
    return `SMTP sunucusuna bağlanılamadı: ${msg}`
  }
  return msg
}

function createTransporter(port: number, secure: boolean, requireTLS?: boolean) {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const user = smtpAuthUser()
  const pass = process.env.SMTP_PASSWORD?.trim() ?? ''

  const options: SMTPTransport.Options = {
    host,
    port,
    secure,
    auth: { user, pass },
    tls: { minVersion: 'TLSv1.2' },
  }
  if (requireTLS) options.requireTLS = true

  return nodemailer.createTransport(options)
}

export async function sendMail(input: SendMailInput): Promise<{ ok: boolean; error?: string }> {
  const user = smtpAuthUser()
  const pass = process.env.SMTP_PASSWORD?.trim()
  const from = smtpFromAddress()

  if (!user || !pass) {
    return { ok: false, error: 'SMTP yapılandırması eksik (SMTP_EMAIL, SMTP_PASSWORD)' }
  }

  let lastError: unknown = null
  for (const cfg of smtpPortConfigs()) {
    const transporter = createTransporter(cfg.port, cfg.secure, cfg.requireTLS)
    try {
      await transporter.sendMail({
        from: `"${input.fromName ?? 'AURA İntegra'}" <${from}>`,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text ?? input.html.replace(/<[^>]+>/g, ''),
      })
      return { ok: true }
    } catch (e) {
      lastError = e
      const msg = e instanceof Error ? e.message : ''
      if (!/535|authentication failed|invalid login/i.test(msg)) break
    }
  }

  return { ok: false, error: formatSmtpError(lastError) }
}

export function trialReminderEmail(opts: {
  companyName: string
  daysLeft: number
  checkoutUrl: string
}): { subject: string; html: string } {
  const subject = `AURA İntegra — Deneme süreniz ${opts.daysLeft} gün içinde bitiyor`
  const html = `
    <p>Merhaba <strong>${opts.companyName}</strong>,</p>
    <p>AURA İntegra deneme aboneliğiniz <strong>${opts.daysLeft} gün</strong> içinde sona erecek.</p>
    <p>Kesintisiz kullanım için paketinizi şimdi yenileyin:</p>
    <p><a href="${opts.checkoutUrl}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Ödeme Yap</a></p>
    <p>Sorularınız için: destek@aurabilisim.com</p>
    <p style="color:#64748b;font-size:12px;">AURA Bilişim — AURA İntegra</p>
  `
  return { subject, html }
}

export function paymentReminderEmail(opts: {
  contactName: string
  companyName: string
  amount: string | number
  dueDate: string
  subscriptionEnd?: string
  payUrl?: string
}): { subject: string; html: string } {
  const subject = `AURA İntegra — Ödeme Hatırlatması (${opts.companyName})`
  const payBlock = opts.payUrl
    ? `<p><a href="${opts.payUrl}" style="display:inline-block;padding:12px 24px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:8px;font-weight:bold;">Ödeme Yap</a></p>`
    : '<p>Ödeme için bizimle iletişime geçebilirsiniz.</p>'

  const html = `
    <p>Merhaba ${opts.contactName},</p>
    <p>AURA İntegra abonelik ödemeniz hatırlatması:</p>
    <ul>
      <li><strong>Tutar:</strong> ₺${opts.amount}</li>
      <li><strong>Son ödeme:</strong> ${opts.dueDate}</li>
      ${opts.subscriptionEnd ? `<li><strong>Abonelik bitiş:</strong> ${opts.subscriptionEnd}</li>` : ''}
    </ul>
    ${payBlock}
    <p>AURA İntegra Ekibi</p>
  `
  return { subject, html }
}

export function paymentReminderWhatsApp(opts: {
  contactName: string
  companyName: string
  amount: string | number
  dueDate: string
  subscriptionEnd?: string
  payUrl?: string
}): string {
  const lines = [
    `Sayın *${opts.contactName}*,`,
    '',
    `${WA.money} *AURA İntegra* abonelik ödeme hatırlatması`,
    '',
    `${WA.clipboard} *Firma:* ${opts.companyName}`,
    `${WA.money} *Tutar:* ${opts.amount} TL`,
    `${WA.memo} *Son ödeme:* ${opts.dueDate}`,
  ]
  if (opts.subscriptionEnd) lines.push(`${WA.memo} *Abonelik bitiş:* ${opts.subscriptionEnd}`)
  if (opts.payUrl) lines.push('', `${WA.link} *Ödeme:* ${opts.payUrl}`)
  lines.push('', '— *AURA Bilişim* —')
  return lines.join('\n')
}

export function buildPaymentReminderWaUrl(phone: string, opts: Parameters<typeof paymentReminderWhatsApp>[0]): string {
  return buildWaMeUrl(phone, paymentReminderWhatsApp(opts))
}
