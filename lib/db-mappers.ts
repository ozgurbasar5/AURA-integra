/**
 * Supabase satırları ↔ localStorage store formatı dönüştürücüleri
 */

import { parseDeviceImages } from './device-images'
import { mapDbStatusToStore, mapStoreStatusToDb } from './erp-features'
import { normalizePaymentMethod } from './payment-method'
import { decryptPii, encryptPii } from './pii-crypto'
import type {
  StockItem,
  FinanceTransaction,
  Sale,
  StoreCustomer,
  Purchase,
  TodoItem,
  StolenIMEI,
  CustomerOrder,
  StoreProduct,
  Asset,
  Campaign,
  Deal,
  Appointment,
  PersonnelMember,
  WarrantyRecord,
  InvoiceRecord,
  NotificationLog,
  SupportTicket,
  CashShift,
  SupplierOrder,
  SecondHandDevice,
  ForeignDevice,
  Branch,
  NotificationSettings,
  StoreServiceOrder,
  ServiceExpense,
  StatusHistoryEntry,
  SlaConfig,
  SlaEvent,
  ChecklistTemplate,
  ChecklistResult,
  ImeiEvent,
  TicketMessage,
  FieldOrder,
  Dealer,
  DealerOrder,
  DealerInvoice,
} from './store'

type Row = Record<string, unknown>

// ─── Parts ↔ Stock ───────────────────────────────────────────────────────────

export function partToStock(row: Row): StockItem {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    barcode: String(row.barcode ?? ''),
    category: String(row.category ?? 'Genel'),
    compatible_brands: (row.compatible_brands as string[]) ?? [],
    stock_qty: Number(row.stock_qty) || 0,
    min_stock: Number(row.min_stock_qty) || 5,
    buy_price: Number(row.purchase_price) || 0,
    sell_price: Number(row.sale_price) || 0,
    supplier: String(row.supplier ?? ''),
  }
}

export function stockToPart(row: StockItem, tenantId: string): Row {
  return {
    id: row.id.match(/^[0-9a-f-]{36}$/i) ? row.id : undefined,
    tenant_id: tenantId,
    name: row.name,
    barcode: row.barcode || null,
    category: row.category,
    compatible_brands: row.compatible_brands,
    stock_qty: row.stock_qty,
    min_stock_qty: row.min_stock,
    purchase_price: row.buy_price,
    sale_price: row.sell_price,
    supplier: row.supplier || null,
    is_active: true,
  }
}

// ─── Customers ───────────────────────────────────────────────────────────────

export function customerToStore(row: Row): StoreCustomer {
  const seg = String(row.segment ?? 'normal')
  const phoneRaw = row.phone_enc && !row.phone
    ? decryptPii(String(row.phone_enc))
    : String(row.phone ?? '')
  const vknRaw = row.vkn_enc
    ? decryptPii(String(row.vkn_enc))
    : (row.vkn ? String(row.vkn) : undefined)
  const tcRaw = row.tc_no_enc
    ? decryptPii(String(row.tc_no_enc))
    : (row.tc_no ? String(row.tc_no) : undefined)
  return {
    id: String(row.id),
    full_name: String(row.full_name ?? ''),
    phone: phoneRaw,
    email: row.email ? String(row.email) : undefined,
    address: row.address ? String(row.address) : undefined,
    tc_no: tcRaw,
    vkn: vknRaw,
    customer_type: (row.customer_type as StoreCustomer['customer_type']) ?? 'bireysel',
    segment: seg === 'normal' ? 'regular' : (seg as StoreCustomer['segment']),
    company_name: row.company_name ? String(row.company_name) : undefined,
    sms_allowed: row.sms_allowed !== false,
    email_allowed: row.email_allowed !== false,
    blacklisted: row.is_blacklisted === true,
    total_spent: Number(row.total_spent) || 0,
    satisfaction_avg: Number(row.satisfaction_avg) || 0,
    notes: row.notes ? String(row.notes) : undefined,
    kvkk_consent_date: row.kvkk_consent_date ? String(row.kvkk_consent_date) : undefined,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
  }
}

export function customerToDb(c: StoreCustomer, tenantId: string): Row {
  // NOT: `phone` aranabilir (takip/portal/global arama) ve NOT NULL bir alan;
  // ayrıca AES-GCM deterministik olmadığı için şifreli telefonda eşleşme/arama
  // imkânsız. Bu yüzden telefon DAİMA düz metin tutulur. Yalnızca aranmayan
  // hassas alanlar (vkn, tc_no) anahtar mevcutsa şifrelenir.
  const phone = c.phone.replace(/\s/g, '')
  const usePiiEnc = Boolean(process.env.APP_ENCRYPTION_KEY && process.env.APP_ENCRYPTION_KEY.length >= 16)
  let vknEnc: string | null = null
  let tcEnc: string | null = null
  if (usePiiEnc) {
    try {
      vknEnc = encryptPii(c.vkn ?? null)
      tcEnc = encryptPii(c.tc_no ?? null)
    } catch {
      vknEnc = null
      tcEnc = null
    }
  }
  return {
    id: c.id.match(/^[0-9a-f-]{36}$/i) ? c.id : undefined,
    tenant_id: tenantId,
    full_name: c.full_name,
    phone,
    phone_enc: null,
    email: c.email ?? null,
    address: c.address ?? null,
    tc_no: usePiiEnc ? null : (c.tc_no ?? null),
    tc_no_enc: usePiiEnc && tcEnc ? tcEnc : null,
    vkn: usePiiEnc ? null : (c.vkn ?? null),
    vkn_enc: usePiiEnc && vknEnc ? vknEnc : null,
    customer_type: c.customer_type,
    segment: c.segment === 'regular' ? 'normal' : c.segment,
    company_name: c.company_name ?? null,
    sms_allowed: c.sms_allowed,
    email_allowed: c.email_allowed,
    is_blacklisted: c.blacklisted,
    total_spent: c.total_spent,
    satisfaction_avg: c.satisfaction_avg,
    notes: c.notes ?? null,
    kvkk_consent_date: c.kvkk_consent_date ?? null,
  }
}

// ─── Financial transactions ──────────────────────────────────────────────────

export function txToStore(row: Row): FinanceTransaction {
  return {
    id: String(row.id),
    type: row.type as FinanceTransaction['type'],
    description: String(row.description ?? ''),
    category: String(row.category ?? 'Genel'),
    amount: Number(row.amount) || 0,
    payment_method: String(row.payment_method ?? 'nakit'),
    date: String(row.transaction_date ?? row.created_at ?? new Date().toISOString()).slice(0, 10),
    customer_name: row.customer_name ? String(row.customer_name) : undefined,
    order_no: row.order_no ? String(row.order_no) : undefined,
    service_id: row.service_id ? String(row.service_id) : undefined,
  }
}

export function txToDb(t: FinanceTransaction, tenantId: string, userId?: string): Row {
  return {
    id: t.id.match(/^[0-9a-f-]{36}$/i) ? t.id : undefined,
    tenant_id: tenantId,
    type: t.type,
    amount: t.amount,
    payment_method: normalizePaymentMethod(t.payment_method),
    category: t.category,
    description: t.description,
    transaction_date: t.date,
    customer_name: t.customer_name ?? null,
    order_no: t.order_no ?? null,
    service_id: t.service_id ?? null,
    created_by: userId ?? null,
  }
}

// ─── Sales ───────────────────────────────────────────────────────────────────

export function saleToStore(row: Row): Sale {
  const extra = (row.extra as Record<string, unknown>) ?? {}
  return {
    id: String(row.id),
    date: String(row.created_at ?? new Date().toISOString()),
    customer_name: String(row.customer_name ?? extra.customer_name ?? 'Perakende'),
    items: (row.items as Sale['items']) ?? [],
    subtotal: Number(row.subtotal) || Number(row.total) || 0,
    cost_price: Number(row.cost_price) || 0,
    gross_profit: Number(row.gross_profit) || 0,
    expenses: (extra.expenses as Sale['expenses']) ?? [],
    expense_total: Number(row.expense_total) || 0,
    net_profit: Number(row.net_profit) || 0,
    profit_margin: Number(extra.profit_margin) || 0,
    vat_rate: Number(row.vat_rate) || 20,
    vat_amount: Number(row.vat_amount) || 0,
    total_with_vat: Number(extra.total_with_vat) || Number(row.total) || 0,
    payment_method: String(row.payment_method ?? 'nakit'),
  }
}

export function saleToDb(
  s: Sale,
  tenantId: string,
  userId?: string,
  opts?: { cash_shift_id?: string | null },
): Row {
  return {
    id: s.id.match(/^[0-9a-f-]{36}$/i) ? s.id : undefined,
    tenant_id: tenantId,
    customer_name: s.customer_name,
    items: s.items,
    subtotal: s.subtotal,
    total: s.total_with_vat || s.subtotal,
    cost_price: s.cost_price,
    gross_profit: s.gross_profit,
    net_profit: s.net_profit,
    vat_rate: s.vat_rate,
    vat_amount: s.vat_amount,
    expense_total: s.expense_total,
    payment_method: s.payment_method,
    sold_by: userId ?? null,
    extra: {
      expenses: s.expenses,
      profit_margin: s.profit_margin,
      total_with_vat: s.total_with_vat,
      ...(opts?.cash_shift_id ? { cash_shift_id: opts.cash_shift_id } : {}),
    },
  }
}

// ─── Service orders ──────────────────────────────────────────────────────────

export function serviceOrderToStore(row: Row): StoreServiceOrder {
  const tech = row.technician as { full_name?: string } | null
  return {
    id: String(row.id),
    job_no: String(row.order_no ?? row.job_no ?? ''),
    customer_name: String(row.customer_name ?? '—'),
    customer_phone: String(row.customer_phone ?? ''),
    device_brand: String(row.device_brand ?? ''),
    device_model: String(row.device_model ?? ''),
    imei: String(row.imei ?? ''),
    status: mapDbStatusToStore(String(row.status ?? 'alindi')),
    technician: tech?.full_name ?? null,
    estimated_cost: Number(row.estimated_cost) || 0,
    actual_cost: row.actual_cost != null ? Number(row.actual_cost) : undefined,
    description: row.fault_description ? String(row.fault_description) : undefined,
    notes: row.technician_notes ? String(row.technician_notes) : undefined,
    private_note: row.private_note ? String(row.private_note) : undefined,
    final_checks: (row.final_checks as string[]) ?? [],
    approval_token: row.approval_token ? String(row.approval_token) : undefined,
    approval_status: row.approval_status as StoreServiceOrder['approval_status'],
    financial_posted: row.financial_posted === true,
    delivered_at: row.delivered_at ? String(row.delivered_at) : undefined,
    net_profit: row.net_profit != null ? Number(row.net_profit) : undefined,
    created_at: String(row.created_at ?? new Date().toISOString()),
    updated_at: String(row.updated_at ?? row.created_at ?? new Date().toISOString()),
    eta: row.estimated_delivery ? String(row.estimated_delivery) : null,
    images: parseDeviceImages(row),
  }
}

// ─── Generic passthrough mappers (JSON-friendly tables) ──────────────────────

export function purchaseToStore(row: Row): Purchase {
  return {
    id: String(row.id),
    supplier_name: String(row.supplier_name),
    supplier_phone: row.supplier_phone ? String(row.supplier_phone) : undefined,
    device_brand: row.device_brand ? String(row.device_brand) : undefined,
    device_model: row.device_model ? String(row.device_model) : undefined,
    imei: row.imei ? String(row.imei) : undefined,
    category: row.category as Purchase['category'],
    quality: row.quality as Purchase['quality'],
    quantity: Number(row.quantity) || 1,
    buy_price: Number(row.buy_price) || 0,
    total_cost: Number(row.total_cost) || 0,
    payment_method: String(row.payment_method ?? 'nakit'),
    invoice_no: row.invoice_no ? String(row.invoice_no) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    created_at: String(row.created_at),
  }
}

export function todoToStore(row: Row): TodoItem {
  return {
    id: String(row.id),
    title: String(row.title),
    description: row.description ? String(row.description) : undefined,
    priority: row.priority as TodoItem['priority'],
    category: row.category as TodoItem['category'],
    due_date: row.due_date ? String(row.due_date) : undefined,
    completed: row.completed === true,
    created_at: String(row.created_at),
  }
}

export function stolenToStore(row: Row): StolenIMEI {
  return {
    id: String(row.id),
    imei: String(row.imei),
    device_brand: row.device_brand ? String(row.device_brand) : undefined,
    device_model: row.device_model ? String(row.device_model) : undefined,
    reporter_name: row.reporter_name ? String(row.reporter_name) : undefined,
    reporter_phone: row.reporter_phone ? String(row.reporter_phone) : undefined,
    report_date: String(row.report_date ?? row.created_at),
    source: row.source as StolenIMEI['source'],
    status: row.status as StolenIMEI['status'],
    notes: row.notes ? String(row.notes) : undefined,
    created_at: String(row.created_at),
  }
}

export function customerOrderToStore(row: Row): CustomerOrder {
  return {
    id: String(row.id),
    order_no: String(row.order_no),
    customer_name: String(row.customer_name),
    customer_phone: String(row.customer_phone),
    items: (row.items as CustomerOrder['items']) ?? [],
    total: Number(row.total) || 0,
    status: row.status as CustomerOrder['status'],
    payment_status: row.payment_status as CustomerOrder['payment_status'],
    payment_method: row.payment_method ? String(row.payment_method) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    created_at: String(row.created_at),
    updated_at: String(row.updated_at ?? row.created_at),
  }
}

export function storeProductToStore(row: Row): StoreProduct {
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category ?? ''),
    brand: row.brand ? String(row.brand) : undefined,
    model: row.model ? String(row.model) : undefined,
    price: Number(row.price) || 0,
    cost_price: Number(row.cost_price) || 0,
    stock_count: Number(row.stock_count) || 0,
    imei: row.imei ? String(row.imei) : undefined,
    quality: row.quality as StoreProduct['quality'],
    is_active: row.is_active !== false,
    image_url: row.image_url ? String(row.image_url) : undefined,
    description: row.description ? String(row.description) : undefined,
    created_at: String(row.created_at),
  }
}

export function assetToStore(row: Row): Asset {
  return {
    id: String(row.id),
    name: String(row.name),
    category: row.category as Asset['category'],
    serial_no: row.serial_no ? String(row.serial_no) : undefined,
    barcode: row.barcode ? String(row.barcode) : undefined,
    purchase_date: String(row.purchase_date ?? row.created_at),
    purchase_price: Number(row.purchase_price) || 0,
    current_value: Number(row.current_value) || 0,
    assigned_to: row.assigned_to ? String(row.assigned_to) : undefined,
    location: row.location ? String(row.location) : undefined,
    status: row.status as Asset['status'],
    next_maintenance: row.next_maintenance ? String(row.next_maintenance) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    created_at: String(row.created_at),
  }
}

export function campaignToStore(row: Row): Campaign {
  return {
    id: String(row.id),
    name: String(row.name),
    description: String(row.description ?? ''),
    type: row.type as Campaign['type'],
    discount_percent: row.discount_percent != null ? Number(row.discount_percent) : undefined,
    discount_amount: row.discount_amount != null ? Number(row.discount_amount) : undefined,
    target_categories: (row.target_categories as string[]) ?? [],
    start_date: String(row.start_date),
    end_date: String(row.end_date),
    is_active: row.is_active !== false,
    usage_count: Number(row.usage_count) || 0,
    max_usage: row.max_usage != null ? Number(row.max_usage) : undefined,
    created_at: String(row.created_at),
  }
}

export function dealToStore(row: Row): Deal {
  return {
    id: String(row.id),
    title: String(row.title),
    product_name: String(row.product_name),
    original_price: Number(row.original_price) || 0,
    deal_price: Number(row.deal_price) || 0,
    stock_count: Number(row.stock_count) || 0,
    sold_count: Number(row.sold_count) || 0,
    category: String(row.category ?? ''),
    is_active: row.is_active !== false,
    end_date: String(row.end_date),
    description: row.description ? String(row.description) : undefined,
    created_at: String(row.created_at),
  }
}

export function showcaseToSecondHand(row: Row): SecondHandDevice {
  return {
    id: String(row.id),
    brand: String(row.brand),
    model: String(row.model),
    imei: row.imei ? String(row.imei) : undefined,
    barcode: String(row.barcode ?? String(row.id).slice(0, 8)),
    condition: (String(row.condition ?? 'iyi') as SecondHandDevice['condition']),
    cosmetic_score: Number(row.cosmetic_score) || 8,
    battery_health: row.battery_health != null ? Number(row.battery_health) : undefined,
    color: row.color ? String(row.color) : undefined,
    storage: row.storage ? String(row.storage) : undefined,
    buy_price: Number(row.buy_price) || 0,
    sell_price: Number(row.sell_price) || 0,
    status: row.status === 'satildi' ? 'satildi' : 'stokta',
    showcase: row.showcase !== false,
    notes: row.notes ? String(row.notes) : undefined,
    created_at: String(row.created_at),
    sold_at: row.sold_at ? String(row.sold_at) : undefined,
  }
}

export function branchToStore(row: Row): Branch {
  return {
    id: String(row.id),
    name: String(row.name),
    address: row.address ? String(row.address) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    is_main: row.is_main === true,
    created_at: String(row.created_at),
  }
}

export function defaultNotificationSettings(tenant?: Row): NotificationSettings {
  return {
    auto_sms: true,
    auto_whatsapp: true,
    on_status_change: true,
    on_delivery: true,
    require_qc_on_delivery: true,
    shop_address: tenant?.address ? String(tenant.address) : '',
    shop_phone: tenant?.phone ? String(tenant.phone) : '0850 000 00 00',
    shop_name: String(tenant?.shop_name ?? tenant?.company_name ?? 'AURA İntegra'),
    shop_logo: tenant?.shop_logo ? String(tenant.shop_logo) : '',
    portal_slug: tenant?.portal_slug ? String(tenant.portal_slug) : '',
    service_warranty_months: 3,
  }
}

// ─── Appointments ────────────────────────────────────────────────────────────

const APPT_STATUS_FROM_DB: Record<string, Appointment['status']> = {
  beklemede: 'bekliyor', bekliyor: 'bekliyor', onaylandi: 'onaylandi',
  iptal: 'iptal', tamamlandi: 'tamamlandi', gelmedi: 'gelmedi',
}
const APPT_STATUS_TO_DB: Record<string, string> = {
  bekliyor: 'beklemede', onaylandi: 'onaylandi', iptal: 'iptal',
  tamamlandi: 'tamamlandi', gelmedi: 'gelmedi',
}

export function appointmentToStore(row: Row): Appointment {
  const st = String(row.status ?? 'beklemede')
  return {
    id: String(row.id),
    customer_name: String(row.customer_name ?? ''),
    customer_phone: String(row.customer_phone ?? ''),
    device_brand: String(row.device_brand ?? ''),
    device_model: String(row.device_model ?? ''),
    fault_description: String(row.fault_description ?? ''),
    appointment_date: String(row.appointment_date ?? ''),
    appointment_time: String(row.appointment_time ?? ''),
    duration_minutes: Number(row.duration_minutes) || 30,
    technician_name: row.technician_name ? String(row.technician_name) : undefined,
    status: APPT_STATUS_FROM_DB[st] ?? 'bekliyor',
    notes: row.notes ? String(row.notes) : undefined,
    deposit_amount: Number(row.deposit_amount) || 0,
    deposit_paid: Boolean(row.deposit_paid),
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function appointmentToDb(a: Appointment, tenantId: string): Row {
  return {
    id: a.id.match(/^[0-9a-f-]{36}$/i) ? a.id : undefined,
    tenant_id: tenantId,
    customer_name: a.customer_name,
    customer_phone: a.customer_phone,
    device_brand: a.device_brand,
    device_model: a.device_model,
    fault_description: a.fault_description,
    appointment_date: a.appointment_date,
    appointment_time: a.appointment_time,
    duration_minutes: a.duration_minutes,
    technician_name: a.technician_name ?? null,
    status: APPT_STATUS_TO_DB[a.status] ?? 'beklemede',
    notes: a.notes ?? null,
    deposit_amount: a.deposit_amount ?? 0,
    deposit_paid: a.deposit_paid ?? false,
  }
}

// ─── Warranties ──────────────────────────────────────────────────────────────

export function warrantyToStore(row: Row): WarrantyRecord {
  return {
    id: String(row.id),
    order_id: row.order_id ? String(row.order_id) : undefined,
    customer_id: row.customer_id ? String(row.customer_id) : undefined,
    imei: row.imei ? String(row.imei) : undefined,
    invoice_no: row.invoice_no ? String(row.invoice_no) : undefined,
    device_brand: String(row.device_brand ?? ''),
    device_model: String(row.device_model ?? ''),
    warranty_months: Number(row.warranty_months) || 3,
    start_date: String(row.start_date ?? ''),
    end_date: String(row.end_date ?? ''),
    covered_parts: (row.covered_parts as string[]) ?? [],
    exclusion_reasons: (row.exclusion_reasons as string[]) ?? [],
    terms: row.terms ? String(row.terms) : undefined,
    status: (String(row.status ?? 'aktif') as WarrantyRecord['status']),
    claim_status: (String(row.claim_status ?? 'beklemede') as WarrantyRecord['claim_status']),
    claim_notes: row.claim_notes ? String(row.claim_notes) : undefined,
    qr_token: row.qr_token ? String(row.qr_token) : undefined,
    sla_days: row.sla_days ? Number(row.sla_days) : undefined,
    notify_before_days: row.notify_before_days ? Number(row.notify_before_days) : undefined,
    customer_name: row.customer_name ? String(row.customer_name) : '',
    order_no: row.order_no ? String(row.order_no) : undefined,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function warrantyToDb(w: WarrantyRecord, tenantId: string): Row {
  return {
    id: w.id.match(/^[0-9a-f-]{36}$/i) ? w.id : undefined,
    tenant_id: tenantId,
    order_id: w.order_id || null,
    customer_id: w.customer_id || null,
    customer_name: w.customer_name || null,
    order_no: w.order_no || null,
    imei: w.imei || null,
    invoice_no: w.invoice_no || null,
    device_brand: w.device_brand,
    device_model: w.device_model,
    warranty_months: w.warranty_months,
    start_date: w.start_date,
    end_date: w.end_date,
    covered_parts: w.covered_parts ?? [],
    exclusion_reasons: w.exclusion_reasons ?? [],
    terms: w.terms || null,
    status: w.status,
    claim_status: w.claim_status || null,
    claim_notes: w.claim_notes || null,
    qr_token: w.qr_token || null,
    sla_days: w.sla_days ?? 0,
    notify_before_days: w.notify_before_days ?? 7,
  }
}

// ─── Invoices ──────────────────────────────────────────────────────────────

export function invoiceToStore(row: Row): InvoiceRecord {
  return {
    id: String(row.id),
    invoice_type: (String(row.invoice_type ?? 'efatura') as InvoiceRecord['invoice_type']),
    invoice_no: String(row.invoice_no ?? ''),
    invoice_date: String(row.invoice_date ?? ''),
    customer_name: String(row.customer_name ?? ''),
    customer_vkn: row.customer_vkn ? String(row.customer_vkn) : undefined,
    order_no: row.order_no ? String(row.order_no) : undefined,
    items: (row.items as InvoiceRecord['items']) ?? [],
    subtotal: Number(row.subtotal) || 0,
    kdv_amount: Number(row.kdv_amount) || 0,
    total: Number(row.total) || 0,
    status: (String(row.status ?? 'taslak') as InvoiceRecord['status']),
    gib_reference: row.gib_reference ? String(row.gib_reference) : undefined,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function invoiceToDb(inv: InvoiceRecord, tenantId: string): Row {
  return {
    id: inv.id.match(/^[0-9a-f-]{36}$/i) ? inv.id : undefined,
    tenant_id: tenantId,
    invoice_type: inv.invoice_type,
    invoice_no: inv.invoice_no,
    invoice_date: inv.invoice_date,
    customer_name: inv.customer_name,
    customer_vkn: inv.customer_vkn ?? null,
    order_no: inv.order_no ?? null,
    items: inv.items,
    subtotal: inv.subtotal,
    kdv_amount: inv.kdv_amount,
    total: inv.total,
    status: inv.status,
    gib_reference: inv.gib_reference ?? null,
  }
}

// ─── Notification logs ─────────────────────────────────────────────────────

export function notificationLogToStore(row: Row): NotificationLog {
  return {
    id: String(row.id),
    channel: row.channel as NotificationLog['channel'],
    recipient: String(row.recipient ?? ''),
    subject: row.subject ? String(row.subject) : undefined,
    content: String(row.content ?? ''),
    status: (String(row.status ?? 'sent') as NotificationLog['status']),
    order_no: row.order_no ? String(row.order_no) : undefined,
    customer_name: row.customer_name ? String(row.customer_name) : undefined,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function notificationLogToDb(n: NotificationLog, tenantId: string): Row {
  return {
    id: n.id.match(/^[0-9a-f-]{36}$/i) ? n.id : undefined,
    tenant_id: tenantId,
    channel: n.channel,
    recipient: n.recipient,
    subject: n.subject ?? null,
    content: n.content,
    status: n.status,
    order_no: n.order_no ?? null,
    customer_name: n.customer_name ?? null,
  }
}

// ─── Support tickets ─────────────────────────────────────────────────────────

const TICKET_PRIORITY_FROM: Record<string, SupportTicket['priority']> = {
  dusuk: 'Düşük', normal: 'Normal', yuksek: 'Yüksek', acil: 'Acil',
  Düşük: 'Düşük', Normal: 'Normal', Yüksek: 'Yüksek', Acil: 'Acil',
}
const TICKET_PRIORITY_TO: Record<string, string> = {
  Düşük: 'dusuk', Normal: 'normal', Yüksek: 'yuksek', Acil: 'acil',
}

export function supportTicketToStore(row: Row): SupportTicket {
  return {
    id: String(row.id),
    ticket_no: String(row.ticket_no ?? ''),
    subject: String(row.subject ?? ''),
    priority: TICKET_PRIORITY_FROM[String(row.priority ?? 'normal')] ?? 'Normal',
    description: String(row.description ?? ''),
    status: (String(row.status ?? 'open') as SupportTicket['status']),
    channel: (String(row.channel ?? 'portal') as SupportTicket['channel']),
    customer_id: row.customer_id ? String(row.customer_id) : undefined,
    order_id: row.order_id ? String(row.order_id) : undefined,
    assigned_to: row.assigned_to ? String(row.assigned_to) : undefined,
    sla_deadline: row.sla_deadline ? String(row.sla_deadline) : undefined,
    first_response_at: row.first_response_at ? String(row.first_response_at) : undefined,
    resolved_at: row.resolved_at ? String(row.resolved_at) : undefined,
    satisfaction_score: row.satisfaction_score != null ? Number(row.satisfaction_score) : undefined,
    tags: Array.isArray(row.tags) ? (row.tags as string[]) : undefined,
    category: String(row.category ?? 'Genel'),
    internal_notes: row.internal_notes ? String(row.internal_notes) : undefined,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function supportTicketToDb(t: SupportTicket, tenantId: string): Row {
  return {
    id: t.id.match(/^[0-9a-f-]{36}$/i) ? t.id : undefined,
    tenant_id: tenantId,
    ticket_no: t.ticket_no,
    subject: t.subject,
    priority: TICKET_PRIORITY_TO[t.priority] ?? 'normal',
    description: t.description,
    status: t.status,
    channel: t.channel,
    customer_id: t.customer_id ?? null,
    order_id: t.order_id ?? null,
    assigned_to: t.assigned_to ?? null,
    sla_deadline: t.sla_deadline ?? null,
    first_response_at: t.first_response_at ?? null,
    resolved_at: t.resolved_at ?? null,
    satisfaction_score: t.satisfaction_score ?? null,
    tags: t.tags ?? null,
    category: t.category,
    internal_notes: t.internal_notes ?? null,
  }
}

export function ticketMessageToStore(row: Row): TicketMessage {
  return {
    id: String(row.id),
    ticket_id: String(row.ticket_id),
    sender_type: String(row.sender_type) as TicketMessage['sender_type'],
    sender_id: row.sender_id ? String(row.sender_id) : undefined,
    content: String(row.content ?? ''),
    attachments: Array.isArray(row.attachments) ? (row.attachments as any[]) : undefined,
    is_internal: row.is_internal === true,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function ticketMessageToDb(m: TicketMessage): Row {
  return {
    id: m.id.match(/^[0-9a-f-]{36}$/i) ? m.id : undefined,
    ticket_id: m.ticket_id,
    sender_type: m.sender_type,
    sender_id: m.sender_id ?? null,
    content: m.content,
    attachments: m.attachments ?? null,
    is_internal: m.is_internal,
  }
}

// ─── Cash shifts ─────────────────────────────────────────────────────────────

export function cashShiftToStore(row: Row): CashShift {
  return {
    id: String(row.id),
    branch_id: row.branch_id ? String(row.branch_id) : undefined,
    opened_at: String(row.opened_at ?? new Date().toISOString()),
    closed_at: row.closed_at ? String(row.closed_at) : undefined,
    opening_balance: Number(row.opening_balance) || 0,
    closing_balance: row.closing_balance != null ? Number(row.closing_balance) : undefined,
    expected_cash: row.expected_cash != null ? Number(row.expected_cash) : undefined,
    difference: row.difference != null ? Number(row.difference) : undefined,
    opened_by: String(row.opened_by ?? ''),
    closed_by: row.closed_by ? String(row.closed_by) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    status: (String(row.status ?? 'open') as CashShift['status']),
    report_snapshot: row.report_snapshot as CashShift['report_snapshot'],
  }
}

export function cashShiftToDb(c: CashShift, tenantId: string): Row {
  return {
    id: c.id.match(/^[0-9a-f-]{36}$/i) ? c.id : undefined,
    tenant_id: tenantId,
    branch_id: c.branch_id ?? null,
    opened_at: c.opened_at,
    closed_at: c.closed_at ?? null,
    opening_balance: c.opening_balance,
    closing_balance: c.closing_balance ?? null,
    expected_cash: c.expected_cash ?? null,
    difference: c.difference ?? null,
    opened_by: c.opened_by,
    closed_by: c.closed_by ?? null,
    notes: c.notes ?? null,
    status: c.status,
    report_snapshot: c.report_snapshot ?? null,
  }
}

// ─── Supplier orders ─────────────────────────────────────────────────────────

const SUPPLIER_STATUS_FROM: Record<string, SupplierOrder['status']> = {
  beklemede: 'pending', pending: 'pending', ordered: 'ordered', siparis: 'ordered',
  received: 'received', teslim: 'received', cancelled: 'cancelled', iptal: 'cancelled',
}
const SUPPLIER_STATUS_TO: Record<string, string> = {
  pending: 'beklemede', ordered: 'ordered', received: 'received', cancelled: 'cancelled',
}

export function supplierOrderToStore(row: Row): SupplierOrder {
  const st = String(row.status ?? 'beklemede')
  return {
    id: String(row.id),
    order_no: String(row.order_no ?? ''),
    supplier_name: String(row.supplier_name ?? ''),
    supplier_phone: row.supplier_phone ? String(row.supplier_phone) : undefined,
    service_order_id: row.service_order_id ? String(row.service_order_id) : undefined,
    service_job_no: row.service_job_no ? String(row.service_job_no) : undefined,
    items: (row.items as SupplierOrder['items']) ?? [],
    total: Number(row.total) || 0,
    status: SUPPLIER_STATUS_FROM[st] ?? 'pending',
    created_at: String(row.created_at ?? new Date().toISOString()),
    expected_at: row.expected_at ? String(row.expected_at) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
  }
}

export function supplierOrderToDb(o: SupplierOrder, tenantId: string): Row {
  return {
    id: o.id.match(/^[0-9a-f-]{36}$/i) ? o.id : undefined,
    tenant_id: tenantId,
    order_no: o.order_no,
    supplier_name: o.supplier_name,
    supplier_phone: o.supplier_phone ?? null,
    service_order_id: o.service_order_id ?? null,
    service_job_no: o.service_job_no ?? null,
    items: o.items,
    total: o.total,
    status: SUPPLIER_STATUS_TO[o.status] ?? 'beklemede',
    expected_at: o.expected_at ?? null,
    notes: o.notes ?? null,
  }
}

// ─── Personnel ───────────────────────────────────────────────────────────────

export function personnelToStore(row: Row): PersonnelMember {
  return {
    id: String(row.id),
    full_name: String(row.full_name ?? ''),
    role: String(row.role ?? 'teknisyen'),
    position: String(row.position ?? ''),
    phone: row.phone ? String(row.phone) : undefined,
    email: row.email ? String(row.email) : undefined,
    branch_name: row.branch_name ? String(row.branch_name) : undefined,
    hire_date: String(row.hire_date ?? row.created_at ?? new Date().toISOString()).slice(0, 10),
    salary: row.salary != null ? Number(row.salary) : undefined,
    commission_rate: Number(row.commission_rate) || 5,
    daily_target: Number(row.daily_target) || 5,
    is_active: row.is_active !== false,
    completed_today: Number(row.completed_today) || 0,
    completed_month: Number(row.completed_month) || 0,
    avg_repair_time_hours: Number(row.avg_repair_time_hours) || 0,
    return_rate: Number(row.return_rate) || 0,
    satisfaction_avg: Number(row.satisfaction_avg) || 0,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function personnelToDb(p: PersonnelMember, tenantId: string): Row {
  return {
    id: p.id.match(/^[0-9a-f-]{36}$/i) ? p.id : undefined,
    tenant_id: tenantId,
    full_name: p.full_name,
    role: p.role,
    position: p.position,
    phone: p.phone ?? null,
    email: p.email ?? null,
    branch_name: p.branch_name ?? null,
    hire_date: p.hire_date,
    salary: p.salary ?? null,
    commission_rate: p.commission_rate,
    daily_target: p.daily_target,
    is_active: p.is_active,
    completed_today: p.completed_today,
    completed_month: p.completed_month,
    avg_repair_time_hours: p.avg_repair_time_hours,
    return_rate: p.return_rate,
    satisfaction_avg: p.satisfaction_avg,
  }
}

export function serviceOrderToDb(row: StoreServiceOrder, tenantId: string, userId?: string): Row {
  return {
    id: row.id.match(/^[0-9a-f-]{36}$/i) ? row.id : undefined,
    tenant_id: tenantId,
    order_no: row.job_no,
    customer_name: row.customer_name,
    customer_phone: row.customer_phone,
    device_brand: row.device_brand,
    device_model: row.device_model,
    imei: row.imei || null,
    status: mapStoreStatusToDb(row.status),
    estimated_cost: row.estimated_cost,
    actual_cost: row.actual_cost ?? null,
    fault_description: row.description ?? null,
    technician_notes: row.notes ?? null,
    private_note: row.private_note ?? null,
    estimated_delivery: row.eta ?? null,
    approval_token: row.approval_token ?? null,
    approval_status: row.approval_status ?? null,
    financial_posted: row.financial_posted === true,
    delivered_at: row.delivered_at ?? null,
    net_profit: row.net_profit ?? null,
    device_images: row.images ?? [],
    created_by: userId ?? null,
  }
}

// ─── Foreign devices ─────────────────────────────────────────────────────────

type ForeignMeta = {
  musteri_adi?: string
  musteri_telefon?: string
  giris_tarihi?: string
  kayit_son_tarih?: string
  durum?: string
}

function parseForeignNotes(notes?: string | null): ForeignMeta {
  if (!notes) return {}
  try {
    const parsed = JSON.parse(notes) as ForeignMeta
    return parsed
  } catch {
    return { durum: notes }
  }
}

export function foreignDeviceToStore(row: Row): ForeignDevice {
  const meta = parseForeignNotes(row.notes ? String(row.notes) : null)
  return {
    id: String(row.id),
    imei: String(row.imei ?? ''),
    marka: String(row.device_brand ?? ''),
    model: String(row.device_model ?? ''),
    musteri_adi: meta.musteri_adi ?? '',
    musteri_telefon: meta.musteri_telefon ?? '',
    durum: (meta.durum ?? row.status ?? 'kayit_bekliyor') as ForeignDevice['durum'],
    giris_tarihi: meta.giris_tarihi ?? String(row.created_at ?? '').slice(0, 10),
    kayit_son_tarih: meta.kayit_son_tarih ?? '',
    notlar: typeof row.notes === 'string' && !row.notes.startsWith('{') ? String(row.notes) : '',
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function foreignDeviceToDb(d: ForeignDevice, tenantId: string): Row {
  const meta: ForeignMeta = {
    musteri_adi: d.musteri_adi,
    musteri_telefon: d.musteri_telefon,
    giris_tarihi: d.giris_tarihi,
    kayit_son_tarih: d.kayit_son_tarih,
    durum: d.durum,
  }
  return {
    id: d.id.match(/^[0-9a-f-]{36}$/i) ? d.id : undefined,
    tenant_id: tenantId,
    imei: d.imei,
    device_brand: d.marka,
    device_model: d.model,
    status: d.durum,
    notes: JSON.stringify(meta),
  }
}

export { mapStoreStatusToDb }

// ─── Service expenses & status history ───────────────────────────────────────

export function serviceExpenseToStore(row: Row): ServiceExpense {
  return {
    id: String(row.id),
    service_id: String(row.service_order_id),
    source: (['part', 'labor', 'shipping', 'other'].includes(String(row.source))
      ? String(row.source)
      : 'other') as ServiceExpense['source'],
    reference_id: row.reference_id ? String(row.reference_id) : undefined,
    description: String(row.description ?? ''),
    amount: Number(row.amount) || 0,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function serviceExpenseToDb(exp: ServiceExpense, tenantId: string): Row {
  return {
    id: exp.id.match(/^[0-9a-f-]{36}$/i) ? exp.id : undefined,
    tenant_id: tenantId,
    service_order_id: exp.service_id,
    source: exp.source,
    reference_id: exp.reference_id ?? null,
    description: exp.description,
    amount: exp.amount,
    created_at: exp.created_at,
  }
}

export function statusHistoryToStore(row: Row): StatusHistoryEntry {
  return {
    id: String(row.id),
    service_order_id: String(row.order_id),
    status: String(row.status),
    note: row.note ? String(row.note) : undefined,
    user: row.created_by ? String(row.created_by) : undefined,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function statusHistoryToDb(entry: StatusHistoryEntry, userId?: string): Row {
  return {
    id: entry.id.match(/^[0-9a-f-]{36}$/i) ? entry.id : undefined,
    order_id: entry.service_order_id,
    status: entry.status,
    note: entry.note ?? null,
    created_by: userId ?? null,
    created_at: entry.created_at,
  }
}

// ─── SLA Management ────────────────────────────────────────────────────────

export function slaConfigToStore(row: Row): SlaConfig {
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    category: String(row.category),
    device_type: row.device_type ? String(row.device_type) : undefined,
    standard_days: Number(row.standard_days) || 3,
    legal_max_days: Number(row.legal_max_days) || 20,
    warning_at_percent: Number(row.warning_at_percent) || 80,
    escalation_roles: (row.escalation_roles as string[]) ?? [],
    auto_notify_customer: row.auto_notify_customer !== false,
    is_active: row.is_active !== false,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function slaConfigToDb(config: SlaConfig, tenantId: string): Row {
  return {
    id: config.id.match(/^[0-9a-f-]{36}$/i) ? config.id : undefined,
    tenant_id: tenantId,
    category: config.category,
    device_type: config.device_type ?? null,
    standard_days: config.standard_days,
    legal_max_days: config.legal_max_days,
    warning_at_percent: config.warning_at_percent,
    escalation_roles: config.escalation_roles,
    auto_notify_customer: config.auto_notify_customer,
    is_active: config.is_active,
  }
}

export function slaEventToStore(row: Row): SlaEvent {
  return {
    id: String(row.id),
    order_id: String(row.order_id),
    event_type: String(row.event_type) as SlaEvent['event_type'],
    note: row.note ? String(row.note) : undefined,
    timestamp: String(row.timestamp ?? new Date().toISOString()),
    triggered_by: row.triggered_by ? String(row.triggered_by) : undefined,
  }
}

export function slaEventToDb(event: SlaEvent, tenantId: string): Row {
  return {
    id: event.id.match(/^[0-9a-f-]{36}$/i) ? event.id : undefined,
    tenant_id: tenantId,
    order_id: event.order_id,
    event_type: event.event_type,
    note: event.note ?? null,
    timestamp: event.timestamp,
    triggered_by: event.triggered_by ?? null,
  }
}

// ─── Checklist & IMEI Matrix ───────────────────────────────────────────────

export function checklistTemplateToStore(row: Row): ChecklistTemplate {
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category),
    device_type: row.device_type ? String(row.device_type) : undefined,
    brand_filter: Array.isArray(row.brand_filter) ? (row.brand_filter as string[]) : undefined,
    items: Array.isArray(row.items) ? (row.items as any[]) : [],
    version: Number(row.version) || 1,
    is_active: row.is_active !== false,
  }
}

export function checklistTemplateToDb(tpl: ChecklistTemplate, tenantId: string): Row {
  return {
    id: tpl.id.match(/^[0-9a-f-]{36}$/i) ? tpl.id : undefined,
    tenant_id: tenantId,
    name: tpl.name,
    category: tpl.category,
    device_type: tpl.device_type ?? null,
    brand_filter: tpl.brand_filter ?? null,
    items: tpl.items,
    version: tpl.version,
    is_active: tpl.is_active,
  }
}

export function checklistResultToStore(row: Row): ChecklistResult {
  return {
    id: String(row.id),
    order_id: String(row.order_id),
    template_id: row.template_id ? String(row.template_id) : undefined,
    phase: String(row.phase) as ChecklistResult['phase'],
    answers: Array.isArray(row.answers) ? (row.answers as any[]) : [],
    completed_by: row.completed_by ? String(row.completed_by) : undefined,
    completed_at: row.completed_at ? String(row.completed_at) : undefined,
  }
}

export function checklistResultToDb(res: ChecklistResult, tenantId: string): Row {
  return {
    id: res.id.match(/^[0-9a-f-]{36}$/i) ? res.id : undefined,
    tenant_id: tenantId,
    order_id: res.order_id,
    template_id: res.template_id ?? null,
    phase: res.phase,
    answers: res.answers,
    completed_by: res.completed_by ?? null,
    completed_at: res.completed_at ?? new Date().toISOString(),
  }
}

export function imeiEventToStore(row: Row): ImeiEvent {
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    imei: String(row.imei),
    event_type: String(row.event_type) as ImeiEvent['event_type'],
    event_id: row.event_id ? String(row.event_id) : undefined,
    customer_name: row.customer_name ? String(row.customer_name) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    metadata: row.metadata ? (row.metadata as Record<string, any>) : undefined,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function imeiEventToDb(event: ImeiEvent, tenantId: string): Row {
  return {
    id: event.id.match(/^[0-9a-f-]{36}$/i) ? event.id : undefined,
    tenant_id: tenantId,
    imei: event.imei,
    event_type: event.event_type,
    event_id: event.event_id ?? null,
    customer_name: event.customer_name ?? null,
    notes: event.notes ?? null,
    metadata: event.metadata ?? null,
  }
}

// ─── Field Orders (Saha Servis) ───────────────────────────────────────────────

export function fieldOrderToStore(row: Row): FieldOrder {
  return {
    id: String(row.id),
    parent_order_id: row.parent_order_id ? String(row.parent_order_id) : undefined,
    customer_id: row.customer_id ? String(row.customer_id) : undefined,
    technician_id: row.technician_id ? String(row.technician_id) : undefined,
    address: String(row.address),
    latitude: row.latitude != null ? Number(row.latitude) : undefined,
    longitude: row.longitude != null ? Number(row.longitude) : undefined,
    scheduled_at: row.scheduled_at ? String(row.scheduled_at) : undefined,
    arrived_at: row.arrived_at ? String(row.arrived_at) : undefined,
    completed_at: row.completed_at ? String(row.completed_at) : undefined,
    status: String(row.status || 'scheduled') as any,
    customer_signature: row.customer_signature ? String(row.customer_signature) : undefined,
    photos: Array.isArray(row.photos) ? (row.photos as string[]) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function fieldOrderToDb(fo: FieldOrder, tenantId: string): Row {
  return {
    id: fo.id.match(/^[0-9a-f-]{36}$/i) ? fo.id : undefined,
    tenant_id: tenantId,
    parent_order_id: fo.parent_order_id ?? null,
    customer_id: fo.customer_id ?? null,
    technician_id: fo.technician_id ?? null,
    address: fo.address,
    latitude: fo.latitude ?? null,
    longitude: fo.longitude ?? null,
    scheduled_at: fo.scheduled_at ?? null,
    arrived_at: fo.arrived_at ?? null,
    completed_at: fo.completed_at ?? null,
    status: fo.status,
    customer_signature: fo.customer_signature ?? null,
    photos: fo.photos ?? null,
    notes: fo.notes ?? null,
  }
}

// ─── Dealers (Bayiler B2B) ───────────────────────────────────────────────────

export function dealerToStore(row: Row): Dealer {
  return {
    id: String(row.id),
    company_name: String(row.company_name),
    contact_name: row.contact_name ? String(row.contact_name) : undefined,
    email: row.email ? String(row.email) : undefined,
    phone: row.phone ? String(row.phone) : undefined,
    address: row.address ? String(row.address) : undefined,
    tax_no: row.tax_no ? String(row.tax_no) : undefined,
    status: String(row.status || 'pending') as any,
    discount_rate: Number(row.discount_rate) || 0,
    credit_limit: Number(row.credit_limit) || 0,
    payment_terms: Number(row.payment_terms) || 30,
    notes: row.notes ? String(row.notes) : undefined,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function dealerToDb(d: Dealer, tenantId: string): Row {
  return {
    id: d.id.match(/^[0-9a-f-]{36}$/i) ? d.id : undefined,
    tenant_id: tenantId,
    company_name: d.company_name,
    contact_name: d.contact_name ?? null,
    email: d.email ?? null,
    phone: d.phone ?? null,
    address: d.address ?? null,
    tax_no: d.tax_no ?? null,
    status: d.status,
    discount_rate: d.discount_rate,
    credit_limit: d.credit_limit,
    payment_terms: d.payment_terms,
    notes: d.notes ?? null,
  }
}

// ─── Dealer Orders ───────────────────────────────────────────────────────────

export function dealerOrderToStore(row: Row): DealerOrder {
  return {
    id: String(row.id),
    dealer_id: String(row.dealer_id),
    order_no: String(row.order_no),
    items: Array.isArray(row.items) ? (row.items as any[]) : [],
    subtotal: Number(row.subtotal) || 0,
    discount_amount: Number(row.discount_amount) || 0,
    vat_amount: Number(row.vat_amount) || 0,
    total: Number(row.total) || 0,
    status: String(row.status || 'draft') as any,
    shipping_address: row.shipping_address ? String(row.shipping_address) : undefined,
    notes: row.notes ? String(row.notes) : undefined,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function dealerOrderToDb(o: DealerOrder, tenantId: string): Row {
  return {
    id: o.id.match(/^[0-9a-f-]{36}$/i) ? o.id : undefined,
    tenant_id: tenantId,
    dealer_id: o.dealer_id,
    order_no: o.order_no,
    items: o.items,
    subtotal: o.subtotal,
    discount_amount: o.discount_amount,
    vat_amount: o.vat_amount,
    total: o.total,
    status: o.status,
    shipping_address: o.shipping_address ?? null,
    notes: o.notes ?? null,
  }
}

// ─── Dealer Invoices ─────────────────────────────────────────────────────────

export function dealerInvoiceToStore(row: Row): DealerInvoice {
  return {
    id: String(row.id),
    dealer_id: String(row.dealer_id),
    order_id: row.order_id ? String(row.order_id) : undefined,
    invoice_no: String(row.invoice_no),
    amount: Number(row.amount) || 0,
    type: String(row.type || 'invoice') as any,
    due_date: row.due_date ? String(row.due_date) : undefined,
    paid_at: row.paid_at ? String(row.paid_at) : undefined,
    status: String(row.status || 'pending') as any,
    created_at: String(row.created_at ?? new Date().toISOString()),
  }
}

export function dealerInvoiceToDb(inv: DealerInvoice, tenantId: string): Row {
  return {
    id: inv.id.match(/^[0-9a-f-]{36}$/i) ? inv.id : undefined,
    tenant_id: tenantId,
    dealer_id: inv.dealer_id,
    order_id: inv.order_id ?? null,
    invoice_no: inv.invoice_no,
    amount: inv.amount,
    type: inv.type,
    due_date: inv.due_date ?? null,
    paid_at: inv.paid_at ?? null,
    status: inv.status,
  }
}
