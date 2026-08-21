import { maskPhone } from './pii-crypto'
import { mapDbStatusToPublic, PUBLIC_STATUS_LABELS } from './erp-features'
import { PORTAL_STATUS_STEPS, portalStatusStepIndex } from './tracking-search'

export type TimelineStepDTO = {
  key: string
  label: string
  icon: string
  completed: boolean
  current: boolean
  timestamp?: string | null
  note?: string | null
}

export type QuoteBreakdownDTO = {
  parts_total: number
  labor_total: number
  tax_total: number
  grand_total: number
  description?: string | null
}

export type PaymentSummaryDTO = {
  total_amount: number
  paid_amount: number
  remaining_amount: number
  status: 'unpaid' | 'partial' | 'paid'
}

export type CustomerSafeOrderDTO = {
  id: string
  order_no: string
  device_brand: string
  device_model: string
  device_color?: string | null
  imei?: string | null
  public_status: string
  status_label: string
  created_at: string
  eta: string | null
  fault_description: string
  customer_name: string
  customer_phone_masked: string
  approval_status: 'pending' | 'approved' | 'rejected' | null
  approval_token?: string | null
  approval_expires_at?: string | null
  quote: QuoteBreakdownDTO
  payment: PaymentSummaryDTO
  timeline_step_index: number
  timeline: TimelineStepDTO[]
}

export type CustomerSafeWarrantyDTO = {
  id: string
  device_brand: string
  device_model: string
  imei?: string | null
  start_date: string
  end_date: string
  warranty_months: number
  days_remaining: number
  status: 'aktif' | 'dolmus' | 'iptal'
  covered_parts: string[]
  exclusion_reasons: string[]
  claim_status?: string | null
  claimed_at?: string | null
  qr_token?: string | null
}

export type CustomerSafeProfileDTO = {
  name: string
  phone_masked: string
  email?: string | null
  address?: string | null
  kvkk_consented: boolean
  kvkk_consent_date?: string | null
}

export type CustomerPortalDataResponse = {
  tenant: {
    name: string
    phone: string
    address?: string | null
    logo?: string | null
    slug: string
  }
  customer: CustomerSafeProfileDTO
  active_order: CustomerSafeOrderDTO | null
  orders: CustomerSafeOrderDTO[]
  warranties: CustomerSafeWarrantyDTO[]
  notifications: Array<{
    id: string
    title: string
    message: string
    type: 'status' | 'quote' | 'warranty' | 'system'
    created_at: string
    read: boolean
    target_tab: 'home' | 'services' | 'warranty' | 'documents'
    target_id?: string
  }>
}

/**
 * Strict Privacy Whitelist projection.
 * Strips away technician_notes, buy_price, supplier_cost, profit margins, staff info.
 */
export function mapDbOrderToCustomerSafeOrder(
  row: Record<string, unknown>,
  historyRows?: Array<{ status: string; note?: string | null; created_at: string }> | null,
): CustomerSafeOrderDTO {
  const dbStatus = String(row.status ?? 'alindi')
  const publicStatus = mapDbStatusToPublic(dbStatus)
  const stepIdx = portalStatusStepIndex(publicStatus)

  const rawCust = row.customers as { full_name?: string; phone?: string } | { full_name?: string; phone?: string }[] | null
  const cust = Array.isArray(rawCust) ? rawCust[0] : rawCust
  const phone = String(row.customer_phone ?? cust?.phone ?? '')

  const grandTotal = Number(row.actual_cost ?? row.estimated_cost ?? row.approval_amount ?? 0)
  const paidAmount = Number(row.paid_amount ?? (dbStatus === 'teslim' ? grandTotal : 0))
  const remaining = Math.max(0, grandTotal - paidAmount)

  // Derive quote breakdown
  const labor = Number(row.labor_cost_client ?? row.labor_fee ?? 0)
  const parts = Number(row.parts_client_total ?? (grandTotal > labor ? grandTotal - labor : 0))
  const tax = Number(row.tax_amount ?? 0)

  // Build timeline
  const histMap = new Map<string, { note?: string | null; created_at: string }>()
  for (const h of historyRows ?? []) {
    histMap.set(mapDbStatusToPublic(String(h.status)), {
      note: h.note ?? null,
      created_at: h.created_at,
    })
  }

  const timeline: TimelineStepDTO[] = PORTAL_STATUS_STEPS.map((step, idx) => {
    const isCompleted = idx <= stepIdx
    const isCurrent = idx === stepIdx
    const hist = histMap.get(step.key)
    return {
      key: step.key,
      label: step.label,
      icon: step.icon,
      completed: isCompleted,
      current: isCurrent,
      timestamp: hist?.created_at ?? (idx === 0 ? String(row.created_at ?? '') : null),
      note: hist?.note ?? null,
    }
  })

  let approvalStatus: 'pending' | 'approved' | 'rejected' | null = null
  if (row.approval_status === 'approved' || row.approval_status === 'rejected' || row.approval_status === 'pending') {
    approvalStatus = row.approval_status
  } else if (dbStatus === 'onay_bekleniyor') {
    approvalStatus = 'pending'
  }

  return {
    id: String(row.id),
    order_no: String(row.order_no ?? ''),
    device_brand: String(row.device_brand ?? ''),
    device_model: String(row.device_model ?? ''),
    device_color: row.device_color ? String(row.device_color) : null,
    imei: row.imei ? String(row.imei) : null,
    public_status: publicStatus,
    status_label: PUBLIC_STATUS_LABELS[publicStatus] ?? PUBLIC_STATUS_LABELS[dbStatus] ?? dbStatus,
    created_at: String(row.created_at ?? new Date().toISOString()),
    eta: row.estimated_delivery ? String(row.estimated_delivery) : null,
    fault_description: String(row.fault_description ?? row.description ?? 'Belirtilmedi'),
    customer_name: String(row.customer_name ?? cust?.full_name ?? 'Müşteri'),
    customer_phone_masked: phone ? maskPhone(phone) : '***',
    approval_status: approvalStatus,
    approval_token: row.approval_token ? String(row.approval_token) : null,
    approval_expires_at: row.approval_expires_at ? String(row.approval_expires_at) : null,
    quote: {
      parts_total: parts,
      labor_total: labor,
      tax_total: tax,
      grand_total: grandTotal,
      description: row.approval_desc ? String(row.approval_desc) : null,
    },
    payment: {
      total_amount: grandTotal,
      paid_amount: paidAmount,
      remaining_amount: remaining,
      status: remaining <= 0 && grandTotal > 0 ? 'paid' : paidAmount > 0 ? 'partial' : 'unpaid',
    },
    timeline_step_index: stepIdx,
    timeline,
  }
}

export function mapDbWarrantyToCustomerSafeWarranty(row: Record<string, unknown>): CustomerSafeWarrantyDTO {
  const endDate = row.end_date ? new Date(String(row.end_date)) : new Date()
  const today = new Date()
  const diffTime = endDate.getTime() - today.getTime()
  const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)))

  let status: 'aktif' | 'dolmus' | 'iptal' = 'aktif'
  if (row.status === 'iptal') status = 'iptal'
  else if (daysRemaining <= 0 || row.status === 'dolmus' || row.status === 'expired') status = 'dolmus'

  const coveredParts = Array.isArray(row.covered_parts)
    ? (row.covered_parts as string[])
    : typeof row.covered_parts === 'string'
    ? row.covered_parts.split(',').map(s => s.trim())
    : ['Tüm Onarılan Parçalar']

  const exclusionReasons = Array.isArray(row.exclusion_reasons)
    ? (row.exclusion_reasons as string[])
    : typeof row.exclusion_reasons === 'string'
    ? row.exclusion_reasons.split(',').map(s => s.trim())
    : ['Sıvı teması', 'Fiziksel darbe ve kırılma', 'Yetkisiz müdahale']

  return {
    id: String(row.id),
    device_brand: String(row.device_brand ?? ''),
    device_model: String(row.device_model ?? ''),
    imei: row.imei ? String(row.imei) : null,
    start_date: String(row.start_date ?? new Date().toISOString()),
    end_date: String(row.end_date ?? new Date().toISOString()),
    warranty_months: Number(row.warranty_months ?? 6),
    days_remaining: daysRemaining,
    status,
    covered_parts: coveredParts,
    exclusion_reasons: exclusionReasons,
    claim_status: row.claim_status ? String(row.claim_status) : null,
    claimed_at: row.claimed_at ? String(row.claimed_at) : null,
    qr_token: row.qr_token ? String(row.qr_token) : null,
  }
}
