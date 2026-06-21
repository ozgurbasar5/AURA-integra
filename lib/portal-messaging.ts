/** Müşteri portalı — SMS / WhatsApp şablon ve URL yardımcıları */

import type { BusinessBranding } from '@/lib/business-branding'
import { getBusinessBranding, resolveShopDisplayLine } from '@/lib/business-branding'
import { WA } from '@/lib/whatsapp-emojis'

export type PortalMessageTemplate = {
  id: string
  name: string
  /** SMS — düz metin, emoji yok (Netgsm uyumu) */
  smsText: string
  /** WhatsApp — WA.* emoji sabitleri (UTF-16 codepoint) */
  waText: string
}

export const PORTAL_MESSAGE_TEMPLATES: PortalMessageTemplate[] = [
  {
    id: '1',
    name: 'Cihaz Teslim Alındı',
    smsText: 'Sayın {customer}, cihazınız teslim alındı. Takip no: {job_no}. Portal: {portal_link}',
    waText:
      `Sayın *{customer}*,\n\n` +
      `${WA.package} Cihazınız *teslim alındı*.\n` +
      `${WA.page} *Takip no:* {job_no}\n` +
      `${WA.link} *Portal:* {portal_link}\n`,
  },
  {
    id: '2',
    name: 'Tamir Tamamlandı',
    smsText: 'Sayın {customer}, cihazınızın tamiri tamamlandı. Teslim için servisimizi arayabilirsiniz.',
    waText:
      `Sayın *{customer}*,\n\n` +
      `${WA.check} Cihazınızın tamiri *tamamlandı*.\n` +
      `Teslim almak için servisimizi arayabilirsiniz.\n`,
  },
  {
    id: '3',
    name: 'Cihaz Teslime Hazır',
    smsText: 'Sayın {customer}, cihazınız teslime hazır. Çalışma saatleri: Hafta içi 09:00-18:00',
    waText:
      `Sayın *{customer}*,\n\n` +
      `${WA.check} Cihazınız *teslime hazır*.\n` +
      `Çalışma saatleri: Hafta içi 09:00-18:00\n`,
  },
  {
    id: '4',
    name: 'Parça Bekleniyor',
    smsText: 'Sayın {customer}, cihazınızda kullanılacak parça temin edilmektedir. Süre: yaklaşık 3-5 iş günü.',
    waText:
      `Sayın *{customer}*,\n\n` +
      `${WA.wrench} Parça *temin ediliyor*.\n` +
      `Tahmini süre: 3-5 iş günü\n`,
  },
  {
    id: '5',
    name: 'Fiyat Onayı Gerekli',
    smsText: 'Sayın {customer}, arıza tespiti yapıldı. Tamir ücreti: {price} TL. Onay için lütfen arayın.',
    waText:
      `Sayın *{customer}*,\n\n` +
      `${WA.money} Tamir ücreti: *{price} TL*\n` +
      `Onay için lütfen servisimizle iletişime geçin.\n`,
  },
  {
    id: '6',
    name: 'Garanti Hatırlatma',
    smsText: 'Sayın {customer}, cihazınızın garantisi {date} tarihinde sona ermektedir.',
    waText:
      `Sayın *{customer}*,\n\n` +
      `${WA.memo} Garanti bitiş: *{date}*\n` +
      `Garanti servis için bize ulaşın.\n`,
  },
]

export type TemplateVars = {
  customer?: string
  job_no?: string
  portal_link?: string
  price?: string
  date?: string
}

/** SMS metninden emoji ve sorunlu sembolleri temizle (Turkce karakterler korunur) */
export function toSmsSafe(text: string): string {
  return text
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}]/gu, '')
    .replace(/₺/g, 'TL')
    .replace(/\s+/g, ' ')
    .trim()
}

export function applyPortalTemplate(text: string, vars: TemplateVars): string {
  return text
    .replace(/\{customer\}/g, vars.customer ?? 'Musteri')
    .replace(/\{job_no\}/g, vars.job_no ?? '-')
    .replace(/\{portal_link\}/g, vars.portal_link ?? '')
    .replace(/\{price\}/g, vars.price ?? '0')
    .replace(/\{date\}/g, vars.date ?? '-')
}

export function normalizeWaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('90') && digits.length >= 12) return digits
  if (digits.startsWith('0')) return '90' + digits.slice(1)
  if (digits.length === 10) return '90' + digits
  return digits.startsWith('90') ? digits : '90' + digits
}

export function buildWaMeUrl(phone: string, message: string): string {
  const num = normalizeWaPhone(phone)
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`
}

export function appendPortalFooter(message: string, branding?: BusinessBranding): string {
  const b = branding ?? getBusinessBranding()
  const shop = b.shopName || 'Servis'
  const loc = resolveShopDisplayLine(b)
  const phoneLine = b.shopPhone ? `\n${WA.phone} ${b.shopPhone}` : ''
  const addrLine = loc ? `\n${WA.pin} ${loc}` : ''
  return `${message.trim()}\n\n— *${shop}* —${phoneLine}${addrLine}`.trim()
}
