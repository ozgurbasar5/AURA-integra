-- ============================================================================
-- AURA İntegra ERP — Supabase SQL Migration (Tam Kurulum)
-- ============================================================================
-- Bu SQL'i Supabase Dashboard > SQL Editor'de çalıştırın.
-- Mevcut tablolar + VantaPhone yeni modülleri dahil.
-- ============================================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- BÖLÜM 1: MEVCUT TABLOLAR
-- ============================================================================

-- ─── 1. Abonelik Planları ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscription_plans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  price       NUMERIC(10,2) NOT NULL DEFAULT 0,
  max_users   INT NOT NULL DEFAULT 4,
  max_branches INT NOT NULL DEFAULT 2,
  features    TEXT[] DEFAULT '{}',
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 2. Bayiler (Tenants) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenants (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name       TEXT NOT NULL,
  contact_name       TEXT NOT NULL,
  email              TEXT NOT NULL UNIQUE,
  phone              TEXT,
  city               TEXT,
  address            TEXT,
  tax_number         TEXT,
  plan_id            UUID REFERENCES subscription_plans(id),
  status             TEXT DEFAULT 'trial' CHECK (status IN ('active','passive','suspended','trial')),
  subscription_start TIMESTAMPTZ DEFAULT NOW(),
  subscription_end   TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days'),
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 3. Bayi Ödemeleri ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_payments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  plan_id    UUID REFERENCES subscription_plans(id),
  amount     NUMERIC(10,2) NOT NULL,
  due_date   DATE NOT NULL,
  paid_at    TIMESTAMPTZ,
  status     TEXT DEFAULT 'pending' CHECK (status IN ('paid','pending','overdue','cancelled')),
  notes      TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 4. Kullanıcı Profilleri ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_profiles (
  id         UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  UUID REFERENCES tenants(id) ON DELETE SET NULL,
  full_name  TEXT NOT NULL,
  role       TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('super_admin','tenant_admin','mudur','teknisyen','muhasebe','satis','kasiyer','viewer')),
  avatar_url TEXT,
  phone      TEXT,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 5. Şubeler ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS branches (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  address    TEXT,
  city       TEXT,
  phone      TEXT,
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 6. Müşteriler ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name      TEXT NOT NULL,
  phone          TEXT NOT NULL,
  email          TEXT,
  address        TEXT,
  customer_type  TEXT DEFAULT 'bireysel' CHECK (customer_type IN ('bireysel','kurumsal','bayi')),
  segment        TEXT DEFAULT 'normal' CHECK (segment IN ('vip','normal','oneshot')),
  tc_no          TEXT,
  vkn            TEXT,
  notes          TEXT,
  is_blacklisted BOOLEAN DEFAULT FALSE,
  total_spent    NUMERIC(12,2) DEFAULT 0,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 7. Servis Emirleri ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_orders (
  id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id          UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id          UUID REFERENCES branches(id),
  order_no           TEXT NOT NULL,
  customer_id        UUID REFERENCES customers(id),
  customer_name      TEXT,
  customer_phone     TEXT,
  device_brand       TEXT NOT NULL,
  device_model       TEXT NOT NULL,
  device_color       TEXT,
  imei               TEXT,
  serial_no          TEXT,
  lock_code          TEXT,
  accessories        TEXT[],
  damage_notes       TEXT[],
  fault_description  TEXT NOT NULL,
  technician_notes   TEXT,
  status             TEXT DEFAULT 'alindi',
  technician_id      UUID REFERENCES user_profiles(id),
  estimated_cost     NUMERIC(10,2),
  actual_cost        NUMERIC(10,2),
  payment_method     TEXT,
  priority           TEXT DEFAULT 'normal' CHECK (priority IN ('normal','acil','garantili')),
  received_at        TIMESTAMPTZ DEFAULT NOW(),
  estimated_delivery TIMESTAMPTZ,
  closed_at          TIMESTAMPTZ,
  created_at         TIMESTAMPTZ DEFAULT NOW(),
  updated_at         TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 8. Servis Durum Geçmişi ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_status_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  status     TEXT NOT NULL,
  note       TEXT,
  created_by UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 9. Yedek Parçalar ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS parts (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  category          TEXT,
  compatible_brands TEXT[],
  barcode           TEXT,
  stock_qty         INT DEFAULT 0,
  min_stock_qty     INT DEFAULT 5,
  purchase_price    NUMERIC(10,2) DEFAULT 0,
  sale_price        NUMERIC(10,2) DEFAULT 0,
  supplier_id       UUID,
  is_active         BOOLEAN DEFAULT TRUE,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 10. Serviste Kullanılan Parçalar ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_parts_used (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id   UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  part_id    UUID REFERENCES parts(id),
  quantity   INT NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 11. Ürünler (Satılık) ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  category       TEXT,
  brand          TEXT,
  model          TEXT,
  barcode        TEXT,
  sale_price     NUMERIC(10,2) DEFAULT 0,
  purchase_price NUMERIC(10,2) DEFAULT 0,
  stock_qty      INT DEFAULT 0,
  min_stock_qty  INT DEFAULT 5,
  is_active      BOOLEAN DEFAULT TRUE,
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 12. Stok Hareketleri ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stock_movements (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  part_id       UUID REFERENCES parts(id),
  product_id    UUID REFERENCES products(id),
  movement_type TEXT NOT NULL CHECK (movement_type IN ('giris','cikis','iade','fire','transfer')),
  quantity      INT NOT NULL,
  notes         TEXT,
  reference_id  TEXT,
  created_by    UUID REFERENCES user_profiles(id),
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 13. Tedarikçiler ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS suppliers (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  contact_name TEXT,
  phone        TEXT,
  email        TEXT,
  address      TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 14. Finansal İşlemler ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_transactions (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  account_id       UUID,
  type             TEXT NOT NULL CHECK (type IN ('gelir','gider')),
  amount           NUMERIC(12,2) NOT NULL,
  payment_method   TEXT DEFAULT 'nakit',
  category         TEXT,
  description      TEXT,
  reference_id     TEXT,
  transaction_date DATE DEFAULT CURRENT_DATE,
  created_by       UUID REFERENCES user_profiles(id),
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 15. Hesaplar (Kasa/Banka) ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS accounts (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  type       TEXT NOT NULL CHECK (type IN ('kasa','banka','pos')),
  balance    NUMERIC(12,2) DEFAULT 0,
  currency   TEXT DEFAULT 'TRY',
  is_active  BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 16. Satışlar ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sales (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id    UUID REFERENCES customers(id),
  items          JSONB NOT NULL DEFAULT '[]',
  subtotal       NUMERIC(12,2) DEFAULT 0,
  discount       NUMERIC(12,2) DEFAULT 0,
  total          NUMERIC(12,2) NOT NULL,
  payment_method TEXT DEFAULT 'nakit',
  status         TEXT DEFAULT 'tamamlandi' CHECK (status IN ('tamamlandi','iptal','iade')),
  sold_by        UUID REFERENCES user_profiles(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 17. İkinci El Alımlar ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS second_hand_purchases (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  seller_name     TEXT NOT NULL,
  seller_phone    TEXT NOT NULL,
  seller_tc       TEXT,
  device_brand    TEXT NOT NULL,
  device_model    TEXT NOT NULL,
  imei            TEXT,
  condition_notes TEXT,
  purchase_price  NUMERIC(10,2) NOT NULL,
  sale_price      NUMERIC(10,2),
  status          TEXT DEFAULT 'beklemede' CHECK (status IN ('beklemede','satilik','satildi')),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================================
-- BÖLÜM 2: YENİ VANTAPHONE MODÜLLERİ
-- ============================================================================

-- ─── 18. Alışlar (Satın Alma) ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS purchases (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id      UUID REFERENCES branches(id),
  supplier_name  TEXT NOT NULL,
  supplier_phone TEXT,
  supplier_id    UUID REFERENCES suppliers(id),
  device_brand   TEXT,
  device_model   TEXT,
  imei           TEXT,
  category       TEXT NOT NULL CHECK (category IN ('telefon','aksesuar','yedek_parca','ikinci_el')),
  quality        TEXT DEFAULT 'sifir' CHECK (quality IN ('sifir','ikinci_el','yenilenmis','yurtdisi','tamirli')),
  quantity       INT NOT NULL DEFAULT 1,
  buy_price      NUMERIC(10,2) NOT NULL,
  total_cost     NUMERIC(12,2) NOT NULL,
  payment_method TEXT DEFAULT 'nakit',
  invoice_no     TEXT,
  notes          TEXT,
  created_by     UUID REFERENCES user_profiles(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 19. Yapılacaklar (Todo) ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS todos (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id    UUID REFERENCES branches(id),
  title        TEXT NOT NULL,
  description  TEXT,
  priority     TEXT DEFAULT 'orta' CHECK (priority IN ('dusuk','orta','yuksek','acil')),
  category     TEXT DEFAULT 'genel' CHECK (category IN ('servis','stok','finans','genel','musteri')),
  assigned_to  UUID REFERENCES user_profiles(id),
  due_date     DATE,
  completed    BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  created_by   UUID REFERENCES user_profiles(id),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 20. Çalıntı IMEI Kayıtları ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS stolen_imeis (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  imei            TEXT NOT NULL,
  device_brand    TEXT,
  device_model    TEXT,
  reporter_name   TEXT,
  reporter_phone  TEXT,
  report_date     DATE DEFAULT CURRENT_DATE,
  source          TEXT DEFAULT 'manuel' CHECK (source IN ('btk','musteri','polis','manuel')),
  status          TEXT DEFAULT 'aktif' CHECK (status IN ('aktif','kaldirildi','dogrulandi')),
  notes           TEXT,
  created_by      UUID REFERENCES user_profiles(id),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 21. Müşteri Siparişleri ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customer_orders (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id      UUID REFERENCES branches(id),
  order_no       TEXT NOT NULL,
  customer_id    UUID REFERENCES customers(id),
  customer_name  TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  items          JSONB NOT NULL DEFAULT '[]',
  total          NUMERIC(12,2) NOT NULL,
  status         TEXT DEFAULT 'beklemede'
    CHECK (status IN ('beklemede','onaylandi','hazirlaniyor','kargoda','teslim_edildi','iptal')),
  payment_status TEXT DEFAULT 'odenmedi'
    CHECK (payment_status IN ('odenmedi','kismi','odendi')),
  payment_method TEXT DEFAULT 'nakit',
  notes          TEXT,
  created_by     UUID REFERENCES user_profiles(id),
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 22. Mağaza Ürünleri ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS store_products (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id   UUID REFERENCES branches(id),
  name        TEXT NOT NULL,
  category    TEXT,
  brand       TEXT,
  model       TEXT,
  price       NUMERIC(10,2) NOT NULL,
  cost_price  NUMERIC(10,2) DEFAULT 0,
  stock_count INT DEFAULT 0,
  imei        TEXT,
  quality     TEXT DEFAULT 'sifir'
    CHECK (quality IN ('sifir','ikinci_el','yenilenmis','yurtdisi','tamirli')),
  is_active   BOOLEAN DEFAULT TRUE,
  image_url   TEXT,
  description TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 23. Varlıklar / Demirbaşlar ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS assets (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id        UUID REFERENCES branches(id),
  name             TEXT NOT NULL,
  category         TEXT NOT NULL
    CHECK (category IN ('bilgisayar','yazici','test_cihazi','mobilya','arac','diger')),
  serial_no        TEXT,
  barcode          TEXT,
  purchase_date    DATE,
  purchase_price   NUMERIC(12,2) DEFAULT 0,
  current_value    NUMERIC(12,2) DEFAULT 0,
  assigned_to      TEXT,
  assigned_user_id UUID REFERENCES user_profiles(id),
  location         TEXT,
  status           TEXT DEFAULT 'aktif'
    CHECK (status IN ('aktif','bakim','arizali','emekli')),
  next_maintenance DATE,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 24. Kampanyalar ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS campaigns (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name              TEXT NOT NULL,
  description       TEXT NOT NULL,
  type              TEXT NOT NULL
    CHECK (type IN ('indirim','hediye','2al1ode','kupon','ozel_fiyat')),
  discount_percent  NUMERIC(5,2),
  discount_amount   NUMERIC(10,2),
  target_categories TEXT[] DEFAULT '{}',
  start_date        DATE NOT NULL,
  end_date          DATE,
  is_active         BOOLEAN DEFAULT TRUE,
  usage_count       INT DEFAULT 0,
  max_usage         INT,
  created_by        UUID REFERENCES user_profiles(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 25. Fırsatlar / Özel Teklifler ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS deals (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  product_name   TEXT NOT NULL,
  original_price NUMERIC(10,2) DEFAULT 0,
  deal_price     NUMERIC(10,2) NOT NULL,
  stock_count    INT DEFAULT 0,
  sold_count     INT DEFAULT 0,
  category       TEXT,
  is_active      BOOLEAN DEFAULT TRUE,
  end_date       DATE,
  description    TEXT,
  created_by     UUID REFERENCES user_profiles(id),
  created_at     TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================================
-- BÖLÜM 3: INDEXLER (Performans)
-- ============================================================================

-- Mevcut tablo indexleri
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_tenants_email ON tenants(email);
CREATE INDEX IF NOT EXISTS idx_user_profiles_tenant ON user_profiles(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role);
CREATE INDEX IF NOT EXISTS idx_customers_tenant ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_service_orders_tenant ON service_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_service_orders_status ON service_orders(status);
CREATE INDEX IF NOT EXISTS idx_service_orders_order_no ON service_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_service_orders_imei ON service_orders(imei);
CREATE INDEX IF NOT EXISTS idx_parts_tenant ON parts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_parts_barcode ON parts(barcode);
CREATE INDEX IF NOT EXISTS idx_financial_tx_tenant ON financial_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_tx_type ON financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_financial_tx_date ON financial_transactions(transaction_date);

-- Yeni tablo indexleri
CREATE INDEX IF NOT EXISTS idx_purchases_tenant ON purchases(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchases_category ON purchases(category);
CREATE INDEX IF NOT EXISTS idx_todos_tenant ON todos(tenant_id);
CREATE INDEX IF NOT EXISTS idx_todos_assigned ON todos(assigned_to);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON todos(completed);
CREATE INDEX IF NOT EXISTS idx_stolen_imeis_imei ON stolen_imeis(imei);
CREATE INDEX IF NOT EXISTS idx_stolen_imeis_status ON stolen_imeis(status);
CREATE INDEX IF NOT EXISTS idx_stolen_imeis_tenant ON stolen_imeis(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_orders_tenant ON customer_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customer_orders_order_no ON customer_orders(order_no);
CREATE INDEX IF NOT EXISTS idx_customer_orders_status ON customer_orders(status);
CREATE INDEX IF NOT EXISTS idx_store_products_tenant ON store_products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_store_products_category ON store_products(category);
CREATE INDEX IF NOT EXISTS idx_assets_tenant ON assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(status);
CREATE INDEX IF NOT EXISTS idx_campaigns_tenant ON campaigns(tenant_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_deals_tenant ON deals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_deals_active ON deals(is_active);


-- ============================================================================
-- BÖLÜM 4: RPC FONKSİYONLARI
-- ============================================================================

-- Mevcut tenant ID'sini al (RLS için)
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS UUID
LANGUAGE SQL STABLE
AS $$
  SELECT tenant_id FROM user_profiles WHERE id = auth.uid()
$$;

-- Süper admin kontrolü
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
$$;

-- Servis sipariş numarası üretici
CREATE OR REPLACE FUNCTION generate_order_no(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM service_orders WHERE tenant_id = p_tenant_id;
  RETURN 'SRV-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$;

-- Müşteri sipariş numarası üretici
CREATE OR REPLACE FUNCTION generate_customer_order_no(p_tenant_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_count INT;
BEGIN
  SELECT COUNT(*) + 1 INTO v_count
  FROM customer_orders WHERE tenant_id = p_tenant_id;
  RETURN 'SIP-' || TO_CHAR(NOW(), 'YYMM') || '-' || LPAD(v_count::TEXT, 4, '0');
END;
$$;

-- IMEI çalıntı kontrolü
CREATE OR REPLACE FUNCTION check_stolen_imei(p_imei TEXT)
RETURNS TABLE (
  is_stolen BOOLEAN,
  device_brand TEXT,
  device_model TEXT,
  report_date DATE,
  source TEXT
)
LANGUAGE SQL STABLE
AS $$
  SELECT
    TRUE AS is_stolen,
    si.device_brand,
    si.device_model,
    si.report_date,
    si.source
  FROM stolen_imeis si
  WHERE si.imei = p_imei
    AND si.status IN ('aktif', 'dogrulandi')
  LIMIT 1
$$;

-- Dashboard istatistikleri
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_tenant_id UUID)
RETURNS JSON
LANGUAGE plpgsql STABLE
AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'total_orders', (SELECT COUNT(*) FROM service_orders WHERE tenant_id = p_tenant_id),
    'today_orders', (SELECT COUNT(*) FROM service_orders WHERE tenant_id = p_tenant_id AND created_at::date = CURRENT_DATE),
    'in_repair', (SELECT COUNT(*) FROM service_orders WHERE tenant_id = p_tenant_id AND status IN ('tamir','teshis')),
    'completed', (SELECT COUNT(*) FROM service_orders WHERE tenant_id = p_tenant_id AND status = 'teslim'),
    'total_revenue', (SELECT COALESCE(SUM(amount),0) FROM financial_transactions WHERE tenant_id = p_tenant_id AND type = 'gelir'),
    'total_expense', (SELECT COALESCE(SUM(amount),0) FROM financial_transactions WHERE tenant_id = p_tenant_id AND type = 'gider'),
    'pending_orders', (SELECT COUNT(*) FROM customer_orders WHERE tenant_id = p_tenant_id AND status = 'beklemede'),
    'active_campaigns', (SELECT COUNT(*) FROM campaigns WHERE tenant_id = p_tenant_id AND is_active = TRUE),
    'active_deals', (SELECT COUNT(*) FROM deals WHERE tenant_id = p_tenant_id AND is_active = TRUE),
    'pending_todos', (SELECT COUNT(*) FROM todos WHERE tenant_id = p_tenant_id AND completed = FALSE),
    'stolen_imei_count', (SELECT COUNT(*) FROM stolen_imeis WHERE tenant_id = p_tenant_id AND status = 'aktif'),
    'total_assets', (SELECT COUNT(*) FROM assets WHERE tenant_id = p_tenant_id AND status = 'aktif'),
    'total_store_products', (SELECT COUNT(*) FROM store_products WHERE tenant_id = p_tenant_id AND is_active = TRUE)
  ) INTO result;
  RETURN result;
END;
$$;


-- ============================================================================
-- BÖLÜM 5: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Tüm tablolarda RLS'yi etkinleştir
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_parts_used ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE second_hand_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;
ALTER TABLE stolen_imeis ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE store_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- ─── Subscription plans: Herkes okuyabilir ─────────────────────────────────
DROP POLICY IF EXISTS "plans_public_read" ON subscription_plans;
CREATE POLICY "plans_public_read" ON subscription_plans
  FOR SELECT USING (TRUE);

DROP POLICY IF EXISTS "plans_admin_write" ON subscription_plans;
CREATE POLICY "plans_admin_write" ON subscription_plans
  FOR ALL USING (is_super_admin());

-- ─── Tenants: super_admin ──────────────────────────────────────────────────
DROP POLICY IF EXISTS "tenants_super_admin" ON tenants;
CREATE POLICY "tenants_super_admin" ON tenants
  FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "tenants_own_read" ON tenants;
CREATE POLICY "tenants_own_read" ON tenants
  FOR SELECT USING (id = get_current_tenant_id());

-- ─── Tenant payments: admin only ───────────────────────────────────────────
DROP POLICY IF EXISTS "payments_admin" ON tenant_payments;
CREATE POLICY "payments_admin" ON tenant_payments
  FOR ALL USING (is_super_admin());

-- ─── User profiles ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "profiles_own_read" ON user_profiles;
CREATE POLICY "profiles_own_read" ON user_profiles
  FOR SELECT USING (
    id = auth.uid()
    OR tenant_id = get_current_tenant_id()
    OR is_super_admin()
  );

DROP POLICY IF EXISTS "profiles_own_update" ON user_profiles;
CREATE POLICY "profiles_own_update" ON user_profiles
  FOR UPDATE USING (id = auth.uid() OR is_super_admin());

DROP POLICY IF EXISTS "profiles_admin_insert" ON user_profiles;
CREATE POLICY "profiles_admin_insert" ON user_profiles
  FOR INSERT WITH CHECK (is_super_admin() OR tenant_id = get_current_tenant_id());

-- ─── Tenant-scoped tablolar (toplu RLS) ────────────────────────────────────
DO $$
DECLARE
  tbl TEXT;
  policy_name TEXT;
  tables TEXT[] := ARRAY[
    'branches', 'customers', 'service_orders', 'parts', 'products',
    'stock_movements', 'suppliers', 'financial_transactions', 'accounts',
    'sales', 'second_hand_purchases',
    'purchases', 'todos', 'stolen_imeis', 'customer_orders',
    'store_products', 'assets', 'campaigns', 'deals'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables
  LOOP
    policy_name := 'tenant_select_' || tbl;
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR SELECT USING (tenant_id = get_current_tenant_id() OR is_super_admin())',
      policy_name, tbl
    );

    policy_name := 'tenant_insert_' || tbl;
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin())',
      policy_name, tbl
    );

    policy_name := 'tenant_update_' || tbl;
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR UPDATE USING (tenant_id = get_current_tenant_id() OR is_super_admin())',
      policy_name, tbl
    );

    policy_name := 'tenant_delete_' || tbl;
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', policy_name, tbl);
    EXECUTE format(
      'CREATE POLICY %I ON %I FOR DELETE USING (tenant_id = get_current_tenant_id() OR is_super_admin())',
      policy_name, tbl
    );
  END LOOP;
END;
$$;

-- ─── Service status history ────────────────────────────────────────────────
DROP POLICY IF EXISTS "status_history_read" ON service_status_history;
CREATE POLICY "status_history_read" ON service_status_history
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM service_orders so
      WHERE so.id = order_id
        AND (so.tenant_id = get_current_tenant_id() OR is_super_admin())
    )
  );

DROP POLICY IF EXISTS "status_history_write" ON service_status_history;
CREATE POLICY "status_history_write" ON service_status_history
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM service_orders so
      WHERE so.id = order_id
        AND (so.tenant_id = get_current_tenant_id() OR is_super_admin())
    )
  );

-- ─── Service parts used ───────────────────────────────────────────────────
DROP POLICY IF EXISTS "parts_used_access" ON service_parts_used;
CREATE POLICY "parts_used_access" ON service_parts_used
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM service_orders so
      WHERE so.id = order_id
        AND (so.tenant_id = get_current_tenant_id() OR is_super_admin())
    )
  );


-- ============================================================================
-- BÖLÜM 6: TRIGGER'LAR
-- ============================================================================

-- updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- updated_at trigger'larını uygula
DO $$
DECLARE
  tbl TEXT;
  tables_with_updated_at TEXT[] := ARRAY[
    'tenants', 'user_profiles', 'customers',
    'service_orders', 'parts', 'customer_orders'
  ];
BEGIN
  FOREACH tbl IN ARRAY tables_with_updated_at
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_updated_at_%1$s ON %1$I;
       CREATE TRIGGER trg_updated_at_%1$s
       BEFORE UPDATE ON %1$I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at()', tbl
    );
  END LOOP;
END;
$$;

-- Todo tamamlandığında completed_at otomatik set
CREATE OR REPLACE FUNCTION set_todo_completed_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.completed = TRUE AND (OLD.completed IS NULL OR OLD.completed = FALSE) THEN
    NEW.completed_at = NOW();
  ELSIF NEW.completed = FALSE THEN
    NEW.completed_at = NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_todo_completed ON todos;
CREATE TRIGGER trg_todo_completed
BEFORE UPDATE ON todos
FOR EACH ROW EXECUTE FUNCTION set_todo_completed_at();

-- Servis durumu değiştiğinde otomatik geçmiş kaydı
CREATE OR REPLACE FUNCTION log_service_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO service_status_history (order_id, status, note, created_by)
    VALUES (NEW.id, NEW.status, 'Otomatik durum değişikliği', auth.uid());
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_service_status_log ON service_orders;
CREATE TRIGGER trg_service_status_log
AFTER UPDATE ON service_orders
FOR EACH ROW EXECUTE FUNCTION log_service_status_change();


-- ============================================================================
-- BÖLÜM 7: GÖRÜNÜMLER (Views)
-- ============================================================================

-- Günlük gelir özeti
CREATE OR REPLACE VIEW daily_revenue_summary AS
SELECT
  tenant_id,
  transaction_date,
  SUM(CASE WHEN type = 'gelir' THEN amount ELSE 0 END) AS total_gelir,
  SUM(CASE WHEN type = 'gider' THEN amount ELSE 0 END) AS total_gider,
  SUM(CASE WHEN type = 'gelir' THEN amount ELSE -amount END) AS net_kar
FROM financial_transactions
GROUP BY tenant_id, transaction_date
ORDER BY transaction_date DESC;

-- Stok değeri özeti
CREATE OR REPLACE VIEW stock_value_summary AS
SELECT
  tenant_id,
  COUNT(*) AS total_products,
  SUM(stock_qty) AS total_qty,
  SUM(stock_qty * purchase_price) AS total_cost_value,
  SUM(stock_qty * sale_price) AS total_sale_value,
  COUNT(*) FILTER (WHERE stock_qty <= min_stock_qty) AS critical_stock_count
FROM parts
WHERE is_active = TRUE
GROUP BY tenant_id;

-- Servis durum dağılımı
CREATE OR REPLACE VIEW service_status_distribution AS
SELECT
  tenant_id,
  status,
  COUNT(*) AS count,
  ROUND(
    COUNT(*)::NUMERIC / NULLIF(SUM(COUNT(*)) OVER (PARTITION BY tenant_id), 0) * 100,
    1
  ) AS percentage
FROM service_orders
GROUP BY tenant_id, status;

-- Sipariş durum özeti
CREATE OR REPLACE VIEW order_status_summary AS
SELECT
  tenant_id,
  status,
  payment_status,
  COUNT(*) AS count,
  SUM(total) AS total_amount
FROM customer_orders
GROUP BY tenant_id, status, payment_status;


-- ============================================================================
-- BÖLÜM 8: BAŞLANGIÇ VERİLERİ
-- ============================================================================

INSERT INTO subscription_plans (name, price, max_users, max_branches, features)
VALUES
  ('Starter', 0, 1, 1, ARRAY['Teknik Servis','Stok (50 kayıt)','Finans (Temel)']),
  ('Pro', 499, 4, 2, ARRAY['Teknik Servis','Stok','Finans','Raporlar','Kampanyalar']),
  ('Business', 999, 10, 5, ARRAY['Teknik Servis','Stok','Finans','Raporlar','Kampanyalar','Çoklu Şube','Varlık Yönetimi','Öncelikli Destek','API Erişimi'])
ON CONFLICT DO NOTHING;


-- ============================================================================
-- TAMAMLANDI ✅
-- ============================================================================
-- Toplam: 25 tablo | 30+ index | 7 RPC | RLS politikaları | 4 trigger | 4 view
--
-- KULLANIM:
-- 1. Supabase Dashboard > SQL Editor'e gidin
-- 2. Bu SQL'in tamamını yapıştırın
-- 3. "Run" butonuna tıklayın
-- 4. .env.local dosyasına Supabase URL ve Anon Key'i ekleyin
-- ============================================================================
