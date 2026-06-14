/**
 * ERP özellikleri — saf yardımcılar (store bağımlılığı yok)
 */

import type { FinanceTransaction, StockItem } from './store'

// ─── Durum eşleme (store ↔ müşteri takip) ───────────────────────────────────

export const STORE_TO_PUBLIC_STATUS: Record<string, string> = {
  waiting_diagnosis: 'alindi',
  in_repair: 'tamir',
  customer_approval_pending: 'onay_bekleniyor',
  ready_for_pickup: 'kalite_kontrol',
  delivered: 'teslim',
  cancelled: 'iptal',
  parts_waiting: 'teshis',
  parts_ordered: 'teshis',
}

export const PUBLIC_STATUS_LABELS: Record<string, string> = {
  alindi: 'Cihaz Teslim Alındı',
  teshis: 'Teşhis Yapılıyor',
  onay_bekleniyor: 'Müşteri Onayı Bekleniyor',
  tamir: 'Onarım Yapılıyor',
  kalite_kontrol: 'Kalite Kontrol',
  teslim: 'Teslim Edildi',
  iptal: 'İptal Edildi',
}

export function mapStoreStatusToPublic(status: string): string {
  return STORE_TO_PUBLIC_STATUS[status] || status
}

// ─── QC checklist ───────────────────────────────────────────────────────────

export const QC_CHECKLIST = [
  'Ekran testi yapıldı',
  'Dokunmatik testi yapıldı',
  'Kamera ön/arka test',
  'Hoparlör ve mikrofon test',
  'Şarj ve batarya test',
  'Wi-Fi / Bluetooth test',
  'IMEI ve SIM okuma test',
  'Kasa/conta kontrolü',
]

export function isQcComplete(finalChecks?: string[]): boolean {
  if (!finalChecks?.length) return false
  return QC_CHECKLIST.every(item => finalChecks.includes(item))
}

export function qcProgress(finalChecks?: string[]): { done: number; total: number } {
  const done = QC_CHECKLIST.filter(c => finalChecks?.includes(c)).length
  return { done, total: QC_CHECKLIST.length }
}

// ─── Şablon render ──────────────────────────────────────────────────────────

export function renderTemplate(text: string, vars: Record<string, string | number>): string {
  return text.replace(/\{(\w+)\}/g, (_, key) => String(vars[key] ?? `{${key}}`))
}

export function buildTrackingUrl(jobNo: string, shopSlug?: string): string {
  const q = new URLSearchParams({ q: jobNo })
  if (shopSlug?.trim()) q.set('shop', shopSlug.trim())
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/takip?${q.toString()}`
  }
  return `/takip?${q.toString()}`
}

export function buildApprovalUrl(token: string): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/onay/${token}`
  }
  return `/onay/${token}`
}

// ─── Tekrarlayan arıza (30 gün) ─────────────────────────────────────────────

export interface RepeatRepairHit {
  imei: string
  customer_name: string
  previous_job_no: string
  previous_date: string
  days_ago: number
}

export function findRepeatRepairs(
  orders: { id: string; imei?: string; customer_name: string; job_no: string; created_at: string; status: string }[],
  withinDays = 30,
): RepeatRepairHit[] {
  const now = Date.now()
  const hits: RepeatRepairHit[] = []
  const byImei = new Map<string, typeof orders>()

  for (const o of orders) {
    const imei = (o.imei || '').replace(/\D/g, '')
    if (imei.length < 10) continue
    const list = byImei.get(imei) || []
    list.push(o)
    byImei.set(imei, list)
  }

  for (const [, list] of byImei) {
    if (list.length < 2) continue
    const sorted = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const latest = sorted[0]
    const prev = sorted[1]
    const days = Math.floor((now - new Date(prev.created_at).getTime()) / 86400000)
    if (days <= withinDays && latest.status !== 'cancelled') {
      hits.push({
        imei: latest.imei || '',
        customer_name: latest.customer_name,
        previous_job_no: prev.job_no,
        previous_date: prev.created_at,
        days_ago: days,
      })
    }
  }
  return hits
}

// ─── Uyumlu parça önerisi ───────────────────────────────────────────────────

export function getCompatibleParts(stock: StockItem[], brand: string, model?: string): StockItem[] {
  const b = brand.toLocaleLowerCase('tr-TR')
  const m = (model || '').toLocaleLowerCase('tr-TR')
  return stock
    .filter(s => s.stock_qty > 0)
    .filter(s => {
      const brands = (s.compatible_brands || []).map(x => x.toLocaleLowerCase('tr-TR'))
      if (brands.some(x => x.includes(b) || b.includes(x))) return true
      const name = s.name.toLocaleLowerCase('tr-TR')
      if (name.includes(b)) return true
      if (m && name.includes(m)) return true
      return false
    })
    .sort((a, c) => c.stock_qty - a.stock_qty)
    .slice(0, 12)
}

// ─── Teknisyen komisyon ─────────────────────────────────────────────────────

export interface CommissionRow {
  name: string
  delivered_count: number
  revenue: number
  commission_rate: number
  commission_amount: number
}

export function calcTechnicianCommissions(
  orders: { technician: string | null; status: string; actual_cost?: number; estimated_cost: number }[],
  personnel: { full_name: string; commission_rate: number; is_active: boolean }[],
  defaultRate = 5,
): CommissionRow[] {
  const map = new Map<string, { count: number; revenue: number }>()
  for (const o of orders) {
    if (o.status !== 'delivered') continue
    const name = o.technician || 'Atanmadı'
    const cur = map.get(name) || { count: 0, revenue: 0 }
    cur.count++
    cur.revenue += o.actual_cost || o.estimated_cost || 0
    map.set(name, cur)
  }

  return Array.from(map.entries()).map(([name, v]) => {
    const p = personnel.find(x => x.full_name === name && x.is_active)
    const rate = p?.commission_rate ?? defaultRate
    return {
      name,
      delivered_count: v.count,
      revenue: v.revenue,
      commission_rate: rate,
      commission_amount: Math.round(v.revenue * (rate / 100) * 100) / 100,
    }
  }).sort((a, b) => b.commission_amount - a.commission_amount)
}

// ─── KDV / vergi raporu ─────────────────────────────────────────────────────

export interface VatReportRow {
  source: string
  net: number
  vat: number
  gross: number
}

export function buildVatReport(
  transactions: FinanceTransaction[],
  sales: { subtotal: number; vat_amount?: number; total_with_vat?: number; date: string }[],
): { rows: VatReportRow[]; totalVat: number; totalNet: number; totalGross: number } {
  const rows: VatReportRow[] = []
  let totalVat = 0
  let totalNet = 0
  let totalGross = 0

  const salesVat = sales.reduce((s, x) => s + (x.vat_amount || 0), 0)
  const salesNet = sales.reduce((s, x) => s + x.subtotal, 0)
  const salesGross = sales.reduce((s, x) => s + (x.total_with_vat || x.subtotal), 0)
  if (sales.length) {
    rows.push({ source: 'POS Satışları', net: salesNet, vat: salesVat, gross: salesGross })
    totalVat += salesVat
    totalNet += salesNet
    totalGross += salesGross
  }

  const serviceIncome = transactions
    .filter(t => t.type === 'gelir' && t.category === 'Servis Teslim')
    .reduce((s, t) => s + t.amount, 0)
  if (serviceIncome > 0) {
    const net = Math.round(serviceIncome / 1.2 * 100) / 100
    const vat = Math.round((serviceIncome - net) * 100) / 100
    rows.push({ source: 'Servis Gelirleri (KDV %20)', net, vat, gross: serviceIncome })
    totalVat += vat
    totalNet += net
    totalGross += serviceIncome
  }

  return { rows, totalVat, totalNet, totalGross }
}

// ─── Onay token ─────────────────────────────────────────────────────────────

export function generateToken(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16)
  }
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`
}
