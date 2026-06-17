/** Müşteri portalı / takip — IMEI ve servis no eşleştirme */

import { PUBLIC_STATUS_LABELS, mapDbStatusToPublic } from './erp-features'

export function digitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function compactAlphanumeric(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
}

/** SRV-2606-0001 → 26060001, SRV26060001 */
export function normalizeOrderToken(orderNo: string): string {
  return compactAlphanumeric(orderNo).replace(/^SRV/, '')
}

export function normalizeSearchToken(query: string): string {
  return compactAlphanumeric(query).replace(/^SRV/, '')
}

export function trackingQueryMatchesOrder(query: string, orderNo: string | null | undefined): boolean {
  if (!query?.trim() || !orderNo?.trim()) return false
  const q = query.trim()
  const raw = orderNo.trim()
  const lowerQ = q.toLowerCase()
  const lowerNo = raw.toLowerCase()
  if (lowerNo.includes(lowerQ) || lowerQ.includes(lowerNo)) return true

  const qCompact = normalizeSearchToken(q)
  const noCompact = normalizeOrderToken(raw)
  if (!qCompact || !noCompact) return false
  if (noCompact.includes(qCompact) || qCompact.includes(noCompact)) return true

  const qDigits = digitsOnly(q)
  const noDigits = digitsOnly(raw)
  if (qDigits.length >= 4 && noDigits.includes(qDigits)) return true

  return false
}

export function trackingQueryMatchesImei(query: string, imei: string | null | undefined): boolean {
  if (!query?.trim() || !imei?.trim()) return false
  const qDigits = digitsOnly(query)
  const imeiDigits = digitsOnly(imei)
  if (qDigits.length >= 8 && imeiDigits.includes(qDigits)) return true
  return imei.toLowerCase().includes(query.trim().toLowerCase())
}

export function trackingQueryMatchesPhone(query: string, phone: string | null | undefined): boolean {
  if (!query?.trim() || !phone?.trim()) return false
  const qDigits = digitsOnly(query)
  const phoneDigits = digitsOnly(phone)
  if (qDigits.length >= 10 && phoneDigits.includes(qDigits.slice(-10))) return true
  return phone.includes(query.trim())
}

export type PortalOrderHit = {
  id: string
  order_no: string
  status: string
  public_status: string
  status_label: string
  device_brand: string
  device_model: string
  imei: string
  customer_name: string
  customer_phone: string
  estimated_cost: number
  created_at: string
  eta: string | null
  description: string
}

export function mapDbOrderToPortalHit(row: Record<string, unknown>): PortalOrderHit {
  const dbStatus = String(row.status ?? 'alindi')
  const publicStatus = mapDbStatusToPublic(dbStatus)
  const rawCust = row.customers as { full_name?: string; phone?: string } | { full_name?: string; phone?: string }[] | null
  const cust = Array.isArray(rawCust) ? rawCust[0] : rawCust

  return {
    id: String(row.id),
    order_no: String(row.order_no ?? ''),
    status: dbStatus,
    public_status: publicStatus,
    status_label: PUBLIC_STATUS_LABELS[publicStatus] ?? PUBLIC_STATUS_LABELS[dbStatus] ?? dbStatus,
    device_brand: String(row.device_brand ?? ''),
    device_model: String(row.device_model ?? ''),
    imei: String(row.imei ?? ''),
    customer_name: String(row.customer_name ?? cust?.full_name ?? ''),
    customer_phone: String(row.customer_phone ?? cust?.phone ?? ''),
    estimated_cost: Number(row.estimated_cost) || 0,
    created_at: String(row.created_at ?? ''),
    eta: row.estimated_delivery ? String(row.estimated_delivery) : null,
    description: String(row.fault_description ?? row.description ?? ''),
  }
}

function resolveCustomer(row: {
  customers?: { full_name?: string; phone?: string } | { full_name?: string; phone?: string }[] | null
}): { full_name?: string; phone?: string } | null {
  const c = row.customers
  if (Array.isArray(c)) return c[0] ?? null
  return c ?? null
}

export function filterOrdersByTrackingQuery<T extends {
  order_no?: string | null
  job_no?: string | null
  imei?: string | null
  customers?: { full_name?: string; phone?: string } | { full_name?: string; phone?: string }[] | null
  customer_name?: string | null
  customer_phone?: string | null
}>(
  rows: T[],
  query: string,
): T[] {
  const q = query.trim()
  if (!q) return []
  const lower = q.toLowerCase()

  return rows.filter(row => {
    const cust = resolveCustomer(row)
    const name = String(row.customer_name ?? cust?.full_name ?? '')
    const phone = String(row.customer_phone ?? cust?.phone ?? '')
    const orderNo = row.order_no ?? row.job_no ?? ''
    if (name.toLowerCase().includes(lower)) return true
    if (trackingQueryMatchesOrder(q, orderNo)) return true
    if (trackingQueryMatchesImei(q, row.imei ?? '')) return true
    if (trackingQueryMatchesPhone(q, phone)) return true
    return false
  })
}

export const PORTAL_STATUS_STEPS = [
  { key: 'alindi', label: 'Teslim Alındı', icon: '📋' },
  { key: 'teshis', label: 'Teşhis', icon: '🔍' },
  { key: 'onay_bekleniyor', label: 'Onay Bekleniyor', icon: '⏳' },
  { key: 'tamir', label: 'Onarım', icon: '🔧' },
  { key: 'teslime_hazir', label: 'Teslime Hazır', icon: '✅' },
  { key: 'teslim', label: 'Teslim Edildi', icon: '🎉' },
] as const

export function portalStatusStepIndex(publicStatus: string): number {
  const idx = PORTAL_STATUS_STEPS.findIndex(s => s.key === publicStatus)
  return idx >= 0 ? idx : 0
}
