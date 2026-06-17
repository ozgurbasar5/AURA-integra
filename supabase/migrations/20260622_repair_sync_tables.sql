-- ============================================================================
-- Sync onarımı — tenant_settings kolonu + eksik tablolar
-- Supabase SQL Editor'da çalıştırın (20260614 kısmen uygulandıysa)
-- ============================================================================

-- tenant_settings: eski tablo varsa CREATE TABLE atlanır; kolonları ekle
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS settings JSONB NOT NULL DEFAULT '{}';
ALTER TABLE tenant_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- tenant_id yoksa (çok eski şema) — nadiren gerekir
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'tenant_settings' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE tenant_settings ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Vitrin cihazları
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

-- Servis giderleri
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

-- Eski service_expenses'te tenant_id yoksa ekle
ALTER TABLE service_expenses ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;

-- RLS (idempotent)
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['tenant_settings', 'showcase_devices', 'service_expenses']
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

-- PostgREST / API erişimi (42501 permission denied önleme)
DO $$
DECLARE tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['tenant_settings', 'showcase_devices', 'service_expenses']
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

-- PostgREST şema önbelleğini yenile
NOTIFY pgrst, 'reload schema';

-- Doğrulama
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tenant_settings' AND column_name = 'settings') AS tenant_settings_ok,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'showcase_devices') AS showcase_devices_ok,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'service_expenses') AS service_expenses_ok;
