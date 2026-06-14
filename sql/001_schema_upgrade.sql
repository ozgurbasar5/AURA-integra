-- ============================================================================
-- ServisSoft ERP — Veritabanı Şeması v2.0
-- Supabase Dashboard → SQL Editor'de çalıştırın
-- ============================================================================

-- ─── ENUM TİPLERİ ──────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE customer_type AS ENUM ('bireysel', 'kurumsal', 'bayi');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE customer_segment AS ENUM ('vip', 'regular', 'oneshot');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE service_priority AS ENUM ('normal', 'acil', 'garantili');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE service_status AS ENUM (
    'teslim_alindi', 'teshis_bekleniyor', 'teshis_yapildi',
    'musteri_onay_bekleniyor', 'onaylandi', 'teknisyen_atandi',
    'parca_kontrol', 'parca_sipariste', 'parca_geldi',
    'onarimda', 'onarim_duraklatildi', 'kalite_kontrol',
    'tamamlandi', 'musteri_bilgilendirildi', 'teslime_hazir',
    'teslim_edildi', 'garanti_talebi', 'garanti_tamiri',
    'iptal', 'tamir_edilemez', 'musteri_reddetti'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE approval_status AS ENUM ('pending', 'approved', 'rejected');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('nakit', 'kredi_karti', 'havale', 'eft', 'veresiye', 'cek', 'senet');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transaction_type AS ENUM ('gelir', 'gider');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE stock_movement_type AS ENUM ('giris', 'cikis', 'transfer', 'iade', 'fire', 'sayim_fark');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE invoice_type AS ENUM ('efatura', 'earsiv', 'irsaliye');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE invoice_status AS ENUM ('taslak', 'onaylandi', 'gonderildi', 'iptal');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE warranty_status AS ENUM ('aktif', 'sona_erdi', 'kullanildi', 'reddedildi');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE appointment_status AS ENUM ('bekliyor', 'onaylandi', 'iptal', 'tamamlandi', 'gelmedi');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_channel AS ENUM ('sms', 'email', 'whatsapp', 'push');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE leave_type AS ENUM ('yillik', 'hastalik', 'mazeret', 'ucretsiz');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE leave_status AS ENUM ('bekliyor', 'onaylandi', 'reddedildi');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE cheque_status AS ENUM ('portfoyde', 'tahsile_verildi', 'tahsil_edildi', 'karsilik_yok', 'iade');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE transfer_status AS ENUM ('talep', 'onaylandi', 'reddedildi', 'transit', 'tamamlandi');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ─── CUSTOMERS TABLOSU GENİŞLETME ──────────────────────────────────────────

ALTER TABLE customers ADD COLUMN IF NOT EXISTS tc_no VARCHAR(11);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS vkn VARCHAR(10);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS customer_type customer_type DEFAULT 'bireysel';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS segment customer_segment DEFAULT 'regular';
ALTER TABLE customers ADD COLUMN IF NOT EXISTS extra_phones TEXT[];
ALTER TABLE customers ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_name VARCHAR(255);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tax_office VARCHAR(100);
ALTER TABLE customers ADD COLUMN IF NOT EXISTS kvkk_consent_date TIMESTAMPTZ;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_allowed BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_allowed BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS blacklisted BOOLEAN DEFAULT FALSE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS blacklist_reason TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS total_spent DECIMAL(12,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS satisfaction_avg DECIMAL(3,2) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE INDEX IF NOT EXISTS idx_customers_tc ON customers(tc_no) WHERE tc_no IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_segment ON customers(tenant_id, segment);


-- ─── SERVICE_ORDERS TABLOSU GENİŞLETME ─────────────────────────────────────

ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS priority service_priority DEFAULT 'normal';
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS customer_statement TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS internal_notes TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS accessories JSONB DEFAULT '[]';
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS damage_photos TEXT[];
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS damage_sketch_data JSONB;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS approval_token UUID DEFAULT gen_random_uuid();
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS approval_status approval_status DEFAULT 'pending';
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS approval_signature_url TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS labor_cost DECIMAL(10,2) DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS kdv_rate INTEGER DEFAULT 20;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS kdv_amount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS total_with_kdv DECIMAL(10,2) DEFAULT 0;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS warranty_id UUID;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS qr_code_url TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_status ON service_orders(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_customer ON service_orders(customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_technician ON service_orders(technician_id);
CREATE INDEX IF NOT EXISTS idx_orders_imei ON service_orders(imei) WHERE imei IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_approval ON service_orders(approval_token);
CREATE INDEX IF NOT EXISTS idx_orders_created ON service_orders(tenant_id, created_at DESC);


-- ─── USER_PROFILES TABLOSU GENİŞLETME ──────────────────────────────────────

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS tc_no VARCHAR(11);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS position VARCHAR(100);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS salary DECIMAL(10,2);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS branch_id UUID;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS commission_rate DECIMAL(5,2) DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS ip_whitelist TEXT[];
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS two_fa_enabled BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS two_fa_secret VARCHAR(64);
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS daily_target INTEGER DEFAULT 0;


-- ─── PARTS TABLOSU GENİŞLETME ──────────────────────────────────────────────

ALTER TABLE parts ADD COLUMN IF NOT EXISTS compatible_models TEXT[];
ALTER TABLE parts ADD COLUMN IF NOT EXISTS serial_tracking BOOLEAN DEFAULT FALSE;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS kdv_rate INTEGER DEFAULT 20;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS warehouse_id UUID;
ALTER TABLE parts ADD COLUMN IF NOT EXISTS location_code VARCHAR(50);


-- ─── BRANCHES TABLOSU GENİŞLETME ───────────────────────────────────────────

ALTER TABLE branches ADD COLUMN IF NOT EXISTS manager_id UUID;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS target_revenue DECIMAL(12,2) DEFAULT 0;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS target_orders INTEGER DEFAULT 0;
ALTER TABLE branches ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS tax_number VARCHAR(11);
ALTER TABLE branches ADD COLUMN IF NOT EXISTS tax_office VARCHAR(100);


-- ─── SUPPLIERS TABLOSU GENİŞLETME ──────────────────────────────────────────

ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS vkn VARCHAR(10);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS tax_office VARCHAR(100);
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS payment_term_days INTEGER DEFAULT 30;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS balance DECIMAL(12,2) DEFAULT 0;
ALTER TABLE suppliers ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;


-- ═══════════════════════════════════════════════════════════════════════════
-- YENİ TABLOLAR
-- ═══════════════════════════════════════════════════════════════════════════


-- ─── DEPOLAR ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES branches(id),
  name VARCHAR(100) NOT NULL,
  address TEXT,
  is_default BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_warehouses_tenant ON warehouses(tenant_id);


-- ─── DEPO TRANSFERLERİ ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS warehouse_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  from_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  to_warehouse_id UUID NOT NULL REFERENCES warehouses(id),
  status transfer_status DEFAULT 'talep',
  requested_by UUID REFERENCES user_profiles(id),
  approved_by UUID REFERENCES user_profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS warehouse_transfer_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transfer_id UUID NOT NULL REFERENCES warehouse_transfers(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ─── ALIM FATURALARI ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS purchase_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  invoice_no VARCHAR(50) NOT NULL,
  invoice_date DATE NOT NULL,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  kdv_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_method payment_method,
  paid BOOLEAN DEFAULT FALSE,
  due_date DATE,
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS purchase_invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES purchase_invoices(id) ON DELETE CASCADE,
  part_id UUID REFERENCES parts(id),
  description VARCHAR(255),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost DECIMAL(10,2) NOT NULL,
  kdv_rate INTEGER DEFAULT 20,
  total DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ─── STOK SAYIMI ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS stock_counts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  warehouse_id UUID REFERENCES warehouses(id),
  count_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) DEFAULT 'devam_ediyor', -- devam_ediyor, tamamlandi
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS stock_count_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  count_id UUID NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE,
  part_id UUID NOT NULL REFERENCES parts(id),
  system_qty INTEGER NOT NULL DEFAULT 0,
  counted_qty INTEGER NOT NULL DEFAULT 0,
  difference INTEGER GENERATED ALWAYS AS (counted_qty - system_qty) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ─── CARİ HESAPLAR ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customer_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  order_id UUID REFERENCES service_orders(id),
  type transaction_type NOT NULL, -- gelir = müşteri ödedi, gider = müşteriye borç
  amount DECIMAL(12,2) NOT NULL,
  payment_method payment_method,
  description TEXT,
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cust_bal ON customer_balances(tenant_id, customer_id);

CREATE TABLE IF NOT EXISTS supplier_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  supplier_id UUID NOT NULL REFERENCES suppliers(id) ON DELETE CASCADE,
  invoice_id UUID REFERENCES purchase_invoices(id),
  type transaction_type NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  payment_method payment_method,
  description TEXT,
  transaction_date TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_sup_bal ON supplier_balances(tenant_id, supplier_id);


-- ─── ÇEK / SENET ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cheques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  type VARCHAR(10) NOT NULL CHECK (type IN ('cek', 'senet')),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('alacak', 'borc')),
  drawer_name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(100),
  cheque_no VARCHAR(50),
  amount DECIMAL(12,2) NOT NULL,
  issue_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status cheque_status DEFAULT 'portfoyde',
  customer_id UUID REFERENCES customers(id),
  supplier_id UUID REFERENCES suppliers(id),
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_cheques_tenant ON cheques(tenant_id, due_date);


-- ─── KASA GİRİŞ/ÇIKIŞ ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cash_register_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id UUID NOT NULL REFERENCES accounts(id),
  type VARCHAR(10) NOT NULL CHECK (type IN ('koyma', 'cekme')),
  amount DECIMAL(12,2) NOT NULL,
  description TEXT NOT NULL,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ─── E-FATURA / E-ARŞİV ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_type invoice_type NOT NULL DEFAULT 'earsiv',
  invoice_no VARCHAR(50),
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_id UUID REFERENCES customers(id),
  order_id UUID REFERENCES service_orders(id),
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  discount DECIMAL(10,2) DEFAULT 0,
  kdv_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(12,2) NOT NULL DEFAULT 0,
  status invoice_status DEFAULT 'taslak',
  xml_content TEXT,
  pdf_url TEXT,
  sent_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_type VARCHAR(10) NOT NULL CHECK (item_type IN ('hizmet', 'parca', 'urun')),
  description VARCHAR(500) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  kdv_rate INTEGER DEFAULT 20,
  kdv_amount DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  part_id UUID REFERENCES parts(id),
  product_id UUID REFERENCES products(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant ON invoices(tenant_id, invoice_date DESC);


-- ─── GARANTİ ────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS warranties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES service_orders(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  imei VARCHAR(20),
  device_brand VARCHAR(100),
  device_model VARCHAR(100),
  warranty_months INTEGER NOT NULL DEFAULT 3,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL,
  covered_parts TEXT[],
  terms TEXT,
  status warranty_status DEFAULT 'aktif',
  pdf_url TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_warranties_imei ON warranties(imei) WHERE imei IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_warranties_tenant ON warranties(tenant_id, end_date);

CREATE TABLE IF NOT EXISTS warranty_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  warranty_id UUID NOT NULL REFERENCES warranties(id) ON DELETE CASCADE,
  order_id UUID REFERENCES service_orders(id),
  claim_reason TEXT NOT NULL,
  damage_photos TEXT[],
  approved BOOLEAN,
  rejection_reason TEXT,
  reviewed_by UUID REFERENCES user_profiles(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ─── RANDEVULAR ─────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID REFERENCES customers(id),
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(20) NOT NULL,
  device_brand VARCHAR(100),
  device_model VARCHAR(100),
  fault_description TEXT,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  duration_minutes INTEGER DEFAULT 30,
  technician_id UUID REFERENCES user_profiles(id),
  status appointment_status DEFAULT 'bekliyor',
  converted_order_id UUID REFERENCES service_orders(id),
  reminder_sent BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_appointments ON appointments(tenant_id, appointment_date);


-- ─── SMS ŞABLONLARI ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS sms_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  trigger_event VARCHAR(50), -- order_created, diagnosis_done, repair_done, etc.
  template_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ─── SMS / BİLDİRİM LOG ────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL,
  recipient VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  content TEXT NOT NULL,
  status notification_status DEFAULT 'pending',
  external_id VARCHAR(100),
  error_message TEXT,
  order_id UUID REFERENCES service_orders(id),
  customer_id UUID REFERENCES customers(id),
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications ON notification_logs(tenant_id, created_at DESC);


-- ─── DENETİM KAYDI (AUDIT LOG) ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  user_id UUID REFERENCES user_profiles(id),
  action VARCHAR(50) NOT NULL, -- create, update, delete, login, logout, export
  entity_type VARCHAR(50) NOT NULL, -- service_order, customer, part, etc.
  entity_id UUID,
  old_data JSONB,
  new_data JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);


-- ─── YETKİ MATRİSİ ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module VARCHAR(50) NOT NULL, -- service_orders, customers, parts, finance, etc.
  action VARCHAR(20) NOT NULL, -- read, create, update, delete, export, report
  description VARCHAR(255),
  UNIQUE(module, action)
);

CREATE TABLE IF NOT EXISTS role_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL,
  permission_id UUID NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  granted BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, role, permission_id)
);


-- ─── PDKS (Personel Devam Kontrol) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS pdks_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  check_in TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  check_out TIMESTAMPTZ,
  check_in_lat DECIMAL(10,7),
  check_in_lng DECIMAL(10,7),
  check_out_lat DECIMAL(10,7),
  check_out_lng DECIMAL(10,7),
  work_minutes INTEGER GENERATED ALWAYS AS (
    CASE WHEN check_out IS NOT NULL
      THEN EXTRACT(EPOCH FROM (check_out - check_in))::INTEGER / 60
      ELSE NULL
    END
  ) STORED,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pdks ON pdks_records(tenant_id, user_id, check_in);


-- ─── İZİN TALEPLERİ ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  leave_type leave_type NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  days INTEGER NOT NULL DEFAULT 1,
  reason TEXT,
  status leave_status DEFAULT 'bekliyor',
  approved_by UUID REFERENCES user_profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ─── AI KONUŞMALARI ─────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  context VARCHAR(50) DEFAULT 'general', -- general, diagnosis, pricing, stock, customer
  messages JSONB NOT NULL DEFAULT '[]',
  order_id UUID REFERENCES service_orders(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ─── RAPOR ŞABLONLARI ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  report_type VARCHAR(50) NOT NULL, -- revenue, stock, technician, customer, fault
  config JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES report_templates(id) ON DELETE CASCADE,
  schedule_cron VARCHAR(50) NOT NULL DEFAULT '0 8 * * 1', -- Pazartesi 08:00
  recipients TEXT[] NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ─── MEMNUNİYET ANKETLERİ ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS satisfaction_surveys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id UUID NOT NULL REFERENCES service_orders(id),
  customer_id UUID NOT NULL REFERENCES customers(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  survey_token UUID DEFAULT gen_random_uuid(),
  submitted_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_surveys ON satisfaction_surveys(tenant_id, submitted_at DESC);


-- ═══════════════════════════════════════════════════════════════════════════
-- VARSAYILAN VERİ
-- ═══════════════════════════════════════════════════════════════════════════

-- Yetki tanımları
INSERT INTO permissions (module, action, description) VALUES
  ('service_orders', 'read', 'Servis kayıtlarını görüntüleme'),
  ('service_orders', 'create', 'Yeni servis kaydı oluşturma'),
  ('service_orders', 'update', 'Servis kaydı güncelleme'),
  ('service_orders', 'delete', 'Servis kaydı silme'),
  ('service_orders', 'export', 'Servis verisi dışa aktarma'),
  ('customers', 'read', 'Müşteri listesi görüntüleme'),
  ('customers', 'create', 'Yeni müşteri ekleme'),
  ('customers', 'update', 'Müşteri bilgisi güncelleme'),
  ('customers', 'delete', 'Müşteri silme'),
  ('parts', 'read', 'Stok görüntüleme'),
  ('parts', 'create', 'Stok girişi'),
  ('parts', 'update', 'Stok güncelleme'),
  ('parts', 'delete', 'Stok silme'),
  ('finance', 'read', 'Finansal verileri görüntüleme'),
  ('finance', 'create', 'Gelir/gider kaydı ekleme'),
  ('finance', 'report', 'Finansal rapor oluşturma'),
  ('invoices', 'read', 'Fatura görüntüleme'),
  ('invoices', 'create', 'Fatura oluşturma'),
  ('invoices', 'cancel', 'Fatura iptal'),
  ('personnel', 'read', 'Personel listesi'),
  ('personnel', 'manage', 'Personel yönetimi'),
  ('reports', 'read', 'Rapor görüntüleme'),
  ('reports', 'create', 'Rapor oluşturma'),
  ('settings', 'manage', 'Sistem ayarları'),
  ('ai', 'use', 'AI asistan kullanımı')
ON CONFLICT (module, action) DO NOTHING;


-- ═══════════════════════════════════════════════════════════════════════════
-- RLS POLİTİKALARI
-- ═══════════════════════════════════════════════════════════════════════════

-- Yardımcı fonksiyon: mevcut kullanıcının tenant_id'sini al
CREATE OR REPLACE FUNCTION get_user_tenant_id()
RETURNS UUID AS $$
  SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Yeni tablolar için RLS aktifleştir ve politika ekle
-- ÖNEMLİ: Sadece tenant_id sütunu OLAN tablolar bu döngüde
DO $$ 
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'warehouses', 'warehouse_transfers',
    'purchase_invoices',
    'stock_counts',
    'customer_balances', 'supplier_balances',
    'cheques', 'cash_register_logs',
    'invoices',
    'warranties',
    'appointments', 'sms_templates', 'notification_logs',
    'audit_logs', 'role_permissions',
    'pdks_records', 'leave_requests',
    'ai_conversations', 'report_templates', 'scheduled_reports',
    'satisfaction_surveys'
  ])
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    
    -- Tenant izolasyonu: her tenant sadece kendi verisini görür
    BEGIN
      EXECUTE format(
        'CREATE POLICY tenant_isolation_%I ON %I FOR ALL USING (tenant_id = get_user_tenant_id())',
        tbl, tbl
      );
    EXCEPTION WHEN duplicate_object THEN NULL;
    END;
  END LOOP;
END $$;

-- Permissions tablosu herkes okuyabilir (referans veri)
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY permissions_read ON permissions FOR SELECT USING (true);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─── Child tablolar: tenant_id yok, parent üzerinden RLS ───────────────────

-- warehouse_transfer_items → parent: warehouse_transfers
ALTER TABLE warehouse_transfer_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY tenant_isolation_warehouse_transfer_items ON warehouse_transfer_items
    FOR ALL USING (
      EXISTS (SELECT 1 FROM warehouse_transfers wt WHERE wt.id = transfer_id AND wt.tenant_id = get_user_tenant_id())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- purchase_invoice_items → parent: purchase_invoices
ALTER TABLE purchase_invoice_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY tenant_isolation_purchase_invoice_items ON purchase_invoice_items
    FOR ALL USING (
      EXISTS (SELECT 1 FROM purchase_invoices pi WHERE pi.id = invoice_id AND pi.tenant_id = get_user_tenant_id())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- stock_count_items → parent: stock_counts
ALTER TABLE stock_count_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY tenant_isolation_stock_count_items ON stock_count_items
    FOR ALL USING (
      EXISTS (SELECT 1 FROM stock_counts sc WHERE sc.id = count_id AND sc.tenant_id = get_user_tenant_id())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- invoice_items → parent: invoices
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY tenant_isolation_invoice_items ON invoice_items
    FOR ALL USING (
      EXISTS (SELECT 1 FROM invoices inv WHERE inv.id = invoice_id AND inv.tenant_id = get_user_tenant_id())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- warranty_claims → parent: warranties
ALTER TABLE warranty_claims ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  CREATE POLICY tenant_isolation_warranty_claims ON warranty_claims
    FOR ALL USING (
      EXISTS (SELECT 1 FROM warranties w WHERE w.id = warranty_id AND w.tenant_id = get_user_tenant_id())
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;


-- ═══════════════════════════════════════════════════════════════════════════
-- YARDIMCI FONKSİYONLAR
-- ═══════════════════════════════════════════════════════════════════════════

-- Servis numarası üretici (güncellendi: SRV-2026-001234 formatı)
CREATE OR REPLACE FUNCTION generate_service_no(p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  current_year TEXT;
  seq_num INTEGER;
  result TEXT;
BEGIN
  current_year := TO_CHAR(NOW(), 'YYYY');
  
  SELECT COALESCE(MAX(
    CAST(NULLIF(SPLIT_PART(order_no, '-', 3), '') AS INTEGER)
  ), 0) + 1
  INTO seq_num
  FROM service_orders
  WHERE tenant_id = p_tenant_id
    AND order_no LIKE 'SRV-' || current_year || '-%';
  
  result := 'SRV-' || current_year || '-' || LPAD(seq_num::TEXT, 6, '0');
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- KDV hesaplama
CREATE OR REPLACE FUNCTION calculate_kdv(amount DECIMAL, rate INTEGER DEFAULT 20)
RETURNS TABLE(subtotal DECIMAL, kdv DECIMAL, total DECIMAL) AS $$
BEGIN
  subtotal := amount;
  kdv := ROUND(amount * rate / 100, 2);
  total := amount + kdv;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- TC Kimlik No validasyonu
CREATE OR REPLACE FUNCTION validate_tc_no(tc VARCHAR)
RETURNS BOOLEAN AS $$
DECLARE
  digits INTEGER[];
  i INTEGER;
  odd_sum INTEGER := 0;
  even_sum INTEGER := 0;
  d10 INTEGER;
  d11 INTEGER;
BEGIN
  IF tc IS NULL OR LENGTH(tc) != 11 THEN RETURN FALSE; END IF;
  IF LEFT(tc, 1) = '0' THEN RETURN FALSE; END IF;
  
  FOR i IN 1..11 LOOP
    digits[i] := CAST(SUBSTRING(tc FROM i FOR 1) AS INTEGER);
  END LOOP;
  
  FOR i IN 1..9 BY 2 LOOP odd_sum := odd_sum + digits[i]; END LOOP;
  FOR i IN 2..8 BY 2 LOOP even_sum := even_sum + digits[i]; END LOOP;
  
  d10 := ((odd_sum * 7) - even_sum) % 10;
  IF d10 < 0 THEN d10 := d10 + 10; END IF;
  IF d10 != digits[10] THEN RETURN FALSE; END IF;
  
  d11 := 0;
  FOR i IN 1..10 LOOP d11 := d11 + digits[i]; END LOOP;
  d11 := d11 % 10;
  IF d11 != digits[11] THEN RETURN FALSE; END IF;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ═══════════════════════════════════════════════════════════════════════════
-- TAMAMLANDI
-- ═══════════════════════════════════════════════════════════════════════════
-- Bu SQL dosyasını Supabase Dashboard → SQL Editor'de çalıştırın.
-- Tüm tablolar, indeksler, RLS politikaları ve fonksiyonlar oluşturulacak.
