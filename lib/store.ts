import { renderTemplate, buildTrackingUrl, buildApprovalUrl, generateToken, isQcComplete } from './erp-features'
import { filterOrdersByTrackingQuery } from './tracking-search'
import { SMS_TEMPLATES } from './constants'
import {
  getStoreStorageKey,
  getStoreVersionKey,
  computeKasaFromTransactions,
  purgeTenantStore,
  setActiveTenantId,
} from './tenant-store'

export { setActiveTenantId, purgeTenantStore } from './tenant-store'

/**
 * ServisSoft Merkezi Veri Store'u
 * 
 * Tüm modüller arasında veri paylaşımı sağlar:
 * - Stok değişiklikleri → Finans'a yansır
 * - POS Satış → kâr marjı, KDV, gider kalemleri hesaplanır
 * - Servise parça ekle → otomatik gider kaydı
 * - Servis teslim → finansa kâr/zarar yazılır
 * 
 * localStorage ile kalıcılık sağlanır.
 * CustomEvent ile modüller arası senkronizasyon yapılır.
 */

// ─── Unique ID Helper ──────────────────────────────────────────────────────────
// NOT: Üretilen id'ler ÇIPLAK UUID olmalı. Supabase senkronizasyonunda satırlar
// `id` (UUID) üzerinden upsert ile tekilleştiriliyor; prefix'li id'ler UUID
// kontrolünü geçemediği için her push'ta yeni satır eklenip mükerrer kayıt
// oluşmasına yol açıyordu. Prefix'e bağımlı hiçbir mantık olmadığı için kaldırıldı.
function uid(_prefix?: string): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // RFC4122 v4 fallback (crypto.randomUUID yoksa)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StockItem {
  id: string
  name: string
  barcode: string
  category: string
  compatible_brands: string[]
  stock_qty: number
  min_stock: number
  buy_price: number
  sell_price: number
  supplier: string
}

export interface FinanceTransaction {
  id: string
  type: 'gelir' | 'gider'
  description: string
  category: string
  amount: number
  payment_method: string
  date: string
  customer_name?: string
  order_no?: string
  related_stock_id?: string
  service_id?: string
}

export interface UsedPart {
  stock_id: string
  name: string
  qty: number
  unit_buy: number
  unit_sell: number
}

export interface CartItem {
  stock_id: string
  name: string
  qty: number
  unit_price: number
}

// ─── Sale Expense ─────────────────────────────────────────────────────────────

export interface SaleExpense {
  id: string
  sale_id: string
  expense_type: 'part' | 'labor' | 'shipping' | 'other'
  description: string
  amount: number
  created_at: string
}

// ─── Sale (POS) ───────────────────────────────────────────────────────────────

export interface Sale {
  id: string
  date: string
  customer_name: string
  items: CartItem[]
  subtotal: number
  cost_price: number       // maliyet toplamı (buy_price × qty)
  gross_profit: number     // subtotal - cost_price
  expenses: SaleExpense[]  // ek gider kalemleri
  expense_total: number    // SUM(expenses)
  net_profit: number       // gross_profit - expense_total
  profit_margin: number    // (net_profit / subtotal) × 100
  vat_rate: number         // KDV oranı (default: 20)
  vat_amount: number       // KDV tutarı
  total_with_vat: number   // KDV dahil toplam
  payment_method: string
  // Backward compatibility
  kdv?: number
  total?: number
}

// ─── Service Expense ──────────────────────────────────────────────────────────

export interface ServiceExpense {
  id: string
  service_id: string
  source: 'part' | 'labor' | 'shipping' | 'other'
  reference_id?: string
  description: string
  amount: number
  created_at: string
}

// ─── Service Delivery Record ──────────────────────────────────────────────────

export interface ServiceDelivery {
  service_id: string
  service_fee: number       // servis ücreti
  total_expense: number     // toplam gider
  net_profit: number        // brüt kâr
  profit_margin: number     // kâr marjı %
  delivered_at: string
  financial_posted: boolean
  finance_tx_id?: string    // finansa yazılan kayıt ID
}

// ─── Store Service Order ──────────────────────────────────────────────────────

export interface ServicePartRecord {
  id: string
  stock_id?: string
  name: string
  qty: number
  unit_buy: number
  unit_sell: number
}

export interface ServiceActivityEntry {
  id: string
  action: string
  description: string
  created_at: string
  user?: string
}

export interface StoreServiceOrder {
  id: string
  job_no: string
  customer_name: string
  customer_phone: string
  customer_tc?: string
  device_brand: string
  device_model: string
  imei: string
  color?: string
  password?: string
  accessories?: string[]
  damage_notes?: string[]
  status: string
  technician: string | null
  estimated_cost: number
  actual_cost?: number
  labor_cost?: number
  description?: string
  notes?: string
  created_at: string
  updated_at: string
  eta: string | null
  // Genişletilmiş alanlar (servis detay)
  category?: string
  pre_checks?: string[]
  final_checks?: string[]
  visual_faults?: string[]
  payment_status?: 'unpaid' | 'paid'
  images?: string[]
  private_note?: string
  customer_address?: string
  repair_report?: string
  used_parts?: ServicePartRecord[]
  activity_log?: ServiceActivityEntry[]
  repair_cost?: number
  approval_status?: 'none' | 'pending' | 'approved' | 'rejected'
  approval_amount?: number
  approval_desc?: string
  approval_token?: string
  branch_id?: string
  supplier_order_id?: string
  financial_posted?: boolean
  delivered_at?: string
  net_profit?: number
}

export interface StatusHistoryEntry {
  id: string
  service_order_id: string
  status: string
  note?: string
  user?: string
  created_at: string
}

// ─── Store Data ───────────────────────────────────────────────────────────────

// VantaPhone-style new modules
export interface Purchase {
  id: string
  supplier_name: string
  supplier_phone?: string
  device_brand?: string
  device_model?: string
  imei?: string
  category: 'telefon' | 'aksesuar' | 'yedek_parca' | 'ikinci_el'
  quality: 'sifir' | 'ikinci_el' | 'yenilenmis' | 'yurtdisi' | 'tamirli'
  quantity: number
  buy_price: number
  total_cost: number
  payment_method: string
  invoice_no?: string
  notes?: string
  created_at: string
}

export interface TodoItem {
  id: string
  title: string
  description?: string
  priority: 'dusuk' | 'orta' | 'yuksek' | 'acil'
  category: 'servis' | 'stok' | 'finans' | 'genel' | 'musteri'
  assigned_to?: string
  due_date?: string
  completed: boolean
  created_at: string
}

export interface StolenIMEI {
  id: string
  imei: string
  device_brand?: string
  device_model?: string
  reporter_name?: string
  reporter_phone?: string
  report_date: string
  source: 'btk' | 'musteri' | 'polis' | 'manuel'
  status: 'aktif' | 'kaldirildi' | 'dogrulandi'
  notes?: string
  created_at: string
}

export interface ForeignDevice {
  id: string
  imei: string
  marka: string
  model: string
  musteri_adi: string
  musteri_telefon: string
  durum: 'kayit_bekliyor' | 'kayit_yapildi' | 'tr_kayitli'
  giris_tarihi: string
  kayit_son_tarih: string
  notlar: string
  created_at: string
}

export interface CustomerOrder {
  id: string
  order_no: string
  customer_name: string
  customer_phone: string
  items: { name: string; quantity: number; price: number }[]
  total: number
  status: 'beklemede' | 'onaylandi' | 'hazirlaniyor' | 'kargoda' | 'teslim_edildi' | 'iptal'
  payment_status: 'odenmedi' | 'kismi' | 'odendi'
  payment_method?: string
  notes?: string
  created_at: string
  updated_at: string
}

export interface StoreProduct {
  id: string
  name: string
  category: string
  brand?: string
  model?: string
  price: number
  cost_price: number
  stock_count: number
  imei?: string
  quality: 'sifir' | 'ikinci_el' | 'yenilenmis' | 'yurtdisi' | 'tamirli'
  is_active: boolean
  image_url?: string
  description?: string
  created_at: string
}

export interface Asset {
  id: string
  name: string
  category: 'bilgisayar' | 'yazici' | 'test_cihazi' | 'mobilya' | 'arac' | 'diger'
  serial_no?: string
  barcode?: string
  purchase_date: string
  purchase_price: number
  current_value: number
  assigned_to?: string
  location?: string
  status: 'aktif' | 'bakim' | 'arizali' | 'emekli'
  next_maintenance?: string
  notes?: string
  created_at: string
}

export interface Campaign {
  id: string
  name: string
  description: string
  type: 'indirim' | 'hediye' | '2al1ode' | 'kupon' | 'ozel_fiyat'
  discount_percent?: number
  discount_amount?: number
  target_categories: string[]
  start_date: string
  end_date: string
  is_active: boolean
  usage_count: number
  max_usage?: number
  created_at: string
}

export interface Deal {
  id: string
  title: string
  product_name: string
  original_price: number
  deal_price: number
  stock_count: number
  sold_count: number
  category: string
  is_active: boolean
  end_date: string
  description?: string
  created_at: string
}

export interface StoreCustomer {
  id: string
  full_name: string
  phone: string
  email?: string
  address?: string
  tc_no?: string
  vkn?: string
  customer_type: 'bireysel' | 'kurumsal' | 'bayi'
  segment: 'vip' | 'regular' | 'oneshot'
  company_name?: string
  sms_allowed: boolean
  email_allowed: boolean
  blacklisted: boolean
  blacklist_reason?: string
  total_spent: number
  satisfaction_avg: number
  notes?: string
  kvkk_consent_date?: string
  created_at: string
  updated_at: string
}

export interface WarrantyRecord {
  id: string
  order_id?: string
  customer_id?: string
  customer_name: string
  imei?: string
  invoice_no?: string
  device_brand: string
  device_model: string
  warranty_months: number
  start_date: string
  end_date: string
  covered_parts: string[]
  exclusion_reasons?: string[]
  terms?: string
  order_no?: string
  status: 'aktif' | 'süresi_doldu' | 'iptal' | 'ihlal'
  claim_status?: 'beklemede' | 'onaylandi' | 'reddedildi'
  claim_notes?: string
  qr_token?: string
  sla_days?: number
  notify_before_days?: number
  created_at: string
}

export interface WarrantyClaimRequest {
  id: string
  tenant_id: string
  warranty_id: string
  issue_description: string
  reported_at: string
  technician_notes?: string
  resolution?: 'ücretsiz_onarım' | 'parça_değişimi' | 'ret' | 'ücretli'
  resolution_amount?: number
  status: 'open' | 'in_progress' | 'resolved' | 'rejected'
  created_at: string
}

export interface Appointment {
  id: string
  customer_name: string
  customer_phone: string
  device_brand: string
  device_model: string
  fault_description: string
  appointment_date: string
  appointment_time: string
  duration_minutes: number
  technician_name?: string
  status: 'bekliyor' | 'onaylandi' | 'iptal' | 'tamamlandi' | 'gelmedi'
  notes?: string
  deposit_amount?: number
  deposit_paid?: boolean
  created_at: string
}

export interface PersonnelMember {
  id: string
  full_name: string
  role: string
  position: string
  phone?: string
  email?: string
  branch_name?: string
  hire_date: string
  salary?: number
  commission_rate: number
  daily_target: number
  is_active: boolean
  completed_today: number
  completed_month: number
  avg_repair_time_hours: number
  return_rate: number
  satisfaction_avg: number
  created_at: string
}

export interface SlaConfig {
  id: string
  tenant_id?: string
  category: string
  device_type?: string
  standard_days: number
  legal_max_days: number
  warning_at_percent: number
  escalation_roles: string[]
  auto_notify_customer: boolean
  is_active: boolean
  created_at: string
}

export interface SlaEvent {
  id: string
  order_id: string
  event_type: 'started' | 'paused' | 'resumed' | 'breached' | 'completed' | 'warning'
  note?: string
  timestamp: string
  triggered_by?: string
}

export interface ChecklistItem {
  id: string
  label: string
  required: boolean
  hint?: string
  photo_required?: boolean
}

export interface ChecklistTemplate {
  id: string
  name: string
  category: string
  device_type?: string
  brand_filter?: string[]
  items: ChecklistItem[]
  version: number
  is_active: boolean
}

export interface ChecklistResult {
  id: string
  order_id: string
  template_id?: string
  phase: 'pre_check' | 'qc' | 'delivery'
  answers: { item_id: string; checked: boolean; note?: string; photo_url?: string }[]
  completed_by?: string
  completed_at?: string
}

export interface ImeiEvent {
  id: string
  tenant_id: string
  imei: string
  event_type: 'service' | 'sale' | 'warranty' | 'stolen_check' | 'purchase'
  event_id?: string
  customer_name?: string
  notes?: string
  metadata?: Record<string, any>
  created_at: string
}

export interface InvoiceRecord {
  id: string
  invoice_type: 'efatura' | 'earsiv' | 'irsaliye'
  invoice_no: string
  invoice_date: string
  customer_name: string
  customer_vkn?: string
  order_no?: string
  items: { description: string; quantity: number; unit_price: number; kdv_rate: number }[]
  subtotal: number
  kdv_amount: number
  total: number
  status: 'taslak' | 'onaylandi' | 'gonderildi' | 'iptal'
  gib_reference?: string
  created_at: string
}

export interface NotificationLog {
  id: string
  channel: 'sms' | 'email' | 'whatsapp' | 'push'
  recipient: string
  subject?: string
  content: string
  status: 'pending' | 'sent' | 'delivered' | 'failed'
  order_no?: string
  customer_name?: string
  created_at: string
}

export interface SupportTicket {
  id: string
  ticket_no: string
  subject: string
  priority: 'Düşük' | 'Normal' | 'Yüksek' | 'Acil'
  description: string
  status: 'open' | 'in_progress' | 'waiting_customer' | 'resolved' | 'closed'
  channel: 'portal' | 'whatsapp' | 'email' | 'phone'
  customer_id?: string
  order_id?: string
  assigned_to?: string
  sla_deadline?: string
  first_response_at?: string
  resolved_at?: string
  satisfaction_score?: number
  tags?: string[]
  category: string
  internal_notes?: string
  created_at: string
}

export interface TicketMessage {
  id: string
  ticket_id: string
  sender_type: 'customer' | 'agent' | 'system'
  sender_id?: string
  content: string
  attachments?: { url: string; name: string; type: string }[]
  is_internal: boolean
  created_at: string
}

export interface FieldOrder {
  id: string
  parent_order_id?: string
  customer_id?: string
  technician_id?: string
  address: string
  latitude?: number
  longitude?: number
  scheduled_at?: string
  arrived_at?: string
  completed_at?: string
  status: 'scheduled' | 'en_route' | 'in_progress' | 'completed' | 'cancelled'
  customer_signature?: string
  photos?: string[]
  notes?: string
  created_at: string
}

export interface Dealer {
  id: string
  company_name: string
  contact_name?: string
  email?: string
  phone?: string
  address?: string
  tax_no?: string
  status: 'pending' | 'active' | 'suspended'
  discount_rate: number
  credit_limit: number
  payment_terms: number
  notes?: string
  created_at: string
}

export interface DealerOrder {
  id: string
  dealer_id: string
  order_no: string
  items: { name: string; qty: number; unit_price: number }[]
  subtotal: number
  discount_amount: number
  vat_amount: number
  total: number
  status: 'draft' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled'
  shipping_address?: string
  notes?: string
  created_at: string
}

export interface DealerInvoice {
  id: string
  dealer_id: string
  order_id?: string
  invoice_no: string
  amount: number
  type: 'invoice' | 'payment'
  due_date?: string
  paid_at?: string
  status: 'pending' | 'paid' | 'overdue'
  created_at: string
}

export interface CashShift {
  id: string
  branch_id?: string
  opened_at: string
  closed_at?: string
  opening_balance: number
  closing_balance?: number
  expected_cash?: number
  difference?: number
  opened_by: string
  closed_by?: string
  notes?: string
  status: 'open' | 'closed'
  report_snapshot?: Record<string, unknown>
}

export interface SupplierOrder {
  id: string
  order_no: string
  supplier_name: string
  supplier_phone?: string
  service_order_id?: string
  service_job_no?: string
  items: { stock_id?: string; name: string; qty: number; unit_price: number }[]
  total: number
  status: 'pending' | 'ordered' | 'received' | 'cancelled'
  created_at: string
  expected_at?: string
  notes?: string
}

export interface SecondHandDevice {
  id: string
  brand: string
  model: string
  imei?: string
  barcode: string
  condition: 'mukemmel' | 'iyi' | 'orta' | 'kotu'
  cosmetic_score: number
  battery_health?: number
  color?: string
  storage?: string
  buy_price: number
  sell_price: number
  status: 'stokta' | 'satildi' | 'serviste'
  showcase: boolean
  notes?: string
  created_at: string
  sold_at?: string
}

export interface Branch {
  id: string
  name: string
  address?: string
  phone?: string
  is_main: boolean
  created_at: string
}

export interface NotificationSettings {
  auto_sms: boolean
  auto_whatsapp: boolean
  on_status_change: boolean
  on_delivery: boolean
  require_qc_on_delivery: boolean
  shop_address: string
  shop_phone: string
  shop_name: string
  shop_logo: string
  portal_slug: string
  service_warranty_months: number
}

export interface StoreData {
  stock: StockItem[]
  transactions: FinanceTransaction[]
  sales: Sale[]
  kasaBakiye: number
  serviceExpenses: Record<string, ServiceExpense[]>
  serviceDeliveries: Record<string, ServiceDelivery>
  serviceOrders: StoreServiceOrder[]
  statusHistory: StatusHistoryEntry[]
  // VantaPhone new modules
  purchases: Purchase[]
  todos: TodoItem[]
  stolenIMEIs: StolenIMEI[]
  foreignDevices: ForeignDevice[]
  customerOrders: CustomerOrder[]
  storeProducts: StoreProduct[]
  assets: Asset[]
  campaigns: Campaign[]
  deals: Deal[]
  // Extended ERP modules
  customers: StoreCustomer[]
  appointments: Appointment[]
  personnel: PersonnelMember[]
  warranties: WarrantyRecord[]
  invoices: InvoiceRecord[]
  notificationLogs: NotificationLog[]
  supportTickets: SupportTicket[]
  cashShifts: CashShift[]
  supplierOrders: SupplierOrder[]
  secondHandDevices: SecondHandDevice[]
  branches: Branch[]
  activeBranchId: string | null
  notificationSettings: NotificationSettings
}

// ─── Events ────────────────────────────────────────────────────────────────────

const STORE_CHANGE_EVENT = 'servissoft-store-change'

function syncKasaBakiye(store: StoreData) {
  store.kasaBakiye = computeKasaFromTransactions(store.transactions)
}

function emitChange(module: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(STORE_CHANGE_EVENT, { detail: { module } }))
  }
}

/** Subscribe to store changes. Returns unsubscribe function. */
export function onStoreChange(callback: (module: string) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const handler = (e: Event) => callback((e as CustomEvent).detail?.module ?? '')
  window.addEventListener(STORE_CHANGE_EVENT, handler)
  return () => window.removeEventListener(STORE_CHANGE_EVENT, handler)
}

// ─── Boş Başlangıç ──────────────────────────────────────────────────────────

const STORE_VERSION = 10 // v10: tenant-scoped storage + kasa from transactions

const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  auto_sms: true,
  auto_whatsapp: true,
  on_status_change: true,
  on_delivery: true,
  require_qc_on_delivery: true,
  shop_address: '',
  shop_phone: '0850 000 00 00',
  shop_name: 'AURA İntegra',
  shop_logo: '',
  portal_slug: '',
  service_warranty_months: 3,
}

const EMPTY_STORE: StoreData = {
  stock: [],
  transactions: [],
  sales: [],
  kasaBakiye: 0,
  serviceExpenses: {},
  serviceDeliveries: {},
  serviceOrders: [],
  statusHistory: [],
  purchases: [],
  todos: [],
  stolenIMEIs: [],
  foreignDevices: [],
  customerOrders: [],
  storeProducts: [],
  assets: [],
  campaigns: [],
  deals: [],
  customers: [],
  appointments: [],
  personnel: [],
  warranties: [],
  invoices: [],
  notificationLogs: [],
  supportTickets: [],
  cashShifts: [],
  supplierOrders: [],
  secondHandDevices: [],
  branches: [],
  activeBranchId: null,
  notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
}

function ensureStoreShape(parsed: Partial<StoreData>): StoreData {
  const merged = {
    ...EMPTY_STORE,
    ...parsed,
    stock: parsed.stock ?? [],
    transactions: parsed.transactions ?? [],
    sales: (parsed.sales ?? []).map(s => migrateSale(s as Sale)),
    kasaBakiye: parsed.kasaBakiye ?? 0,
    serviceExpenses: parsed.serviceExpenses ?? {},
    serviceDeliveries: parsed.serviceDeliveries ?? {},
    serviceOrders: parsed.serviceOrders ?? [],
    statusHistory: parsed.statusHistory ?? [],
    purchases: parsed.purchases ?? [],
    todos: parsed.todos ?? [],
    stolenIMEIs: parsed.stolenIMEIs ?? [],
    foreignDevices: parsed.foreignDevices ?? [],
    customerOrders: parsed.customerOrders ?? [],
    storeProducts: parsed.storeProducts ?? [],
    assets: parsed.assets ?? [],
    campaigns: parsed.campaigns ?? [],
    deals: parsed.deals ?? [],
    customers: parsed.customers ?? [],
    appointments: parsed.appointments ?? [],
    personnel: parsed.personnel ?? [],
    warranties: parsed.warranties ?? [],
    invoices: parsed.invoices ?? [],
    notificationLogs: parsed.notificationLogs ?? [],
    supportTickets: parsed.supportTickets ?? [],
    cashShifts: parsed.cashShifts ?? [],
    supplierOrders: parsed.supplierOrders ?? [],
    secondHandDevices: parsed.secondHandDevices ?? [],
    branches: parsed.branches ?? [],
    activeBranchId: parsed.activeBranchId ?? null,
    notificationSettings: { ...DEFAULT_NOTIFICATION_SETTINGS, ...(parsed.notificationSettings ?? {}) },
  }
  if (!merged.notificationSettings.shop_name) {
    merged.notificationSettings.shop_name = DEFAULT_NOTIFICATION_SETTINGS.shop_name
  }
  if (merged.notificationSettings.shop_logo === undefined) {
    merged.notificationSettings.shop_logo = ''
  }
  if (merged.notificationSettings.portal_slug === undefined) {
    merged.notificationSettings.portal_slug = ''
  }
  merged.secondHandDevices = (merged.secondHandDevices ?? []).map(d => ({
    ...d,
    barcode: d.barcode || `VTR${String(d.id).slice(-6).toUpperCase()}`,
    cosmetic_score: d.cosmetic_score ?? (d.condition === 'mukemmel' ? 9 : d.condition === 'iyi' ? 7 : d.condition === 'orta' ? 5 : 3),
    showcase: d.showcase ?? true,
  }))
  if (merged.branches.length === 0) {
    const mainId = uid('branch')
    merged.branches = [{
      id: mainId,
      name: 'Merkez Şube',
      address: merged.notificationSettings.shop_address,
      phone: merged.notificationSettings.shop_phone,
      is_main: true,
      created_at: new Date().toISOString(),
    }]
    merged.activeBranchId = mainId
  } else if (!merged.activeBranchId) {
    merged.activeBranchId = merged.branches.find(b => b.is_main)?.id || merged.branches[0]?.id || null
  }
  return merged
}

// ─── Store Access ──────────────────────────────────────────────────────────────

function loadStore(): StoreData {
  if (typeof window === 'undefined') return EMPTY_STORE
  try {
    const raw = localStorage.getItem(getStoreStorageKey())
    const savedVersion = parseInt(localStorage.getItem(getStoreVersionKey()) || '0', 10)

    if (raw) {
      const parsed = ensureStoreShape(JSON.parse(raw) as Partial<StoreData>)
      if (savedVersion < STORE_VERSION) {
        localStorage.setItem(getStoreVersionKey(), STORE_VERSION.toString())
        saveStore(parsed)
      }
      return parsed
    }

    if (savedVersion < STORE_VERSION) {
      localStorage.setItem(getStoreVersionKey(), STORE_VERSION.toString())
    }
  } catch { /* ignore parse errors */ }
  return EMPTY_STORE
}

/** Migrate old Sale format to new format with profit fields */
function migrateSale(s: Sale): Sale {
  if (s.cost_price !== undefined && s.gross_profit !== undefined) return s
  const subtotal = s.subtotal || s.items.reduce((sum, i) => sum + i.unit_price * i.qty, 0)
  const vatRate = s.vat_rate ?? 20
  const vatAmount = s.vat_amount ?? subtotal * (vatRate / 100)
  return {
    ...s,
    cost_price: s.cost_price ?? 0,
    gross_profit: s.gross_profit ?? subtotal,
    expenses: s.expenses ?? [],
    expense_total: s.expense_total ?? 0,
    net_profit: s.net_profit ?? subtotal,
    profit_margin: s.profit_margin ?? 100,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    total_with_vat: s.total_with_vat ?? subtotal + vatAmount,
  }
}

function saveStore(data: StoreData) {
  if (typeof window === 'undefined') return
  localStorage.setItem(getStoreStorageKey(), JSON.stringify(data))
}

// ─── SALE CALCULATION ENGINE ───────────────────────────────────────────────────

/** Recalculate ALL computed fields on a Sale. Backend-style: never trust frontend. */
function recalculateSale(sale: Sale, store: StoreData): Sale {
  const subtotal = sale.items.reduce((s, i) => s + i.unit_price * i.qty, 0)

  // cost_price = sum of buy_price * qty for each item
  let costPrice = 0
  for (const item of sale.items) {
    const stockItem = store.stock.find(s => s.id === item.stock_id)
    costPrice += (stockItem?.buy_price ?? 0) * item.qty
  }

  const grossProfit = subtotal - costPrice
  const expenseTotal = (sale.expenses || []).reduce((s, e) => s + e.amount, 0)
  const netProfit = grossProfit - expenseTotal
  const profitMargin = subtotal > 0 ? (netProfit / subtotal) * 100 : 0
  const vatRate = sale.vat_rate ?? 20
  const vatAmount = subtotal * (vatRate / 100)
  const totalWithVat = subtotal + vatAmount

  return {
    ...sale,
    subtotal,
    cost_price: costPrice,
    gross_profit: grossProfit,
    expenses: sale.expenses || [],
    expense_total: expenseTotal,
    net_profit: netProfit,
    profit_margin: Math.round(profitMargin * 100) / 100,
    vat_rate: vatRate,
    vat_amount: vatAmount,
    total_with_vat: totalWithVat,
    // backward compat
    kdv: vatAmount,
    total: totalWithVat,
  }
}

// ─── PUBLIC READ API ───────────────────────────────────────────────────────────

export function getStore(): StoreData { return loadStore() }

/** Supabase sync — uzaktan gelen veriyi store'a yazar (local cache) */
export function hydrateStoreFromRemote(data: Partial<StoreData>): void {
  const store = loadStore()
  const preserveIfEmpty: (keyof StoreData)[] = ['serviceExpenses', 'serviceDeliveries', 'statusHistory']
  const keys = Object.keys(data) as (keyof StoreData)[]
  for (const key of keys) {
    const val = data[key]
    if (val === undefined) continue
    if (preserveIfEmpty.includes(key) && typeof val === 'object' && val !== null && !Array.isArray(val) && Object.keys(val as object).length === 0) {
      continue
    }
    if (key === 'serviceOrders' && Array.isArray(val) && Array.isArray(store.serviceOrders)) {
      const remote = val as StoreServiceOrder[]
      const byId = new Map(store.serviceOrders.map(o => [o.id, o]))
      for (const r of remote) {
        const local = byId.get(r.id)
        if (!local) {
          byId.set(r.id, r)
          continue
        }
        const localTs = new Date(local.updated_at ?? local.created_at).getTime()
        const remoteTs = new Date(r.updated_at ?? r.created_at).getTime()
        byId.set(r.id, remoteTs >= localTs ? r : local)
      }
      store.serviceOrders = Array.from(byId.values()).sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      )
      continue
    }
    if (key === 'stock' && Array.isArray(val) && Array.isArray(store.stock)) {
      const remote = val as StockItem[]
      const byId = new Map(store.stock.map(s => [s.id, s]))
      for (const r of remote) byId.set(r.id, r)
      store.stock = Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name, 'tr'))
      continue
    }
    if (key === 'transactions' && Array.isArray(val) && Array.isArray(store.transactions)) {
      const remote = val as FinanceTransaction[]
      const byId = new Map(store.transactions.map(t => [t.id, t]))
      for (const r of remote) byId.set(r.id, r)
      store.transactions = Array.from(byId.values()).sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
      )
      continue
    }
    // eslint-disable-next-line -- legacy store dynamic key assignment
    ;(store as any)[key] = val
  }
  saveStore(store)
  syncKasaBakiye(store)
  emitChange('all')
}
export function getStock(): StockItem[] { return loadStore().stock }
export function getTransactions(): FinanceTransaction[] { return loadStore().transactions }
export function getSales(): Sale[] { return loadStore().sales }

export function replaceSales(items: Sale[], opts?: { silent?: boolean }): void {
  const store = loadStore()
  store.sales = items
  saveStore(store)
  if (!opts?.silent) emitChange('sales')
}

export function getSaleById(saleId: string): Sale | undefined {
  return loadStore().sales.find(s => s.id === saleId)
}

export function getServiceExpenses(serviceId: string): ServiceExpense[] {
  return loadStore().serviceExpenses[serviceId] || []
}

export function getServiceDelivery(serviceId: string): ServiceDelivery | undefined {
  return loadStore().serviceDeliveries[serviceId]
}

// ─── SERVICE ORDER CRUD ────────────────────────────────────────────────────────

/** Get all service orders from store */
export function getServiceOrders(): StoreServiceOrder[] {
  return loadStore().serviceOrders
}

/** API senkronizasyonu — tüm servis listesini değiştir */
export function replaceServiceOrders(
  orders: StoreServiceOrder[],
  opts?: { silent?: boolean },
): void {
  const store = loadStore()
  const prev = JSON.stringify(store.serviceOrders)
  const next = JSON.stringify(orders)
  if (prev === next) return
  store.serviceOrders = orders
  saveStore(store)
  if (!opts?.silent) emitChange('service')
}

/** Tek kayıt ekle veya güncelle */
export function upsertServiceOrder(order: StoreServiceOrder): void {
  const store = loadStore()
  const idx = store.serviceOrders.findIndex(o => o.id === order.id)
  if (idx >= 0) store.serviceOrders[idx] = { ...store.serviceOrders[idx], ...order }
  else store.serviceOrders.push(order)
  saveStore(store)
  emitChange('service')
}

/** Get a single service order by ID */
export function getServiceOrderById(orderId: string): StoreServiceOrder | undefined {
  return loadStore().serviceOrders.find(o => o.id === orderId)
}

/** Get status history for a service order */
export function getStatusHistory(serviceOrderId: string): StatusHistoryEntry[] {
  return loadStore().statusHistory.filter(h => h.service_order_id === serviceOrderId)
}

/** Create a new service order and persist to localStorage */
export function addServiceOrder(order: Omit<StoreServiceOrder, 'id' | 'updated_at'>): StoreServiceOrder {
  const store = loadStore()
  const newOrder: StoreServiceOrder = {
    ...order,
    id: order.job_no ? `so_${order.job_no}` : `so_${Date.now()}`,
    updated_at: new Date().toISOString(),
  }
  store.serviceOrders.push(newOrder)
  // Add initial status history entry
  store.statusHistory.push({
    id: uid('sh'),
    service_order_id: newOrder.id,
    status: order.status || 'waiting_diagnosis',
    note: 'Servis kaydı oluşturuldu',
    user: 'Sistem',
    created_at: new Date().toISOString(),
  })
  saveStore(store)
  emitChange('service')
  notifyServiceEvent(newOrder, 'order_created')
  return newOrder
}

function notifyServiceEvent(order: StoreServiceOrder, templateKey: keyof typeof SMS_TEMPLATES, extra?: Partial<StoreServiceOrder>) {
  const store = loadStore()
  const settings = store.notificationSettings
  if (!settings.auto_sms && !settings.auto_whatsapp) return

  const tpl = SMS_TEMPLATES[templateKey]
  if (!tpl) return

  const o = { ...order, ...extra }
  const amount = o.approval_amount || o.actual_cost || o.estimated_cost || 0
  const vars: Record<string, string | number> = {
    musteri_adi: o.customer_name,
    ariza_no: o.job_no,
    cihaz: `${o.device_brand} ${o.device_model}`,
    tutar: amount,
    takip_link: buildTrackingUrl(o.job_no),
    onay_link: o.approval_token ? buildApprovalUrl(o.approval_token) : buildTrackingUrl(o.job_no),
    adres: settings.shop_address,
    firma_adi: settings.shop_name || 'AURA İntegra',
    firma_telefon: settings.shop_phone,
    firma_adres: settings.shop_address,
    tarih: new Date().toLocaleDateString('tr-TR'),
    saat: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
    anket_link: buildTrackingUrl(o.job_no),
    iptal_link: settings.shop_phone,
  }
  const content = renderTemplate(tpl.text, vars)
  const channel = settings.auto_whatsapp ? 'whatsapp' : 'sms'
  addNotificationLog({
    channel,
    recipient: o.customer_phone,
    content,
    status: 'delivered',
    order_no: o.job_no,
    customer_name: o.customer_name,
  })
}

function handleStatusAutomation(orderId: string, newStatus: string) {
  const store = loadStore()
  const order = store.serviceOrders.find(o => o.id === orderId)
  if (!order || !store.notificationSettings.on_status_change) return

  if (newStatus === 'customer_approval_pending') {
    let token = order.approval_token
    if (!token) {
      token = generateToken()
      store.serviceOrders.find(o => o.id === orderId)!.approval_token = token
      store.serviceOrders.find(o => o.id === orderId)!.approval_status = 'pending'
      store.serviceOrders.find(o => o.id === orderId)!.approval_amount = order.actual_cost || order.estimated_cost
      saveStore(store)
    }
    notifyServiceEvent(order, 'approval_request', { approval_token: token })
    return
  }
  if (newStatus === 'ready_for_pickup') {
    notifyServiceEvent(order, 'ready_pickup')
    return
  }
  if (newStatus === 'in_repair') {
    notifyServiceEvent(order, 'repair_done')
  }
}

/** Servis aktivite günlüğüne kayıt ekle */
export function appendServiceActivity(
  orderId: string,
  action: string,
  description: string,
  user = 'Kullanıcı',
): void {
  const order = getServiceOrderById(orderId)
  if (!order) return
  const log = [...(order.activity_log || [])]
  log.unshift({
    id: uid('log'),
    action,
    description,
    created_at: new Date().toISOString(),
    user,
  })
  updateServiceOrder(orderId, { activity_log: log })
}

/** Update a service order */
export function updateServiceOrder(orderId: string, updates: Partial<StoreServiceOrder>): StoreServiceOrder | null {
  const store = loadStore()
  const idx = store.serviceOrders.findIndex(o => o.id === orderId)
  if (idx === -1) return null
  store.serviceOrders[idx] = { ...store.serviceOrders[idx], ...updates, updated_at: new Date().toISOString() }
  saveStore(store)
  emitChange('service')
  return store.serviceOrders[idx]
}

/** Update service order status + add history entry */
export function updateServiceStatus(orderId: string, newStatus: string, note?: string, user?: string): boolean {
  const store = loadStore()
  const idx = store.serviceOrders.findIndex(o => o.id === orderId)
  if (idx === -1) return false
  store.serviceOrders[idx].status = newStatus
  store.serviceOrders[idx].updated_at = new Date().toISOString()
  store.statusHistory.push({
    id: `sh_${Date.now()}`,
    service_order_id: orderId,
    status: newStatus,
    note: note || undefined,
    user: user || 'Kullanıcı',
    created_at: new Date().toISOString(),
  })
  saveStore(store)
  emitChange('service')
  handleStatusAutomation(orderId, newStatus)
  return true
}
export function removeServiceOrder(orderId: string): boolean {
  const store = loadStore()
  const idx = store.serviceOrders.findIndex(o => o.id === orderId)
  if (idx === -1) return false
  store.serviceOrders.splice(idx, 1)
  store.statusHistory = store.statusHistory.filter(h => h.service_order_id !== orderId)
  delete store.serviceExpenses[orderId]
  delete store.serviceDeliveries[orderId]
  saveStore(store)
  emitChange('service')
  return true
}

/**
 * Cari (veresiye) defter hareketleri gerçek işletme geliri/gideri değildir:
 * borç kaydı gider olmadığı gibi, tahsilat da (gelir teslim/satışta zaten
 * yazıldığı için) ikinci kez gelir sayılmamalıdır.
 */
export const CARI_CATEGORIES: readonly string[] = ['Cari Borç', 'Cari Tahsilat']

export function isCariTransaction(t: { category?: string }): boolean {
  return CARI_CATEGORIES.includes(t.category ?? '')
}

/** Compute finance summary from real data */
export function getFinanceSummary() {
  const store = loadStore()
  const reportTxs = store.transactions.filter(t => !isCariTransaction(t))
  const totalGelir = reportTxs.filter(t => t.type === 'gelir').reduce((s, t) => s + t.amount, 0)
  const totalGider = reportTxs.filter(t => t.type === 'gider').reduce((s, t) => s + t.amount, 0)
  const totalStockValue = store.stock.reduce((s, p) => s + p.buy_price * p.stock_qty, 0)
  const criticalStockCount = store.stock.filter(p => p.stock_qty <= p.min_stock).length
  return {
    totalGelir,
    totalGider,
    netKar: totalGelir - totalGider,
    kasaBakiye: store.kasaBakiye,
    totalStockValue,
    criticalStockCount,
    totalStockItems: store.stock.length,
    totalStockQty: store.stock.reduce((s, p) => s + p.stock_qty, 0),
  }
}

// ─── STOCK MUTATIONS ───────────────────────────────────────────────────────────

export function addStockItem(item: Omit<StockItem, 'id'>): StockItem {
  /** @deprecated Prefer addStockItemViaApi — cache-only fallback */
  const store = loadStore()
  const newItem: StockItem = { ...item, id: uid('s') }
  store.stock.push(newItem)
  saveStore(store)
  emitChange('stock')
  return newItem
}

export function replaceStock(items: StockItem[], opts?: { silent?: boolean }): void {
  const store = loadStore()
  const prev = JSON.stringify(store.stock)
  const next = JSON.stringify(items)
  if (prev === next) return
  store.stock = items
  saveStore(store)
  if (!opts?.silent) emitChange('stock')
}

export function upsertStockItem(item: StockItem, opts?: { silent?: boolean }): void {
  const store = loadStore()
  const idx = store.stock.findIndex(s => s.id === item.id)
  if (idx >= 0) store.stock[idx] = { ...store.stock[idx], ...item }
  else store.stock.push(item)
  saveStore(store)
  if (!opts?.silent) emitChange('stock')
}

export function updateStockQty(id: string, newQty: number) {
  /** @deprecated Prefer updateStockQtyViaApi — cache-only fallback */
  const store = loadStore()
  const idx = store.stock.findIndex(s => s.id === id)
  if (idx === -1) return
  store.stock[idx].stock_qty = newQty
  saveStore(store)
  emitChange('stock')
}

export function usePartsForService(parts: UsedPart[], orderNo: string, customerName: string) {
  const store = loadStore()
  let totalPartsRevenue = 0
  for (const part of parts) {
    const stockItem = store.stock.find(s => s.id === part.stock_id)
    if (stockItem) {
      stockItem.stock_qty = Math.max(0, stockItem.stock_qty - part.qty)
      totalPartsRevenue += part.unit_sell * part.qty
    }
  }
  if (totalPartsRevenue > 0) {
    store.transactions.push({
      id: uid('ft'),
      type: 'gelir',
      description: `Yedek parça — ${parts.map(p => p.name).join(', ')}`,
      category: 'Yedek Parça',
      amount: totalPartsRevenue,
      payment_method: 'nakit',
      date: new Date().toISOString(),
      customer_name: customerName,
      order_no: orderNo,
    })
  }
  saveStore(store)
  emitChange('stock')
  emitChange('finance')
}

// ─── FINANCE MUTATIONS ─────────────────────────────────────────────────────────

export function addTransaction(tx: Omit<FinanceTransaction, 'id'>): FinanceTransaction {
  const store = loadStore()
  const newTx: FinanceTransaction = { ...tx, id: uid('ft') }
  store.transactions.push(newTx)
  syncKasaBakiye(store)
  saveStore(store)
  emitChange('finance')
  return newTx
}

/** Realtime / API senkron — tek finans kaydı ekle veya güncelle */
export function upsertFinanceTransaction(tx: FinanceTransaction, opts?: { silent?: boolean }): void {
  const store = loadStore()
  const idx = store.transactions.findIndex(t => t.id === tx.id)
  if (idx >= 0) store.transactions[idx] = tx
  else store.transactions.unshift(tx)
  syncKasaBakiye(store)
  saveStore(store)
  if (!opts?.silent) emitChange('finance')
}

export function removeFinanceTransactionById(id: string): void {
  const store = loadStore()
  store.transactions = store.transactions.filter(t => t.id !== id)
  syncKasaBakiye(store)
  saveStore(store)
  emitChange('finance')
}

/** Sunucu tarafı işlem — kasa RPC tek kaynak */
export async function addTransactionViaApi(
  tx: Omit<FinanceTransaction, 'id'>,
): Promise<FinanceTransaction> {
  const res = await fetch('/api/tenant/transactions', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ transaction: tx }),
  })
  const json = await res.json() as { error?: string; transaction_id?: string; kasa_balance?: number }
  if (!res.ok) throw new Error(json.error || 'İşlem kaydedilemedi')

  const store = loadStore()
  const newTx: FinanceTransaction = { ...tx, id: json.transaction_id ?? uid('ft') }
  store.transactions.push(newTx)
  if (json.kasa_balance != null) store.kasaBakiye = json.kasa_balance
  else syncKasaBakiye(store)
  saveStore(store)
  emitChange('finance')
  return newTx
}

export function recordServiceRevenue(orderNo: string, customerName: string, laborCost: number, paymentMethod: string) {
  const store = loadStore()
  if (laborCost > 0) {
    store.transactions.push({
      id: uid('ft'),
      type: 'gelir',
      description: `Servis ücreti (işçilik) — ${orderNo}`,
      category: 'Servis Ücreti',
      amount: laborCost,
      payment_method: paymentMethod,
      date: new Date().toISOString(),
      customer_name: customerName,
      order_no: orderNo,
    })
    syncKasaBakiye(store)
  }
  saveStore(store)
  emitChange('finance')
}

// ─── SALES (POS) MUTATIONS — WITH PROFIT CALCULATION ────────────────────────

/** Complete a POS sale — DECREASES stock, CALCULATES profit, CREATES gelir transaction */
/** @deprecated Prefer completeSaleViaApi — local-only, do not use from UI */
export function completeSale(
  items: CartItem[],
  customerName: string,
  paymentMethod: string,
  vatRate: number = 20
): Sale {
  const store = loadStore()

  for (const item of items) {
    const stockItem = store.stock.find(s => s.id === item.stock_id)
    if (!stockItem || stockItem.stock_qty < item.qty) {
      throw new Error(`Yetersiz stok: ${item.name} (mevcut: ${stockItem?.stock_qty ?? 0})`)
    }
  }

  for (const item of items) {
    const stockItem = store.stock.find(s => s.id === item.stock_id)!
    stockItem.stock_qty -= item.qty
  }

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.qty, 0)

  // Build sale shell then recalculate
  let sale: Sale = {
    id: uid('sale'),
    date: new Date().toISOString(),
    customer_name: customerName,
    items,
    subtotal,
    cost_price: 0,
    gross_profit: 0,
    expenses: [],
    expense_total: 0,
    net_profit: 0,
    profit_margin: 0,
    vat_rate: vatRate,
    vat_amount: 0,
    total_with_vat: 0,
    payment_method: paymentMethod,
  }
  sale = recalculateSale(sale, store)
  store.sales.push(sale)

  // Add gelir transaction
  store.transactions.push({
    id: uid('ft'),
    type: 'gelir',
    description: `POS Satış — ${items.map(i => i.name).join(', ')}`,
    category: 'Satış',
    amount: sale.total_with_vat,
    payment_method: paymentMethod,
    date: new Date().toISOString(),
    customer_name: customerName,
  })
  syncKasaBakiye(store)

  saveStore(store)
  emitChange('stock')
  emitChange('finance')
  emitChange('sales')
  return sale
}

/** POS satış — sunucu tarafı atomik stok + kasa */
export async function completeSaleViaApi(
  items: CartItem[],
  customerName: string,
  paymentMethod: string,
  vatRate: number = 20,
): Promise<Sale> {
  const store = loadStore()
  const enriched = items.map(i => ({
    ...i,
    cost_price: store.stock.find(s => s.id === i.stock_id)?.buy_price ?? 0,
  }))

  const res = await fetch('/api/tenant/sales', {
    method: 'POST',
    credentials: 'same-origin',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      items: enriched,
      customer_name: customerName,
      payment_method: paymentMethod,
      vat_rate: vatRate,
    }),
  })
  const json = await res.json() as {
    error?: string
    sale_id?: string
    transaction_id?: string
    total_with_vat?: number
    subtotal?: number
    vat_rate?: number
    vat_amount?: number
    cost_price?: number
    kasa_balance?: number
    parts?: Record<string, unknown>[]
  }
  if (!res.ok) throw new Error(json.error || 'Satış tamamlanamadı')

  // Hydrate stock from API parts (source of truth)
  if (json.parts?.length) {
    for (const row of json.parts) {
      const mapped = {
        id: String(row.id),
        name: String(row.name ?? ''),
        barcode: String(row.barcode ?? ''),
        category: String(row.category ?? ''),
        compatible_brands: Array.isArray(row.compatible_brands) ? row.compatible_brands as string[] : [],
        stock_qty: Number(row.stock_qty) || 0,
        min_stock: Number(row.min_stock) || 0,
        buy_price: Number(row.buy_price) || 0,
        sell_price: Number(row.sell_price) || 0,
        supplier: String(row.supplier ?? ''),
      }
      const idx = store.stock.findIndex(s => s.id === mapped.id)
      if (idx >= 0) store.stock[idx] = { ...store.stock[idx], ...mapped }
    }
  } else {
    for (const item of items) {
      const stockItem = store.stock.find(s => s.id === item.stock_id)
      if (stockItem) stockItem.stock_qty -= item.qty
    }
  }

  const subtotal = json.subtotal ?? items.reduce((s, i) => s + i.unit_price * i.qty, 0)
  const costPrice = json.cost_price ?? 0
  const vatAmount = json.vat_amount ?? subtotal * (vatRate / 100)
  const totalWithVat = json.total_with_vat ?? subtotal + vatAmount
  const gross = subtotal - costPrice

  const sale: Sale = {
    id: json.sale_id ?? uid('sale'),
    date: new Date().toISOString(),
    customer_name: customerName,
    items,
    subtotal,
    cost_price: costPrice,
    gross_profit: gross,
    expenses: [],
    expense_total: 0,
    net_profit: gross,
    profit_margin: subtotal > 0 ? (gross / subtotal) * 100 : 0,
    vat_rate: json.vat_rate ?? vatRate,
    vat_amount: vatAmount,
    total_with_vat: totalWithVat,
    payment_method: paymentMethod,
  }
  store.sales.push(sale)

  store.transactions.push({
    id: json.transaction_id ?? uid('ft'),
    type: 'gelir',
    description: `POS Satış — ${items.map(i => i.name).join(', ')}`,
    category: 'Satış',
    amount: sale.total_with_vat,
    payment_method: paymentMethod,
    date: new Date().toISOString(),
    customer_name: customerName,
  })
  if (json.kasa_balance != null) store.kasaBakiye = json.kasa_balance
  else syncKasaBakiye(store)

  saveStore(store)
  emitChange('stock')
  emitChange('finance')
  emitChange('sales')
  return sale
}

/** Add expense to an existing sale, recalculate profit */
export function addSaleExpense(saleId: string, expense: Omit<SaleExpense, 'id' | 'sale_id' | 'created_at'>): SaleExpense | null {
  const store = loadStore()
  const saleIdx = store.sales.findIndex(s => s.id === saleId)
  if (saleIdx === -1) return null

  const newExpense: SaleExpense = {
    ...expense,
    id: uid('se'),
    sale_id: saleId,
    created_at: new Date().toISOString(),
  }
  if (!store.sales[saleIdx].expenses) store.sales[saleIdx].expenses = []
  store.sales[saleIdx].expenses.push(newExpense)
  store.sales[saleIdx] = recalculateSale(store.sales[saleIdx], store)

  saveStore(store)
  emitChange('sales')
  return newExpense
}

/** Remove expense from a sale, recalculate profit */
export function removeSaleExpense(saleId: string, expenseId: string): boolean {
  const store = loadStore()
  const saleIdx = store.sales.findIndex(s => s.id === saleId)
  if (saleIdx === -1) return false

  store.sales[saleIdx].expenses = (store.sales[saleIdx].expenses || []).filter(e => e.id !== expenseId)
  store.sales[saleIdx] = recalculateSale(store.sales[saleIdx], store)

  saveStore(store)
  emitChange('sales')
  return true
}

// ─── SERVICE EXPENSE MUTATIONS ─────────────────────────────────────────────────

/** Add a service expense (parça eklenince, işçilik vs.) */
export function addServiceExpense(
  serviceId: string,
  expense: Omit<ServiceExpense, 'id' | 'service_id' | 'created_at'>
): ServiceExpense {
  const store = loadStore()
  if (!store.serviceExpenses[serviceId]) store.serviceExpenses[serviceId] = []

  const newExp: ServiceExpense = {
    ...expense,
    id: uid('sexp'),
    service_id: serviceId,
    created_at: new Date().toISOString(),
  }
  store.serviceExpenses[serviceId].push(newExp)

  saveStore(store)
  emitChange('service')
  emitChange('serviceExpenses')
  return newExp
}

/** Update service expense amount (e.g., part cost changed) */
export function updateServiceExpense(serviceId: string, expenseId: string, newAmount: number): boolean {
  const store = loadStore()
  const expenses = store.serviceExpenses[serviceId]
  if (!expenses) return false
  const exp = expenses.find(e => e.id === expenseId)
  if (!exp) return false
  exp.amount = newAmount
  saveStore(store)
  emitChange('service')
  emitChange('serviceExpenses')
  return true
}

/** Remove a service expense (parça silinince) */
export function removeServiceExpense(serviceId: string, expenseId: string): boolean {
  const store = loadStore()
  const expenses = store.serviceExpenses[serviceId]
  if (!expenses) return false
  store.serviceExpenses[serviceId] = expenses.filter(e => e.id !== expenseId)
  saveStore(store)
  emitChange('service')
  emitChange('serviceExpenses')
  return true
}

/** Calculate service profit preview (before delivery) */
export function getServiceProfitPreview(serviceId: string, serviceFee: number): {
  partExpense: number
  otherExpense: number
  totalExpense: number
  netProfit: number
  profitMargin: number
} {
  const expenses = getServiceExpenses(serviceId)
  const partExpense = expenses.filter(e => e.source === 'part').reduce((s, e) => s + e.amount, 0)
  const otherExpense = expenses.filter(e => e.source !== 'part').reduce((s, e) => s + e.amount, 0)
  const totalExpense = partExpense + otherExpense
  const netProfit = serviceFee - totalExpense
  const profitMargin = serviceFee > 0 ? (netProfit / serviceFee) * 100 : 0

  return {
    partExpense,
    otherExpense,
    totalExpense,
    netProfit,
    profitMargin: Math.round(profitMargin * 100) / 100,
  }
}

/** Deliver a service — finalize profit & write to finance.
 *  Returns null if already posted (duplicate protection). */
export function deliverService(
  serviceId: string,
  serviceFee: number,
  jobNo: string,
  customerName: string,
  paymentMethod: string = 'nakit'
): ServiceDelivery | null {
  if (serviceFee <= 0) {
    console.error(`[Store] deliverService: servis ücreti 0 veya negatif (${serviceFee})`)
    return null
  }

  const store = loadStore()
  const order = store.serviceOrders.find(o => o.id === serviceId)

  if (store.notificationSettings.require_qc_on_delivery && order && !isQcComplete(order.final_checks)) {
    console.warn(`[Store] deliverService: QC checklist tamamlanmamış (${serviceId})`)
    return null
  }

  // Duplicate control
  const existing = store.serviceDeliveries[serviceId]
  if (existing?.financial_posted) {
    console.warn(`[Store] deliverService: ${serviceId} zaten teslim edilmiş, finans kaydı var`)
    return existing
  }

  // Calculate
  const expenses = store.serviceExpenses[serviceId] || []
  const totalExpense = expenses.reduce((s, e) => s + e.amount, 0)
  const netProfit = serviceFee - totalExpense
  const profitMargin = (netProfit / serviceFee) * 100

  // Create finance entry
  const financeTxId = uid('ft')
  store.transactions.push({
    id: financeTxId,
    type: 'gelir',
    description: `Servis teslim — ${jobNo}`,
    category: 'Servis Teslim',
    amount: serviceFee,
    payment_method: paymentMethod,
    date: new Date().toISOString(),
    customer_name: customerName,
    order_no: jobNo,
    service_id: serviceId,
  })

  // If there are expenses, also record them as gider
  if (totalExpense > 0) {
    store.transactions.push({
      id: uid('ft'),
      type: 'gider',
      description: `Servis gider — ${jobNo} (parça + işçilik)`,
      category: 'Servis Gider',
      amount: totalExpense,
      payment_method: 'nakit',
      date: new Date().toISOString(),
      order_no: jobNo,
      service_id: serviceId,
    })
  }
  syncKasaBakiye(store)

  // Save delivery record
  const delivery: ServiceDelivery = {
    service_id: serviceId,
    service_fee: serviceFee,
    total_expense: totalExpense,
    net_profit: netProfit,
    profit_margin: Math.round(profitMargin * 100) / 100,
    delivered_at: new Date().toISOString(),
    financial_posted: true,
    finance_tx_id: financeTxId,
  }
  store.serviceDeliveries[serviceId] = delivery

  if (order) {
    order.financial_posted = true
    order.delivered_at = delivery.delivered_at
    order.actual_cost = serviceFee
    order.net_profit = netProfit
    order.status = 'delivered'
    order.updated_at = delivery.delivered_at
  }

  // Otomatik servis garantisi
  if (order && store.notificationSettings.service_warranty_months > 0) {
    const months = store.notificationSettings.service_warranty_months
    const start = new Date().toISOString().split('T')[0]
    const endDate = new Date()
    endDate.setMonth(endDate.getMonth() + months)
    store.warranties.unshift({
      id: uid('warr'),
      order_id: serviceId,
      customer_id: '',
      imei: order.imei,
      device_brand: order.device_brand,
      device_model: order.device_model,
      warranty_months: months,
      start_date: start,
      end_date: endDate.toISOString().split('T')[0],
      covered_parts: ['İşçilik', 'Değiştirilen Parçalar'],
      terms: 'Servis sonrası garanti',
      status: 'aktif',
      customer_name: customerName,
      order_no: jobNo,
      created_at: new Date().toISOString(),
    })
  }

  saveStore(store)
  emitChange('finance')
  emitChange('service')
  emitChange('warranties')
  if (order && store.notificationSettings.on_delivery) {
    notifyServiceEvent(order, 'delivered', { actual_cost: serviceFee })
  }
  return delivery
}

/** Undo a service delivery — removes financial_posted flag, keeps expenses */
export function undoServiceDelivery(serviceId: string): boolean {
  const store = loadStore()
  const delivery = store.serviceDeliveries[serviceId]
  if (!delivery) return false

  // Remove finance transactions for this service
  store.transactions = store.transactions.filter(t => t.service_id !== serviceId)
  // Recalculate kasaBakiye from scratch
  store.kasaBakiye = store.transactions.reduce((sum, t) => {
    return t.type === 'gelir' ? sum + t.amount : sum - t.amount
  }, 0)

  delete store.serviceDeliveries[serviceId]
  const order = store.serviceOrders.find(o => o.id === serviceId)
  if (order) {
    order.financial_posted = false
    order.delivered_at = undefined
  }
  saveStore(store)
  emitChange('finance')
  emitChange('service')
  return true
}

// ─── STOCK PURCHASE ────────────────────────────────────────────────────────────

/** Sunucu parça düşümü sonrası yerel stok cache */
export function applyRemotePartsUse(
  stockItems: StockItem[],
  usedPartsMeta: unknown[] | undefined,
  orderId: string,
): void {
  const store = loadStore()
  for (const item of stockItems) {
    const idx = store.stock.findIndex(s => s.id === item.id)
    if (idx >= 0) store.stock[idx] = { ...store.stock[idx], ...item }
    else store.stock.push(item)
  }
  const order = store.serviceOrders.find(o => o.id === orderId)
  if (order && Array.isArray(usedPartsMeta)) {
    order.used_parts = usedPartsMeta.map(p => {
      const part = p as Record<string, unknown>
      return {
        id: String(part.id ?? part.stock_id ?? ''),
        name: String(part.name ?? ''),
        qty: Number(part.qty) || 0,
        unit_buy: Number(part.unit_buy) || 0,
        unit_sell: Number(part.unit_sell) || 0,
      }
    }).filter(p => p.id)
    order.updated_at = new Date().toISOString()
  }
  saveStore(store)
  emitChange('stock')
  emitChange('service')
}

/** Sunucu teslim sonrası yerel cache (finans tekrar yazılmaz) */
export function applyRemoteServiceDelivery(
  serviceId: string,
  delivery: ServiceDelivery,
  opts: {
    job_no: string
    customer_name: string
    payment_method: string
    kasa_balance?: number
    stock_items?: StockItem[]
  },
): void {
  const store = loadStore()
  store.serviceDeliveries[serviceId] = delivery

  if (opts.stock_items?.length) {
    for (const item of opts.stock_items) {
      const idx = store.stock.findIndex(s => s.id === item.id)
      if (idx >= 0) store.stock[idx] = { ...store.stock[idx], ...item }
      else store.stock.push(item)
    }
  }

  store.transactions.push({
    id: delivery.finance_tx_id || uid('ft'),
    type: 'gelir',
    description: `Servis teslim — ${opts.job_no}`,
    category: 'Servis Teslim',
    amount: delivery.service_fee,
    payment_method: opts.payment_method,
    date: delivery.delivered_at,
    customer_name: opts.customer_name,
    order_no: opts.job_no,
    service_id: serviceId,
  })
  // Parça maliyeti alışta zaten gider yazıldı; burada Servis Gider eklemek çift sayım olur
  if (opts.kasa_balance != null) store.kasaBakiye = opts.kasa_balance
  else syncKasaBakiye(store)

  const order = store.serviceOrders.find(o => o.id === serviceId)
  if (order) {
    order.financial_posted = true
    order.delivered_at = delivery.delivered_at
    order.actual_cost = delivery.service_fee
    order.net_profit = delivery.net_profit
    order.status = 'delivered'
    order.updated_at = delivery.delivered_at
  }

  saveStore(store)
  emitChange('finance')
  emitChange('service')
  emitChange('stock')
}

export function applyRemoteStockReceive(
  stockItem: StockItem,
  qty: number,
  totalCost: number,
  kasaBalance?: number,
): void {
  const store = loadStore()
  const idx = store.stock.findIndex(s => s.id === stockItem.id)
  if (idx >= 0) store.stock[idx] = { ...store.stock[idx], ...stockItem }
  else store.stock.push(stockItem)

  store.transactions.push({
    id: uid('ft'),
    type: 'gider',
    description: `Stok alımı — ${stockItem.name} (${qty} adet)`,
    category: 'Tedarikçi',
    amount: totalCost,
    payment_method: 'havale',
    date: new Date().toISOString(),
  })
  if (kasaBalance != null) store.kasaBakiye = kasaBalance
  else syncKasaBakiye(store)
  saveStore(store)
  emitChange('stock')
  emitChange('finance')
}

export function receiveStock(stockId: string, qty: number, totalCost: number, supplier: string) {
  const store = loadStore()
  const item = store.stock.find(s => s.id === stockId)
  if (item) item.stock_qty += qty

  store.transactions.push({
    id: uid('ft'),
    type: 'gider',
    description: `Stok alımı — ${item?.name || 'Bilinmeyen'} (${qty} adet)`,
    category: 'Tedarikçi',
    amount: totalCost,
    payment_method: 'havale',
    date: new Date().toISOString(),
  })
  syncKasaBakiye(store)

  saveStore(store)
  emitChange('stock')
  emitChange('finance')
}

/** Reset store to defaults */
export function resetStore() {
  if (typeof window === 'undefined') return
  purgeTenantStore()
  localStorage.setItem(getStoreVersionKey(), STORE_VERSION.toString())
  emitChange('stock')
  emitChange('finance')
  emitChange('sales')
  emitChange('service')
  emitChange('customers')
  emitChange('appointments')
  emitChange('personnel')
  emitChange('warranties')
  emitChange('invoices')
  emitChange('notifications')
  emitChange('support')
  emitChange('storeProducts')
  emitChange('purchases')
  emitChange('todos')
  emitChange('stolenIMEIs')
  emitChange('foreignDevices')
  emitChange('customerOrders')
  emitChange('assets')
  emitChange('campaigns')
  emitChange('deals')
}

// ─── MODULE SLICE HELPERS ─────────────────────────────────────────────────────

function updateSlice<K extends keyof StoreData>(key: K, value: StoreData[K], module: string) {
  const store = loadStore()
  store[key] = value
  saveStore(store)
  emitChange(module)
}

// ─── Store Products (Mağaza) ──────────────────────────────────────────────────

export function getStoreProducts(): StoreProduct[] { return loadStore().storeProducts }
export function setStoreProducts(products: StoreProduct[]) { updateSlice('storeProducts', products, 'storeProducts') }

// ─── Purchases ────────────────────────────────────────────────────────────────

export function getPurchases(): Purchase[] { return loadStore().purchases }
export function setPurchases(purchases: Purchase[]) { updateSlice('purchases', purchases, 'purchases') }

/** Sunucu alış sonrası yerel cache (finans tekrar yazılmaz; kasa sunucudan) */
export function applyRemotePurchase(
  purchase: Purchase,
  stockItem?: StockItem | null,
  kasaBalance?: number,
): void {
  const store = loadStore()
  const prev = store.purchases.find(p => p.id === purchase.id)
  store.purchases = [purchase, ...store.purchases.filter(p => p.id !== purchase.id)]
  if (stockItem) {
    const idx = store.stock.findIndex(s => s.id === stockItem.id)
    if (idx >= 0) store.stock[idx] = { ...store.stock[idx], ...stockItem }
    else store.stock.push(stockItem)
  }
  const existingTx = store.transactions.find(t =>
    t.category === 'Alış' && (
      (t as { reference_id?: string }).reference_id === purchase.id ||
      (prev != null && t.description?.includes(prev.supplier_name) && Math.abs(t.amount - prev.total_cost) < 0.01) ||
      (t.description?.includes(purchase.supplier_name) && Math.abs(t.amount - purchase.total_cost) < 0.01)
    ),
  )
  if (existingTx) {
    existingTx.amount = purchase.total_cost
    existingTx.payment_method = purchase.payment_method
    existingTx.description = `Alış — ${purchase.category} (${purchase.supplier_name})`
  } else {
    store.transactions.push({
      id: uid('ft'),
      type: 'gider',
      description: `Alış — ${purchase.category} (${purchase.supplier_name})`,
      category: 'Alış',
      amount: purchase.total_cost,
      payment_method: purchase.payment_method,
      date: purchase.created_at,
    })
  }
  if (kasaBalance != null) store.kasaBakiye = kasaBalance
  else syncKasaBakiye(store)
  saveStore(store)
  emitChange('purchases')
  emitChange('stock')
  emitChange('finance')
}

/** Alış silme sonrası sunucudan gelen stok/kasa durumunu cache'e uygula */
export function applyRemotePurchaseDelete(
  purchaseId: string,
  stockItem?: StockItem | null,
  kasaBalance?: number,
): void {
  const store = loadStore()
  store.purchases = store.purchases.filter(p => p.id !== purchaseId)
  store.transactions = store.transactions.filter(
    t => !(t.category === 'Alış' && ((t as { reference_id?: string }).reference_id === purchaseId || t.description?.includes(purchaseId))),
  )
  if (stockItem) {
    const idx = store.stock.findIndex(s => s.id === stockItem.id)
    if (idx >= 0) store.stock[idx] = { ...store.stock[idx], ...stockItem }
    else store.stock.push(stockItem)
  }
  if (kasaBalance != null) store.kasaBakiye = kasaBalance
  saveStore(store)
  emitChange('purchases')
  emitChange('stock')
  emitChange('finance')
}

/** Alış kaydı + stok güncelleme + gider işlemi */
export function recordPurchase(input: Omit<Purchase, 'id' | 'created_at' | 'total_cost'>): Purchase {
  const store = loadStore()
  const total_cost = input.quantity * input.buy_price
  const purchase: Purchase = {
    ...input,
    id: uid('pur'),
    total_cost,
    created_at: new Date().toISOString(),
  }
  store.purchases.unshift(purchase)

  const stockName = input.category === 'telefon'
    ? `${input.device_brand ?? ''} ${input.device_model ?? ''}`.trim() || 'Telefon'
    : input.category === 'yedek_parca' ? (input.device_model || input.device_brand || 'Yedek Parça')
    : input.category === 'aksesuar' ? (input.device_model || 'Aksesuar')
    : `${input.category} alış`

  if (['yedek_parca', 'aksesuar', 'telefon', 'ikinci_el'].includes(input.category)) {
    const existing = store.stock.find(s =>
      s.name.toLowerCase() === stockName.toLowerCase() ||
      (input.imei && s.barcode === input.imei)
    )
    if (existing) {
      existing.stock_qty += input.quantity
      existing.buy_price = input.buy_price
    } else {
      store.stock.push({
        id: uid('s'),
        name: stockName,
        barcode: input.imei || '',
        category: input.category === 'telefon' ? 'Telefon' : input.category === 'yedek_parca' ? 'Yedek Parça' : 'Aksesuar',
        compatible_brands: input.device_brand ? [input.device_brand] : [],
        stock_qty: input.quantity,
        min_stock: 5,
        buy_price: input.buy_price,
        sell_price: Math.round(input.buy_price * 1.25),
        supplier: input.supplier_name,
      })
    }
    emitChange('stock')
  }

  store.transactions.push({
    id: uid('ft'),
    type: 'gider',
    description: `Alış — ${stockName} (${input.supplier_name})`,
    category: 'Alış',
    amount: total_cost,
    payment_method: input.payment_method,
    date: new Date().toISOString(),
  })
  const pm = (input.payment_method || '').toLocaleLowerCase('tr-TR')
  if (pm.includes('nakit')) syncKasaBakiye(store)

  saveStore(store)
  emitChange('purchases')
  emitChange('finance')
  return purchase
}

// ─── Todos ────────────────────────────────────────────────────────────────────

export function getTodos(): TodoItem[] { return loadStore().todos }
export function setTodos(todos: TodoItem[]) { updateSlice('todos', todos, 'todos') }

// ─── Stolen IMEIs ─────────────────────────────────────────────────────────────

export function getStolenIMEIs(): StolenIMEI[] { return loadStore().stolenIMEIs }
export function setStolenIMEIs(items: StolenIMEI[]) { updateSlice('stolenIMEIs', items, 'stolenIMEIs') }

export function getForeignDevices(): ForeignDevice[] { return loadStore().foreignDevices }
export function setForeignDevices(items: ForeignDevice[]) { updateSlice('foreignDevices', items, 'foreignDevices') }

export function attachShiftReport(shiftId: string, snapshot: Record<string, unknown>): void {
  const store = loadStore()
  const idx = store.cashShifts.findIndex(s => s.id === shiftId)
  if (idx === -1) return
  store.cashShifts[idx].report_snapshot = snapshot
  saveStore(store)
  emitChange('cashShifts')
}

// ─── Customer Orders ──────────────────────────────────────────────────────────

export function getCustomerOrders(): CustomerOrder[] { return loadStore().customerOrders }
export function setCustomerOrders(orders: CustomerOrder[]) { updateSlice('customerOrders', orders, 'customerOrders') }

// ─── Assets ───────────────────────────────────────────────────────────────────

export function getAssets(): Asset[] { return loadStore().assets }
export function setAssets(assets: Asset[]) { updateSlice('assets', assets, 'assets') }

// ─── Campaigns ────────────────────────────────────────────────────────────────

export function getCampaigns(): Campaign[] { return loadStore().campaigns }
export function setCampaigns(campaigns: Campaign[]) { updateSlice('campaigns', campaigns, 'campaigns') }

// ─── Deals ────────────────────────────────────────────────────────────────────

export function getDeals(): Deal[] { return loadStore().deals }
export function setDeals(deals: Deal[]) { updateSlice('deals', deals, 'deals') }

// ─── Customers ────────────────────────────────────────────────────────────────

export function getCustomers(): StoreCustomer[] { return loadStore().customers }
export function setCustomers(customers: StoreCustomer[]) { updateSlice('customers', customers, 'customers') }

export function addCustomer(data: Omit<StoreCustomer, 'id' | 'created_at' | 'updated_at'>): StoreCustomer {
  const store = loadStore()
  const customer: StoreCustomer = {
    ...data,
    id: uid('cust'),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
  store.customers.unshift(customer)
  saveStore(store)
  emitChange('customers')
  return customer
}

export function updateCustomer(id: string, updates: Partial<StoreCustomer>): StoreCustomer | null {
  const store = loadStore()
  const idx = store.customers.findIndex(c => c.id === id)
  if (idx === -1) return null
  store.customers[idx] = { ...store.customers[idx], ...updates, updated_at: new Date().toISOString() }
  saveStore(store)
  emitChange('customers')
  return store.customers[idx]
}

export function removeCustomer(id: string): boolean {
  const store = loadStore()
  const before = store.customers.length
  store.customers = store.customers.filter(c => c.id !== id)
  if (store.customers.length === before) return false
  saveStore(store)
  emitChange('customers')
  return true
}

// ─── Appointments ─────────────────────────────────────────────────────────────

export function getAppointments(): Appointment[] { return loadStore().appointments }
export function setAppointments(items: Appointment[]) { updateSlice('appointments', items, 'appointments') }

export function addAppointment(data: Omit<Appointment, 'id' | 'created_at'>): Appointment {
  const store = loadStore()
  const item: Appointment = { ...data, id: uid('apt'), created_at: new Date().toISOString() }
  store.appointments.unshift(item)
  saveStore(store)
  emitChange('appointments')
  return item
}

// ─── Personnel ────────────────────────────────────────────────────────────────

export function getPersonnel(): PersonnelMember[] { return loadStore().personnel }
export function setPersonnel(items: PersonnelMember[]) { updateSlice('personnel', items, 'personnel') }

export function addPersonnel(data: Omit<PersonnelMember, 'id' | 'created_at'>): PersonnelMember {
  const store = loadStore()
  const item: PersonnelMember = { ...data, id: uid('staff'), created_at: new Date().toISOString() }
  store.personnel.unshift(item)
  saveStore(store)
  emitChange('personnel')
  return item
}

// ─── Warranties ─────────────────────────────────────────────────────────────

export function getWarranties(): WarrantyRecord[] { return loadStore().warranties }
export function setWarranties(items: WarrantyRecord[]) { updateSlice('warranties', items, 'warranties') }

export function addWarranty(data: Omit<WarrantyRecord, 'id' | 'created_at'>): WarrantyRecord {
  const store = loadStore()
  const item: WarrantyRecord = { ...data, id: uid('warr'), created_at: new Date().toISOString() }
  store.warranties.unshift(item)
  saveStore(store)
  emitChange('warranties')
  return item
}

// ─── Invoices ─────────────────────────────────────────────────────────────────

export function getInvoices(): InvoiceRecord[] { return loadStore().invoices }
export function setInvoices(items: InvoiceRecord[]) { updateSlice('invoices', items, 'invoices') }

export function addInvoice(data: Omit<InvoiceRecord, 'id' | 'created_at'>): InvoiceRecord {
  const store = loadStore()
  const item: InvoiceRecord = { ...data, id: uid('inv'), created_at: new Date().toISOString() }
  store.invoices.unshift(item)
  saveStore(store)
  emitChange('invoices')
  return item
}

// ─── Notification Logs ────────────────────────────────────────────────────────

export function getNotificationLogs(): NotificationLog[] { return loadStore().notificationLogs }
export function setNotificationLogs(items: NotificationLog[]) { updateSlice('notificationLogs', items, 'notifications') }

export function addNotificationLog(data: Omit<NotificationLog, 'id' | 'created_at'>): NotificationLog {
  const store = loadStore()
  const item: NotificationLog = { ...data, id: uid('notif'), created_at: new Date().toISOString() }
  store.notificationLogs.unshift(item)
  saveStore(store)
  emitChange('notifications')
  return item
}

// ─── Support Tickets ──────────────────────────────────────────────────────────

export function getSupportTickets(): SupportTicket[] { return loadStore().supportTickets }
export function setSupportTickets(items: SupportTicket[]) { updateSlice('supportTickets', items, 'support') }

export function addSupportTicket(data: Omit<SupportTicket, 'id' | 'created_at' | 'status'>): SupportTicket {
  const store = loadStore()
  const item: SupportTicket = {
    ...data,
    id: uid('ticket'),
    status: 'acik',
    created_at: new Date().toISOString(),
  }
  store.supportTickets.unshift(item)
  saveStore(store)
  emitChange('support')
  return item
}

// ─── Dashboard Özet Fonksiyonları ──────────────────────────────────────────

/** Kasa özeti — nakit / kart / diğer ayrımı (gelir işlemlerinden) */
export function getCashSummary(opts?: { from?: string; to?: string }) {
  const store = loadStore()
  const fromMs = opts?.from ? new Date(opts.from).getTime() : null
  const toMs = opts?.to ? new Date(opts.to).getTime() : null
  const inRange = (d: string) => {
    const t = new Date(d).getTime()
    if (fromMs != null && t < fromMs) return false
    if (toMs != null && t > toMs) return false
    return true
  }

  let nakit = 0, kart = 0, diger = 0
  for (const t of store.transactions) {
    if (t.type !== 'gelir') continue
    if (opts && !inRange(t.date)) continue
    const pm = (t.payment_method || '').toLocaleLowerCase('tr-TR')
    if (pm.includes('nakit')) nakit += t.amount
    else if (pm.includes('kart') || pm.includes('kredi') || pm.includes('pos')) kart += t.amount
    else diger += t.amount
  }
  // POS satışları completeSale ile zaten transactions'a eklenir — sales dizisini tekrar sayma (çift sayım)
  let nakitCikis = 0, kartCikis = 0
  for (const t of store.transactions) {
    if (t.type !== 'gider') continue
    if (opts && !inRange(t.date)) continue
    if (isCariTransaction(t)) continue
    const pm = (t.payment_method || 'nakit').toLocaleLowerCase('tr-TR')
    if (pm.includes('kart') || pm.includes('kredi')) kartCikis += t.amount
    else if (pm.includes('nakit') || !t.payment_method) nakitCikis += t.amount
    // havale/veresiye/çek → nakit çıkışa yazılmaz
  }
  const result = {
    nakit, kart, diger,
    toplam: nakit + kart + diger,
    nakitCikis, kartCikis,
    kasaBakiye: store.kasaBakiye,
  }
  _logCashSummary(opts, result)
  return result
}

function _logCashSummary(
  _opts: { from?: string; to?: string } | undefined,
  _summary: { toplam: number; kasaBakiye: number; nakitCikis: number },
) {
  /* no-op — reserved for future diagnostics */
}

/** Bugün ne yapıldı — yeni gelen / tamir edilen / teslim edilen + satış */
export function getTodayActivity() {
  const store = loadStore()
  const today = new Date().toISOString().slice(0, 10)
  const isToday = (d?: string) => (d || '').slice(0, 10) === today
  const delivered = store.serviceOrders.filter(o =>
    ['delivered', 'teslim_edildi', 'teslim'].includes(o.status) && isToday(o.updated_at)).length
  const repaired = store.serviceOrders.filter(o =>
    ['repair_complete', 'tamamlandi', 'ready_for_pickup', 'teslime_hazir'].includes(o.status) && isToday(o.updated_at)).length
  const newOrders = store.serviceOrders.filter(o => isToday(o.created_at)).length
  const salesToday = store.sales.filter(s => isToday(s.date))
  const salesTotal = salesToday.reduce((sum, x) => sum + (x.total_with_vat || x.subtotal || 0), 0)
  const salesProfit = salesToday.reduce((sum, x) => sum + (x.net_profit || 0), 0)
  const serviceProfitToday = Object.values(store.serviceDeliveries)
    .filter(d => isToday(d.delivered_at))
    .reduce((sum, d) => sum + (d.net_profit || 0), 0)
  const profitToday = salesProfit + serviceProfitToday
  return { delivered, repaired, newOrders, salesCount: salesToday.length, salesTotal, profitToday, serviceProfitToday, salesProfit }
}

/** Teknisyen bazlı iş yükü */
export function getTechnicianWorkload(): { name: string; active: number; total: number }[] {
  const store = loadStore()
  const map = new Map<string, { active: number; total: number }>()
  for (const o of store.serviceOrders) {
    const t = o.technician || 'Atanmadı'
    const cur = map.get(t) || { active: 0, total: 0 }
    cur.total++
    if (['in_repair', 'onarimda', 'assigned_technician', 'quality_check', 'parts_checking', 'parts_ordered'].includes(o.status)) cur.active++
    map.set(t, cur)
  }
  return Array.from(map.entries()).map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total)
}

/** Bu hafta en çok kullanılan/satılan parça */
export function getPartUsageThisWeek(): { name: string; qty: number }[] {
  const store = loadStore()
  const weekAgo = Date.now() - 7 * 86400000
  const counter = new Map<string, { qty: number; name: string }>()
  for (const s of store.sales) {
    if (new Date(s.date).getTime() < weekAgo) continue
    for (const it of s.items || []) {
      const c = counter.get(it.stock_id) || { qty: 0, name: it.name }
      c.qty += it.qty
      counter.set(it.stock_id, c)
    }
  }
  return Array.from(counter.values()).sort((a, b) => b.qty - a.qty).slice(0, 5)
}

/** Demo seed kayıtlarını bir kez temizle (sabit id'li örnek veriler) */
export function clearDemoSeedOnce() {
  if (typeof window === 'undefined') return
  const KEY = 'aura_demo_cleared_v1'
  if (localStorage.getItem(KEY)) return
  try {
    const store = loadStore()
    const demoIds = ['cust_1', 'cust_2', 'cust_3', 'staff_1', 'staff_2', 'staff_3', 'apt_1', 'apt_2', 'apt_3', 'warr_1', 'warr_2', 'so_1', 'so_2']
    store.customers = store.customers.filter(c => !demoIds.includes(c.id))
    store.personnel = store.personnel.filter(p => !demoIds.includes(p.id))
    store.appointments = store.appointments.filter(a => !demoIds.includes(a.id))
    store.warranties = store.warranties.filter(w => !demoIds.includes(w.id))
    store.serviceOrders = store.serviceOrders.filter(o => !demoIds.includes(o.id))
    saveStore(store)
    localStorage.setItem(KEY, '1')
  } catch { /* ignore */ }
}

// ─── Seed Demo Data (first run) ───────────────────────────────────────────────

export function seedDemoDataIfEmpty() {
  if (typeof window === 'undefined') return
  if (process.env.NEXT_PUBLIC_DEMO_MODE !== '1') return
  const store = loadStore()
  const isEmpty =
    store.customers.length === 0 &&
    store.personnel.length === 0 &&
    store.appointments.length === 0 &&
    store.warranties.length === 0 &&
    store.invoices.length === 0 &&
    store.serviceOrders.length === 0

  if (!isEmpty) return

  const now = new Date().toISOString()
  const today = now.split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]

  store.customers = [
    { id: 'cust_1', full_name: 'Ahmet Yılmaz', phone: '05321234567', email: 'ahmet@email.com', address: 'Kadıköy, İstanbul', tc_no: '12345678901', customer_type: 'bireysel', segment: 'vip', sms_allowed: true, email_allowed: true, blacklisted: false, total_spent: 12450, satisfaction_avg: 4.8, created_at: now, updated_at: now, kvkk_consent_date: now },
    { id: 'cust_2', full_name: 'Zeynep Arslan', phone: '05061357924', email: 'zeynep@firma.com', customer_type: 'bireysel', segment: 'regular', sms_allowed: true, email_allowed: false, blacklisted: false, total_spent: 3800, satisfaction_avg: 4.2, created_at: now, updated_at: now },
    { id: 'cust_3', full_name: 'Mega Teknoloji A.Ş.', phone: '05334567890', company_name: 'Mega Teknoloji A.Ş.', vkn: '1234567890', customer_type: 'kurumsal', segment: 'vip', sms_allowed: true, email_allowed: true, blacklisted: false, total_spent: 45200, satisfaction_avg: 4.5, created_at: now, updated_at: now },
  ]

  store.personnel = [
    { id: 'staff_1', full_name: 'Mert Aydın', role: 'teknisyen', position: 'Kıdemli Teknisyen', phone: '05321234567', email: 'mert@aura.com', branch_name: 'Merkez Şube', hire_date: '2023-03-15', salary: 35000, commission_rate: 5, daily_target: 8, is_active: true, completed_today: 6, completed_month: 142, avg_repair_time_hours: 2.4, return_rate: 2.1, satisfaction_avg: 4.8, created_at: now },
    { id: 'staff_2', full_name: 'Ali Kara', role: 'teknisyen', position: 'Teknisyen', phone: '05445678901', branch_name: 'Merkez Şube', hire_date: '2024-06-01', salary: 28000, commission_rate: 3, daily_target: 6, is_active: true, completed_today: 4, completed_month: 98, avg_repair_time_hours: 3.1, return_rate: 4.5, satisfaction_avg: 4.3, created_at: now },
    { id: 'staff_3', full_name: 'Ayşe Demir', role: 'muhasebe', position: 'Muhasebe Sorumlusu', phone: '05067891234', branch_name: 'Merkez Şube', hire_date: '2023-01-10', salary: 30000, commission_rate: 0, daily_target: 0, is_active: true, completed_today: 0, completed_month: 0, avg_repair_time_hours: 0, return_rate: 0, satisfaction_avg: 0, created_at: now },
  ]

  store.appointments = [
    { id: 'apt_1', customer_name: 'Ahmet Yılmaz', customer_phone: '05321234567', device_brand: 'Samsung', device_model: 'S23', fault_description: 'Ekran kırık', appointment_date: today, appointment_time: '09:00', duration_minutes: 30, technician_name: 'Mert Aydın', status: 'onaylandi', created_at: now },
    { id: 'apt_2', customer_name: 'Zeynep Arslan', customer_phone: '05061357924', device_brand: 'iPhone', device_model: '15 Pro', fault_description: 'Batarya şişmiş', appointment_date: today, appointment_time: '10:30', duration_minutes: 45, technician_name: 'Mert Aydın', status: 'bekliyor', created_at: now },
    { id: 'apt_3', customer_name: 'Elif Demir', customer_phone: '05367891234', device_brand: 'Xiaomi', device_model: '13T', fault_description: 'Şarj olmuyor', appointment_date: tomorrow, appointment_time: '14:00', duration_minutes: 30, status: 'bekliyor', created_at: now },
  ]

  store.warranties = [
    { id: 'warr_1', order_id: 'so_1', customer_id: 'cust_1', imei: '352099001761481', device_brand: 'Samsung', device_model: 'Galaxy S23', warranty_months: 6, start_date: '2026-01-15', end_date: '2026-07-15', covered_parts: ['Ekran', 'Batarya'], status: 'aktif', customer_name: 'Ahmet Yılmaz', order_no: 'SRV-2026-000142', created_at: now },
    { id: 'warr_2', order_id: 'so_2', customer_id: 'cust_2', imei: '861536030196001', device_brand: 'iPhone', device_model: '14 Pro', warranty_months: 3, start_date: '2026-03-20', end_date: '2026-06-20', covered_parts: ['Batarya'], status: 'aktif', customer_name: 'Zeynep Arslan', order_no: 'SRV-2026-000298', created_at: now },
  ]

  store.invoices = [
    { id: 'inv_1', invoice_type: 'earsiv', invoice_no: 'ARA2026000001', invoice_date: today, customer_name: 'Ahmet Yılmaz', order_no: 'SRV-2026-000142', items: [{ description: 'Ekran Değişimi', quantity: 1, unit_price: 1350, kdv_rate: 20 }], subtotal: 1850, kdv_amount: 370, total: 2220, status: 'gonderildi', created_at: now },
    { id: 'inv_2', invoice_type: 'efatura', invoice_no: 'FAT2026000042', invoice_date: today, customer_name: 'Mega Teknoloji A.Ş.', customer_vkn: '1234567890', items: [{ description: 'Kurumsal Bakım', quantity: 5, unit_price: 800, kdv_rate: 20 }], subtotal: 4000, kdv_amount: 800, total: 4800, status: 'onaylandi', created_at: now },
  ]

  store.notificationLogs = [
    { id: 'notif_1', channel: 'sms', recipient: '05321234567', content: 'SRV-2026-000142 nolu cihazınız teslim alınmıştır.', status: 'delivered', order_no: 'SRV-2026-000142', customer_name: 'Ahmet Yılmaz', created_at: now },
    { id: 'notif_2', channel: 'whatsapp', recipient: '05061357924', content: 'Teşhis tamamlandı. Tahmini ücret: 1.320 TL.', status: 'delivered', order_no: 'SRV-2026-000298', customer_name: 'Zeynep Arslan', created_at: now },
  ]

  store.serviceOrders = [
    { id: 'so_demo_1', job_no: 'SRV-2026-000142', customer_name: 'Ahmet Yılmaz', customer_phone: '05321234567', device_brand: 'Samsung', device_model: 'Galaxy S23', imei: '352099001761481', status: 'in_repair', technician: 'Mert Aydın', estimated_cost: 1850, created_at: now, updated_at: now, eta: tomorrow },
    { id: 'so_demo_2', job_no: 'SRV-2026-000298', customer_name: 'Zeynep Arslan', customer_phone: '05061357924', device_brand: 'Apple', device_model: 'iPhone 14 Pro', imei: '861536030196001', status: 'customer_approval_pending', technician: 'Ali Kara', estimated_cost: 1320, created_at: now, updated_at: now, eta: tomorrow },
  ]

  saveStore(store)
  emitChange('seed')
}

// ─── ERP v7: Job No, Onay, Kasa, Tedarik, İkinci El, Şube ───────────────────

export function generateNextJobNo(): string {
  const store = loadStore()
  const year = new Date().getFullYear()
  const prefix = `SRV-${year}-`
  const nums = store.serviceOrders
    .map(o => o.job_no)
    .filter(j => j.startsWith(prefix))
    .map(j => parseInt(j.slice(prefix.length), 10))
    .filter(n => !Number.isNaN(n))
  const next = (nums.length ? Math.max(...nums) : 0) + 1
  return `${prefix}${String(next).padStart(6, '0')}`
}

export function getServiceOrderByJobNo(jobNo: string): StoreServiceOrder | undefined {
  return loadStore().serviceOrders.find(o =>
    o.job_no.toLocaleLowerCase('tr-TR') === jobNo.toLocaleLowerCase('tr-TR'),
  )
}

export function getServiceOrderByToken(token: string): StoreServiceOrder | undefined {
  return loadStore().serviceOrders.find(o => o.approval_token === token)
}

export function processServiceApproval(token: string, approved: boolean): StoreServiceOrder | null {
  const store = loadStore()
  const idx = store.serviceOrders.findIndex(o => o.approval_token === token)
  if (idx === -1) return null
  const order = store.serviceOrders[idx]
  store.serviceOrders[idx] = {
    ...order,
    approval_status: approved ? 'approved' : 'rejected',
    status: approved ? 'in_repair' : 'cancelled',
    updated_at: new Date().toISOString(),
  }
  store.statusHistory.push({
    id: uid('sh'),
    service_order_id: order.id,
    status: approved ? 'in_repair' : 'cancelled',
    note: approved ? 'Müşteri onayladı' : 'Müşteri reddetti',
    user: 'Müşteri',
    created_at: new Date().toISOString(),
  })
  saveStore(store)
  emitChange('service')
  if (!approved) notifyServiceEvent(store.serviceOrders[idx], 'customer_rejected')
  return store.serviceOrders[idx]
}

export function canDeliverService(serviceId: string): { ok: boolean; reason?: string } {
  const store = loadStore()
  const order = store.serviceOrders.find(o => o.id === serviceId)
  if (!order) return { ok: false, reason: 'Kayıt bulunamadı' }
  if (store.notificationSettings.require_qc_on_delivery && !isQcComplete(order.final_checks)) {
    return { ok: false, reason: 'Kalite kontrol listesi tamamlanmalı' }
  }
  return { ok: true }
}

export function getNotificationSettings(): NotificationSettings {
  return { ...loadStore().notificationSettings }
}

export function setNotificationSettings(settings: Partial<NotificationSettings>): NotificationSettings {
  const store = loadStore()
  store.notificationSettings = { ...store.notificationSettings, ...settings }
  saveStore(store)
  emitChange('settings')
  return store.notificationSettings
}

export function getCashShifts(): CashShift[] { return loadStore().cashShifts }
export function getOpenCashShift(): CashShift | undefined {
  return loadStore().cashShifts.find(s => s.status === 'open')
}

/** Cache-only — API-first kasa bridge kullanır */
export function replaceCashShifts(items: CashShift[], opts?: { silent?: boolean }): void {
  const store = loadStore()
  store.cashShifts = items
  saveStore(store)
  if (!opts?.silent) emitChange('cashShifts')
}

/** @deprecated Prefer openCashShiftViaApi — local-only fallback */
export function openCashShift(openingBalance: number, openedBy: string, branchId?: string): CashShift {
  const store = loadStore()
  const open = store.cashShifts.find(s => s.status === 'open')
  if (open) return open
  const shift: CashShift = {
    id: uid('shift'),
    branch_id: branchId || store.activeBranchId || undefined,
    opened_at: new Date().toISOString(),
    opening_balance: openingBalance,
    opened_by: openedBy,
    status: 'open',
  }
  store.cashShifts.unshift(shift)
  saveStore(store)
  emitChange('cashShifts')
  return shift
}

/** @deprecated Prefer closeCashShiftViaApi — local-only fallback */
export function closeCashShift(closingBalance: number, closedBy: string, notes?: string): CashShift | null {
  const store = loadStore()
  const idx = store.cashShifts.findIndex(s => s.status === 'open')
  if (idx === -1) return null
  const shift = store.cashShifts[idx]
  const to = new Date().toISOString()
  const cash = getCashSummary({ from: shift.opened_at, to })
  const expected = shift.opening_balance + cash.nakit - cash.nakitCikis
  store.cashShifts[idx] = {
    ...shift,
    status: 'closed',
    closed_at: to,
    closing_balance: closingBalance,
    expected_cash: expected,
    difference: closingBalance - expected,
    closed_by: closedBy,
    notes,
  }
  saveStore(store)
  emitChange('cashShifts')
  return store.cashShifts[idx]
}

export function getSupplierOrders(): SupplierOrder[] { return loadStore().supplierOrders }

export function upsertSupplierOrder(item: SupplierOrder): void {
  const store = loadStore()
  const idx = store.supplierOrders.findIndex(o => o.id === item.id)
  if (idx >= 0) store.supplierOrders[idx] = item
  else store.supplierOrders.unshift(item)
  saveStore(store)
  emitChange('supplier')
}

export function addSupplierOrder(data: Omit<SupplierOrder, 'id' | 'order_no' | 'created_at' | 'status'>): SupplierOrder {
  const store = loadStore()
  const count = store.supplierOrders.length + 1
  const item: SupplierOrder = {
    ...data,
    id: uid('po'),
    order_no: `PO-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`,
    status: 'pending',
    created_at: new Date().toISOString(),
  }
  store.supplierOrders.unshift(item)
  if (data.service_order_id) {
    const oIdx = store.serviceOrders.findIndex(o => o.id === data.service_order_id)
    if (oIdx >= 0) {
      store.serviceOrders[oIdx].supplier_order_id = item.id
      store.serviceOrders[oIdx].status = 'parts_waiting'
      store.serviceOrders[oIdx].updated_at = new Date().toISOString()
    }
  }
  saveStore(store)
  emitChange('supplier')
  return item
}

export function updateSupplierOrderStatus(id: string, status: SupplierOrder['status']): SupplierOrder | null {
  const store = loadStore()
  const idx = store.supplierOrders.findIndex(o => o.id === id)
  if (idx === -1) return null
  store.supplierOrders[idx].status = status
  saveStore(store)
  emitChange('supplier')
  return store.supplierOrders[idx]
}

export function getSecondHandDevices(): SecondHandDevice[] { return loadStore().secondHandDevices }

export function replaceSecondHandDevices(items: SecondHandDevice[], opts?: { silent?: boolean }): void {
  const store = loadStore()
  store.secondHandDevices = items
  saveStore(store)
  if (!opts?.silent) emitChange('secondhand')
}

export function upsertSecondHandDevice(item: SecondHandDevice, opts?: { silent?: boolean }): void {
  const store = loadStore()
  const idx = store.secondHandDevices.findIndex(d => d.id === item.id)
  if (idx >= 0) store.secondHandDevices[idx] = { ...store.secondHandDevices[idx], ...item }
  else store.secondHandDevices.unshift(item)
  saveStore(store)
  if (!opts?.silent) emitChange('secondhand')
}

export function addSecondHandDevice(data: Omit<SecondHandDevice, 'id' | 'created_at' | 'status' | 'barcode'> & { barcode?: string }): SecondHandDevice {
  const store = loadStore()
  const item: SecondHandDevice = {
    ...data,
    cosmetic_score: data.cosmetic_score ?? 8,
    showcase: data.showcase ?? true,
    barcode: data.barcode || `VTR${Date.now().toString(36).toUpperCase().slice(-8)}`,
    id: uid('2el'),
    status: 'stokta',
    created_at: new Date().toISOString(),
  }
  store.secondHandDevices.unshift(item)
  saveStore(store)
  emitChange('secondhand')
  return item
}

export function updateSecondHandDevice(id: string, patch: Partial<SecondHandDevice>): SecondHandDevice | null {
  const store = loadStore()
  const idx = store.secondHandDevices.findIndex(d => d.id === id)
  if (idx === -1) return null
  store.secondHandDevices[idx] = { ...store.secondHandDevices[idx], ...patch }
  saveStore(store)
  emitChange('secondhand')
  return store.secondHandDevices[idx]
}

export function markSecondHandSold(id: string): SecondHandDevice | null {
  const store = loadStore()
  const idx = store.secondHandDevices.findIndex(d => d.id === id)
  if (idx === -1) return null
  store.secondHandDevices[idx].status = 'satildi'
  store.secondHandDevices[idx].sold_at = new Date().toISOString()
  saveStore(store)
  emitChange('secondhand')
  return store.secondHandDevices[idx]
}

export function getBranches(): Branch[] { return loadStore().branches }
export function getActiveBranchId(): string | null { return loadStore().activeBranchId }

export function addBranch(data: Omit<Branch, 'id' | 'created_at'>): Branch {
  const store = loadStore()
  const item: Branch = { ...data, id: uid('branch'), created_at: new Date().toISOString() }
  store.branches.push(item)
  saveStore(store)
  emitChange('branches')
  return item
}

export function setActiveBranchId(id: string | null): void {
  const store = loadStore()
  if (id && !store.branches.some(b => b.id === id)) return
  store.activeBranchId = id
  saveStore(store)
  emitChange('branches')
}

export function searchLocalServiceOrders(query: string): StoreServiceOrder[] {
  const q = query.trim()
  if (!q) return []
  return filterOrdersByTrackingQuery(loadStore().serviceOrders, q)
}

export function getLocalStatusHistory(orderId: string): StatusHistoryEntry[] {
  return loadStore().statusHistory
    .filter(h => h.service_order_id === orderId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}
