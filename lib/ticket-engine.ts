import type { SupportTicket, TicketMessage } from './store'

/**
 * Bilet Numarası Üretir
 * Format: TKT-2026-0001
 */
export function generateTicketNo(sequenceNumber: number): string {
  const year = new Date().getFullYear()
  const seq = String(sequenceNumber).padStart(4, '0')
  return `TKT-${year}-${seq}`
}

/**
 * SLA bitiş tarihini hesaplar
 */
export function calculateTicketSla(priority: string, channel: string): Date {
  const now = new Date()
  
  let hoursToAdd = 48 // Default (Düşük)
  
  if (priority === 'Acil') hoursToAdd = 2
  else if (priority === 'Yüksek') hoursToAdd = 8
  else if (priority === 'Normal') hoursToAdd = 24

  // WhatsApp veya Telefon ise SLA daha kısa olabilir
  if (channel === 'whatsapp' || channel === 'phone') {
    hoursToAdd = Math.floor(hoursToAdd / 2) || 1
  }

  now.setHours(now.getHours() + hoursToAdd)
  return now
}

/**
 * Bilet eskalasyon (üst birime sevk) durumunda mı kontrol eder
 */
export function shouldEscalate(ticket: SupportTicket): boolean {
  if (ticket.status === 'resolved' || ticket.status === 'closed') return false
  
  if (!ticket.sla_deadline) return false

  const deadline = new Date(ticket.sla_deadline).getTime()
  const now = Date.now()

  // SLA süresi dolmuşsa escalate et
  return now > deadline
}

/**
 * Müşteriye gönderilecek bildirim/eposta şablonunu oluşturur
 */
export function buildTicketEmailBody(ticket: SupportTicket, message: TicketMessage, shopName: string): string {
  return `
Sayın Müşterimiz,

${ticket.ticket_no} numaralı talebinizle ilgili yeni bir güncelleme var:

"${message.content}"

Bilet Durumu: ${ticket.status}

Bizi tercih ettiğiniz için teşekkür ederiz.
${shopName}
  `.trim()
}
