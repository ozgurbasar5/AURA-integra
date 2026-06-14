export type UserRole = 'super_admin' | 'tenant_admin' | 'teknisyen' | 'muhasebe' | 'satis'

export type TenantStatus = 'active' | 'passive' | 'suspended' | 'trial'

export type ServiceOrderStatus =
  | 'alindi'
  | 'teshis'
  | 'onay_bekleniyor'
  | 'tamir'
  | 'kalite_kontrol'
  | 'teslim'
  | 'iptal'

export type PaymentMethod = 'nakit' | 'kredi_karti' | 'havale' | 'veresiye'

export type TransactionType = 'gelir' | 'gider'

export type StockMovementType = 'giris' | 'cikis' | 'iade' | 'fire'

// ─── Subscription Plans ───────────────────────────────────────────────────────

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  max_users: number
  max_branches: number
  features: string[]
  is_active: boolean
  created_at: string
}

// ─── Tenants (Bayiler) ────────────────────────────────────────────────────────

export interface Tenant {
  id: string
  company_name: string
  contact_name: string
  email: string
  phone: string
  city: string
  address?: string
  tax_number?: string
  plan_id: string
  status: TenantStatus
  subscription_start: string
  subscription_end: string
  portal_slug?: string
  shop_name?: string
  shop_phone?: string
  shop_address?: string
  shop_logo?: string
  created_at: string
  updated_at: string
  // Joined
  subscription_plans?: SubscriptionPlan
}

// ─── Tenant Payments ──────────────────────────────────────────────────────────

export type PaymentStatus = 'paid' | 'pending' | 'overdue' | 'cancelled'

export interface TenantPayment {
  id: string
  tenant_id: string
  plan_id: string
  amount: number
  due_date: string
  paid_at?: string
  status: PaymentStatus
  notes?: string
  created_at: string
  // Joined
  tenants?: Pick<Tenant, 'id' | 'company_name' | 'email'>
  subscription_plans?: Pick<SubscriptionPlan, 'id' | 'name' | 'price'>
}

// ─── User Profiles ────────────────────────────────────────────────────────────

export interface UserProfile {
  id: string
  tenant_id: string | null
  full_name: string
  role: UserRole
  avatar_url?: string
  phone?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined
  tenants?: Pick<Tenant, 'id' | 'company_name'>
}

// ─── Branches ─────────────────────────────────────────────────────────────────

export interface Branch {
  id: string
  tenant_id: string
  name: string
  address?: string
  city: string
  phone?: string
  is_active: boolean
  created_at: string
}

// ─── Customers ────────────────────────────────────────────────────────────────

export interface Customer {
  id: string
  tenant_id: string
  full_name: string
  phone: string
  email?: string
  address?: string
  created_at: string
  updated_at: string
}

// ─── Service Orders ───────────────────────────────────────────────────────────

export interface ServiceOrder {
  id: string
  tenant_id: string
  order_no: string
  customer_id: string
  branch_id?: string
  device_brand: string
  device_model: string
  device_color?: string
  imei?: string
  serial_no?: string
  lock_code?: string
  fault_description: string
  technician_notes?: string
  status: ServiceOrderStatus
  technician_id?: string
  estimated_cost?: number
  actual_cost?: number
  payment_method?: PaymentMethod
  received_at: string
  estimated_delivery?: string
  closed_at?: string
  created_at: string
  updated_at: string
  // Joined
  customers?: Customer
  technician?: Pick<UserProfile, 'id' | 'full_name'>
}

// ─── Service Status History ───────────────────────────────────────────────────

export interface ServiceStatusHistory {
  id: string
  order_id: string
  status: ServiceOrderStatus
  note?: string
  created_by: string
  created_at: string
  // Joined
  user_profiles?: Pick<UserProfile, 'id' | 'full_name'>
}

// ─── Service Parts Used ───────────────────────────────────────────────────────

export interface ServicePartsUsed {
  id: string
  order_id: string
  part_id: string
  quantity: number
  unit_price: number
  created_at: string
  // Joined
  parts?: Pick<Part, 'id' | 'name' | 'barcode'>
}

// ─── Products ─────────────────────────────────────────────────────────────────

export interface Product {
  id: string
  tenant_id: string
  name: string
  category: string
  brand?: string
  model?: string
  barcode?: string
  sale_price: number
  purchase_price?: number
  stock_qty: number
  min_stock_qty: number
  is_active: boolean
  created_at: string
}

// ─── Parts (Yedek Parça) ──────────────────────────────────────────────────────

export interface Part {
  id: string
  tenant_id: string
  name: string
  category: string
  compatible_brands?: string[]
  barcode?: string
  stock_qty: number
  min_stock_qty: number
  purchase_price: number
  sale_price: number
  supplier_id?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Stock Movements ──────────────────────────────────────────────────────────

export interface StockMovement {
  id: string
  tenant_id: string
  part_id?: string
  product_id?: string
  movement_type: StockMovementType
  quantity: number
  notes?: string
  reference_id?: string
  created_by: string
  created_at: string
}

// ─── Suppliers ────────────────────────────────────────────────────────────────

export interface Supplier {
  id: string
  tenant_id: string
  name: string
  contact_name?: string
  phone?: string
  email?: string
  address?: string
  created_at: string
}

// ─── Financial Transactions ───────────────────────────────────────────────────

export interface FinancialTransaction {
  id: string
  tenant_id: string
  account_id: string
  type: TransactionType
  amount: number
  payment_method: PaymentMethod
  category?: string
  description?: string
  reference_id?: string
  transaction_date: string
  created_by: string
  created_at: string
}

// ─── Accounts (Kasa / Banka) ──────────────────────────────────────────────────

export interface Account {
  id: string
  tenant_id: string
  name: string
  type: 'kasa' | 'banka' | 'pos'
  balance: number
  currency: string
  is_active: boolean
  created_at: string
}

// ─── Sales ────────────────────────────────────────────────────────────────────

export interface Sale {
  id: string
  tenant_id: string
  customer_id?: string
  items: SaleItem[]
  subtotal: number
  discount?: number
  total: number
  payment_method: PaymentMethod
  status: 'tamamlandi' | 'iptal' | 'iade'
  sold_by: string
  created_at: string
}

export interface SaleItem {
  product_id: string
  quantity: number
  unit_price: number
  total: number
}

// ─── Second Hand Purchases ────────────────────────────────────────────────────

export interface SecondHandPurchase {
  id: string
  tenant_id: string
  seller_name: string
  seller_phone: string
  seller_tc?: string
  device_brand: string
  device_model: string
  imei?: string
  condition_notes?: string
  purchase_price: number
  sale_price?: number
  status: 'beklemede' | 'satilik' | 'satildi'
  created_at: string
}

// ─── Dashboard Stats (API response) ──────────────────────────────────────────

export interface DashboardStats {
  monthly_revenue: number
  net_profit: number
  pending_receivables: number
  today_deliveries: number
  workshop_counts: {
    alindi: number
    teshis: number
    tamir: number
    hazir: number
    teslim: number
  }
  revenue_trend: Array<{ date: string; amount: number }>
  brand_distribution: Array<{ brand: string; count: number }>
}

// ─── Admin Dashboard Stats ────────────────────────────────────────────────────

export interface AdminDashboardStats {
  total_active_tenants: number
  monthly_expected_revenue: number
  overdue_payments: number
  new_tenants_this_month: number
  revenue_trend: Array<{ date: string; amount: number }>
  plan_distribution: Array<{ plan: string; count: number }>
}

// ─── Database type for Supabase generic ──────────────────────────────────────

export type Database = {
  public: {
    Tables: {
      subscription_plans: {
        Row: SubscriptionPlan
        Insert: Omit<SubscriptionPlan, 'id' | 'created_at'>
        Update: Partial<Omit<SubscriptionPlan, 'id' | 'created_at'>>
      }
      tenants: {
        Row: Tenant
        Insert: Omit<Tenant, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Tenant, 'id' | 'created_at'>>
      }
      tenant_payments: {
        Row: TenantPayment
        Insert: Omit<TenantPayment, 'id' | 'created_at'>
        Update: Partial<Omit<TenantPayment, 'id' | 'created_at'>>
      }
      user_profiles: {
        Row: UserProfile
        Insert: Omit<UserProfile, 'created_at' | 'updated_at'>
        Update: Partial<Omit<UserProfile, 'id'>>
      }
      branches: {
        Row: Branch
        Insert: Omit<Branch, 'id' | 'created_at'>
        Update: Partial<Omit<Branch, 'id' | 'created_at'>>
      }
      customers: {
        Row: Customer
        Insert: Omit<Customer, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Customer, 'id' | 'created_at'>>
      }
      service_orders: {
        Row: ServiceOrder
        Insert: Omit<ServiceOrder, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<ServiceOrder, 'id' | 'created_at'>>
      }
      service_status_history: {
        Row: ServiceStatusHistory
        Insert: Omit<ServiceStatusHistory, 'id' | 'created_at'>
        Update: never
      }
      service_parts_used: {
        Row: ServicePartsUsed
        Insert: Omit<ServicePartsUsed, 'id' | 'created_at'>
        Update: Partial<Omit<ServicePartsUsed, 'id' | 'created_at'>>
      }
      products: {
        Row: Product
        Insert: Omit<Product, 'id' | 'created_at'>
        Update: Partial<Omit<Product, 'id' | 'created_at'>>
      }
      parts: {
        Row: Part
        Insert: Omit<Part, 'id' | 'created_at' | 'updated_at'>
        Update: Partial<Omit<Part, 'id' | 'created_at'>>
      }
      stock_movements: {
        Row: StockMovement
        Insert: Omit<StockMovement, 'id' | 'created_at'>
        Update: never
      }
      financial_transactions: {
        Row: FinancialTransaction
        Insert: Omit<FinancialTransaction, 'id' | 'created_at'>
        Update: Partial<Omit<FinancialTransaction, 'id' | 'created_at'>>
      }
      accounts: {
        Row: Account
        Insert: Omit<Account, 'id' | 'created_at'>
        Update: Partial<Omit<Account, 'id' | 'created_at'>>
      }
      sales: {
        Row: Sale
        Insert: Omit<Sale, 'id' | 'created_at'>
        Update: Partial<Omit<Sale, 'id' | 'created_at'>>
      }
      second_hand_purchases: {
        Row: SecondHandPurchase
        Insert: Omit<SecondHandPurchase, 'id' | 'created_at'>
        Update: Partial<Omit<SecondHandPurchase, 'id' | 'created_at'>>
      }
      suppliers: {
        Row: Supplier
        Insert: Omit<Supplier, 'id' | 'created_at'>
        Update: Partial<Omit<Supplier, 'id' | 'created_at'>>
      }
    }
    Views: Record<string, never>
    Functions: {
      get_current_tenant_id: {
        Args: Record<string, never>
        Returns: string
      }
      is_super_admin: {
        Args: Record<string, never>
        Returns: boolean
      }
      generate_order_no: {
        Args: { p_tenant_id: string }
        Returns: string
      }
    }
    Enums: Record<string, never>
  }
}
