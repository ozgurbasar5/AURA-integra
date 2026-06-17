-- ============================================================================
-- AURA İntegra — Tam ERP + SaaS Migration (Incremental)
-- Önce supabase_migration.sql + supabase_packages_v2.sql çalıştırın.
-- Sonra bu dosyayı Supabase SQL Editor'de çalıştırın.
-- ============================================================================

-- ─── Servis emirleri genişletme ─────────────────────────────────────────────
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS final_checks JSONB DEFAULT '[]';
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS approval_token TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'none';
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS approval_amount NUMERIC(10,2);
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS private_note TEXT;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- ─── Finans genişletme ──────────────────────────────────────────────────────
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS order_no TEXT;
ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES service_orders(id) ON DELETE SET NULL;

-- ─── Satış genişletme (POS kâr marjı) ───────────────────────────────────────
ALTER TABLE sales ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS cost_price NUMERIC(12,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS gross_profit NUMERIC(12,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS net_profit NUMERIC(12,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS vat_rate NUMERIC(5,2) DEFAULT 20;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS vat_amount NUMERIC(12,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS expense_total NUMERIC(12,2) DEFAULT 0;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS extra JSONB DEFAULT '{}';

-- ─── Parça tedarikçi adı ────────────────────────────────────────────────────
ALTER TABLE parts ADD COLUMN IF NOT EXISTS supplier TEXT;

-- ─── Tenant ayarları (bildirim, marka, portal) ─────────────────────────────
CREATE TABLE IF NOT EXISTS tenant_settings (
  tenant_id  UUID PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
  settings   JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Randevular ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS appointments (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_name     TEXT NOT NULL,
  customer_phone    TEXT NOT NULL,
  device_brand      TEXT,
  device_model      TEXT,
  fault_description TEXT,
  appointment_date  DATE NOT NULL,
  appointment_time  TEXT NOT NULL,
  duration_minutes  INT DEFAULT 30,
  technician_name   TEXT,
  status            TEXT DEFAULT 'beklemede',
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Garanti kayıtları ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS warranties (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id        UUID REFERENCES service_orders(id) ON DELETE SET NULL,
  customer_name   TEXT,
  order_no        TEXT,
  imei            TEXT,
  device_brand    TEXT NOT NULL,
  device_model    TEXT NOT NULL,
  warranty_months INT DEFAULT 3,
  start_date      DATE NOT NULL,
  end_date        DATE NOT NULL,
  covered_parts   TEXT[] DEFAULT '{}',
  terms           TEXT,
  status          TEXT DEFAULT 'aktif',
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Faturalar ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_type   TEXT NOT NULL DEFAULT 'satis',
  invoice_no     TEXT NOT NULL,
  invoice_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  customer_name  TEXT NOT NULL,
  customer_vkn   TEXT,
  order_no       TEXT,
  items          JSONB NOT NULL DEFAULT '[]',
  subtotal       NUMERIC(12,2) DEFAULT 0,
  kdv_amount     NUMERIC(12,2) DEFAULT 0,
  total          NUMERIC(12,2) NOT NULL,
  status         TEXT DEFAULT 'taslak',
  created_at     TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Bildirim logları ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notification_logs (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  channel       TEXT NOT NULL,
  recipient     TEXT NOT NULL,
  subject       TEXT,
  content       TEXT NOT NULL,
  status        TEXT DEFAULT 'sent',
  order_no      TEXT,
  customer_name TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Destek talepleri ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  priority    TEXT DEFAULT 'normal',
  description TEXT NOT NULL,
  status      TEXT DEFAULT 'acik',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Kasa vardiyaları ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cash_shifts (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  branch_id        UUID REFERENCES branches(id),
  opened_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  closed_at        TIMESTAMPTZ,
  opening_balance  NUMERIC(12,2) DEFAULT 0,
  closing_balance  NUMERIC(12,2),
  expected_cash    NUMERIC(12,2),
  difference       NUMERIC(12,2),
  opened_by        TEXT NOT NULL,
  closed_by        TEXT,
  notes            TEXT,
  status           TEXT DEFAULT 'open'
);

-- ─── Tedarik siparişleri ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS supplier_orders (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id         UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_no          TEXT NOT NULL,
  supplier_name     TEXT NOT NULL,
  supplier_phone    TEXT,
  service_order_id  UUID REFERENCES service_orders(id) ON DELETE SET NULL,
  service_job_no    TEXT,
  items             JSONB NOT NULL DEFAULT '[]',
  total             NUMERIC(12,2) DEFAULT 0,
  status            TEXT DEFAULT 'beklemede',
  expected_at       TIMESTAMPTZ,
  notes             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Vitrin / ikinci el cihazlar ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS showcase_devices (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  brand          TEXT NOT NULL,
  model          TEXT NOT NULL,
  imei           TEXT,
  barcode        TEXT,
  condition      TEXT DEFAULT 'iyi',
  cosmetic_score INT DEFAULT 8,
  battery_health INT,
  color          TEXT,
  storage        TEXT,
  buy_price      NUMERIC(10,2) DEFAULT 0,
  sell_price     NUMERIC(10,2) DEFAULT 0,
  status         TEXT DEFAULT 'satilik',
  showcase       BOOLEAN DEFAULT TRUE,
  notes          TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  sold_at        TIMESTAMPTZ
);

-- ─── Yurt dışı cihaz kayıtları ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS foreign_devices (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  imei          TEXT NOT NULL,
  device_brand  TEXT,
  device_model  TEXT,
  origin_country TEXT,
  notes         TEXT,
  status        TEXT DEFAULT 'aktif',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Servis giderleri ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS service_expenses (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  service_order_id UUID NOT NULL REFERENCES service_orders(id) ON DELETE CASCADE,
  source           TEXT NOT NULL DEFAULT 'part',
  reference_id     TEXT,
  description      TEXT NOT NULL,
  amount           NUMERIC(10,2) NOT NULL,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Personel KPI (user_profiles dışında) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS personnel_profiles (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id               UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_profile_id         UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  full_name               TEXT NOT NULL,
  role                    TEXT DEFAULT 'teknisyen',
  position                TEXT,
  phone                   TEXT,
  email                   TEXT,
  branch_name             TEXT,
  hire_date               DATE,
  salary                  NUMERIC(12,2),
  commission_rate         NUMERIC(5,2) DEFAULT 5,
  daily_target            INT DEFAULT 5,
  is_active               BOOLEAN DEFAULT TRUE,
  completed_today         INT DEFAULT 0,
  completed_month         INT DEFAULT 0,
  avg_repair_time_hours   NUMERIC(6,2) DEFAULT 0,
  return_rate             NUMERIC(5,2) DEFAULT 0,
  satisfaction_avg        NUMERIC(3,1) DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Müşteri ek alanları ────────────────────────────────────────────────────
ALTER TABLE customers ADD COLUMN IF NOT EXISTS sms_allowed BOOLEAN DEFAULT TRUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS email_allowed BOOLEAN DEFAULT TRUE;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS satisfaction_avg NUMERIC(3,1) DEFAULT 0;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS kvkk_consent_date DATE;

-- ─── Tenant portal alanları ───────────────────────────────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shop_name TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS portal_slug TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shop_logo TEXT;

-- ─── RLS: yeni tablolar ─────────────────────────────────────────────────────
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'tenant_settings','appointments','warranties','invoices','notification_logs',
    'support_tickets','cash_shifts','supplier_orders','showcase_devices',
    'foreign_devices','service_expenses','personnel_profiles'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_all_%1$s ON %1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_select_%1$s ON %1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_insert_%1$s ON %1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_update_%1$s ON %1$I', tbl);
    EXECUTE format('DROP POLICY IF EXISTS tenant_delete_%1$s ON %1$I', tbl);
    IF tbl = 'tenant_settings' THEN
      EXECUTE format(
        'CREATE POLICY tenant_all_%1$s ON %1$I FOR ALL USING (tenant_id = get_current_tenant_id() OR is_super_admin()) WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin())',
        tbl
      );
    ELSE
      EXECUTE format(
        'CREATE POLICY tenant_select_%1$s ON %1$I FOR SELECT USING (tenant_id = get_current_tenant_id() OR is_super_admin())',
        tbl
      );
      EXECUTE format(
        'CREATE POLICY tenant_insert_%1$s ON %1$I FOR INSERT WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin())',
        tbl
      );
      EXECUTE format(
        'CREATE POLICY tenant_update_%1$s ON %1$I FOR UPDATE USING (tenant_id = get_current_tenant_id() OR is_super_admin())',
        tbl
      );
      EXECUTE format(
        'CREATE POLICY tenant_delete_%1$s ON %1$I FOR DELETE USING (tenant_id = get_current_tenant_id() OR is_super_admin())',
        tbl
      );
    END IF;
  END LOOP;
END $$;

-- PostgREST / API erişimi
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'tenant_settings','appointments','warranties','invoices','notification_logs',
    'support_tickets','cash_shifts','supplier_orders','showcase_devices',
    'foreign_devices','service_expenses','personnel_profiles'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = tbl
    ) THEN
      EXECUTE format('GRANT ALL ON TABLE %I TO authenticated', tbl);
      EXECUTE format('GRANT ALL ON TABLE %I TO service_role', tbl);
      EXECUTE format('GRANT SELECT, INSERT ON TABLE %I TO anon', tbl);
    END IF;
  END LOOP;
END $$;

-- ─── Müşteri takip: order_no ile güvenli public sorgu (RLS bypass yok) ───────
CREATE OR REPLACE FUNCTION public_track_service(p_order_no TEXT)
RETURNS TABLE (
  id UUID,
  order_no TEXT,
  device_brand TEXT,
  device_model TEXT,
  status TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  estimated_cost NUMERIC,
  actual_cost NUMERIC,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    so.id, so.order_no, so.device_brand, so.device_model, so.status,
    so.customer_name, so.customer_phone, so.estimated_cost, so.actual_cost,
    so.created_at, so.updated_at
  FROM service_orders so
  WHERE so.order_no = p_order_no
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public_track_service(TEXT) TO anon, authenticated;

-- ─── Bayi başvuruları (public insert) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS bayi_basvurulari (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name          TEXT NOT NULL,
  contact_name          TEXT NOT NULL,
  email                 TEXT NOT NULL,
  phone                 TEXT NOT NULL,
  city                  TEXT,
  device_types          TEXT[] DEFAULT '{}',
  monthly_service_count INT,
  plan_interest         TEXT,
  message               TEXT,
  status                TEXT DEFAULT 'beklemede',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE bayi_basvurulari ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS public_insert_basvuru ON bayi_basvurulari;
CREATE POLICY public_insert_basvuru ON bayi_basvurulari FOR INSERT WITH CHECK (TRUE);
DROP POLICY IF EXISTS admin_read_basvuru ON bayi_basvurulari;
CREATE POLICY admin_read_basvuru ON bayi_basvurulari FOR SELECT USING (is_super_admin());
