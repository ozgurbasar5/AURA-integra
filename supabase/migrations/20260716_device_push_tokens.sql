-- Expo push token kaydı (mobil cihazlar)
CREATE TABLE IF NOT EXISTS device_push_tokens (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id  UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  token      TEXT NOT NULL,
  platform   TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, token)
);

CREATE INDEX IF NOT EXISTS idx_device_push_tokens_tenant ON device_push_tokens(tenant_id);
CREATE INDEX IF NOT EXISTS idx_device_push_tokens_user ON device_push_tokens(user_id);

ALTER TABLE device_push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS tenant_all_device_push_tokens ON device_push_tokens;
CREATE POLICY tenant_all_device_push_tokens ON device_push_tokens
  FOR ALL USING (tenant_id = get_current_tenant_id() OR is_super_admin())
  WITH CHECK (tenant_id = get_current_tenant_id() OR is_super_admin());

GRANT ALL ON TABLE device_push_tokens TO authenticated, service_role;
