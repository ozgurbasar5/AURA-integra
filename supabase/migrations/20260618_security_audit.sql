-- Güvenlik denetimi düzeltmeleri: financial_posted, audit_logs, sms_logs, PII, API key hash

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ─── Servis teslim finans duplikasyon koruması ───────────────────────────────
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS financial_posted BOOLEAN DEFAULT false;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS net_profit DECIMAL(10,2) DEFAULT 0;

ALTER TABLE financial_transactions ADD COLUMN IF NOT EXISTS financial_posted BOOLEAN DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS idx_financial_tx_service_delivery
  ON financial_transactions (tenant_id, service_id)
  WHERE service_id IS NOT NULL AND type = 'gelir' AND category = 'Servis Teslim';

CREATE OR REPLACE FUNCTION sync_service_financial_posted()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.service_id IS NOT NULL AND NEW.type = 'gelir' AND NEW.category = 'Servis Teslim' THEN
    NEW.financial_posted := true;
    UPDATE service_orders
    SET financial_posted = true,
        delivered_at = COALESCE(delivered_at, NOW()),
        actual_cost = COALESCE(actual_cost, NEW.amount)
    WHERE id = NEW.service_id AND tenant_id = NEW.tenant_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_service_financial_posted ON financial_transactions;
CREATE TRIGGER trg_sync_service_financial_posted
  BEFORE INSERT OR UPDATE ON financial_transactions
  FOR EACH ROW EXECUTE FUNCTION sync_service_financial_posted();

-- ─── Tenant audit log ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  action      VARCHAR(50) NOT NULL,
  entity_type VARCHAR(50) NOT NULL,
  entity_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  VARCHAR(45),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_logs_tenant ON audit_logs;
CREATE POLICY audit_logs_tenant ON audit_logs
  FOR ALL USING (tenant_id = get_current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- ─── SMS logları ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sms_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  recipient     TEXT NOT NULL,
  message       TEXT NOT NULL,
  provider      TEXT DEFAULT 'netgsm',
  status        TEXT NOT NULL DEFAULT 'pending',
  provider_ref  TEXT,
  error_message TEXT,
  order_no      TEXT,
  customer_name TEXT,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sms_logs_tenant ON sms_logs(tenant_id, created_at DESC);

ALTER TABLE sms_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sms_logs_tenant ON sms_logs;
CREATE POLICY sms_logs_tenant ON sms_logs
  FOR ALL USING (tenant_id = get_current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- ─── Cihaz talep köprüsü (Aura Bilişim ↔ AURA-integra) ───────────────────────
CREATE TABLE IF NOT EXISTS device_requests (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id       UUID REFERENCES tenants(id) ON DELETE SET NULL,
  source          TEXT NOT NULL DEFAULT 'aura_bilisim',
  external_id     TEXT,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT,
  device_brand    TEXT,
  device_model    TEXT,
  imei            TEXT,
  fault_description TEXT,
  status          TEXT NOT NULL DEFAULT 'beklemede',
  service_order_id UUID REFERENCES service_orders(id) ON DELETE SET NULL,
  metadata        JSONB DEFAULT '{}',
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_device_requests_tenant ON device_requests(tenant_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_device_requests_external ON device_requests(source, external_id)
  WHERE external_id IS NOT NULL;

ALTER TABLE device_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS device_requests_tenant ON device_requests;
CREATE POLICY device_requests_tenant ON device_requests
  FOR ALL USING (tenant_id = get_current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

-- ─── PII şifreleme (uygulama katmanı AES) ────────────────────────────────────
-- NOT: phone aranabilir + NOT NULL olduğundan DAİMA düz metin kalır (phone_enc
-- kullanılmıyor, yalnızca geriye dönük uyumluluk için tutuluyor). Yalnızca
-- aranmayan hassas alanlar (vkn, tc_no) APP_ENCRYPTION_KEY mevcutsa şifrelenir.
ALTER TABLE customers ADD COLUMN IF NOT EXISTS phone_enc TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS vkn_enc TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS tc_no_enc TEXT;

-- ─── API key hash (plain text yerine) ────────────────────────────────────────
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS api_key_hash TEXT;

UPDATE tenants
SET api_key_hash = encode(digest(api_key, 'sha256'), 'hex')
WHERE api_key IS NOT NULL AND api_key_hash IS NULL;

-- Plain api_key sütununu temizle (hash ile doğrulama yapılır)
UPDATE tenants SET api_key = NULL WHERE api_key_hash IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenants_api_key_hash ON tenants(api_key_hash)
  WHERE api_key_hash IS NOT NULL;
