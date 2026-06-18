import nodemailer from 'nodemailer'

export type SendMailInput = {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendMail(input: SendMailInput): Promise<{ ok: boolean; error?: string }> {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_EMAIL
  const pass = process.env.SMTP_PASSWORD

  if (!user || !pass) {
    return { ok: false, error: 'SMTP yapılandırması eksik' }
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  try {
    await transporter.sendMail({
      from: `"AURA İntegra" <${user}>`,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? input.html.replace(/<[^>]+>/g, ''),
    })
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'E-posta gönderilemedi' }
  }
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
    <p>Sorularınız için: destek@aurabilisim.net</p>
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
