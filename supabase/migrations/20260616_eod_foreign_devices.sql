-- Gün sonu raporu snapshot + foreign_devices RLS
ALTER TABLE cash_shifts ADD COLUMN IF NOT EXISTS report_snapshot JSONB;

ALTER TABLE foreign_devices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS foreign_devices_tenant ON foreign_devices;
CREATE POLICY foreign_devices_tenant ON foreign_devices
  FOR ALL USING (tenant_id = get_current_tenant_id())
  WITH CHECK (tenant_id = get_current_tenant_id());
