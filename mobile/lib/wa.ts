/** WhatsApp wa.me yardımcıları — web ile aynı normalizasyon */

export function normalizeTrPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '')
  if (digits.startsWith('90') && digits.length >= 12) return digits.slice(0, 12)
  if (digits.startsWith('0') && digits.length >= 11) return `90${digits.slice(1, 11)}`
  if (digits.length === 10) return `90${digits}`
  return digits
}

export function buildWaMeUrl(phone: string, message: string): string {
  const num = normalizeTrPhone(phone)
  return `https://wa.me/${num}?text=${encodeURIComponent(message)}`
}

export function buildServiceReceiptText(order: {
  order_no?: string
  customer_name?: string
  customer_phone?: string
  device_brand?: string
  device_model?: string
  imei?: string
  fault_description?: string
  status?: string
  actual_cost?: number
  estimated_cost?: number
}): string {
  const device = [order.device_brand, order.device_model].filter(Boolean).join(' ')
  const fee = order.actual_cost ?? order.estimated_cost
  const lines = [
    `AURA Integra — Servis Fişi`,
    `No: ${order.order_no || '—'}`,
    `Müşteri: ${order.customer_name || '—'}`,
    order.customer_phone ? `Tel: ${order.customer_phone}` : null,
    device ? `Cihaz: ${device}` : null,
    order.imei ? `IMEI: ${order.imei}` : null,
    order.fault_description ? `Arıza: ${order.fault_description}` : null,
    order.status ? `Durum: ${order.status}` : null,
    fee != null && fee > 0 ? `Ücret: ${fee} TL` : null,
  ]
  return lines.filter(Boolean).join('\n')
}
