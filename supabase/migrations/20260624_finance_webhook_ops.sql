-- Finans RPC + webhook failure log

CREATE OR REPLACE FUNCTION adjust_kasa_balance(p_tenant_id UUID, p_delta NUMERIC)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_balance NUMERIC;
BEGIN
  UPDATE accounts
  SET balance = balance + p_delta
  WHERE tenant_id = p_tenant_id AND type = 'kasa'
  RETURNING balance INTO v_balance;

  IF NOT FOUND THEN
    INSERT INTO accounts (tenant_id, name, type, balance, currency)
    VALUES (p_tenant_id, 'Kasa', 'kasa', GREATEST(p_delta, 0), 'TRY')
    RETURNING balance INTO v_balance;
  END IF;

  RETURN v_balance;
END;
$$;

GRANT EXECUTE ON FUNCTION adjust_kasa_balance(UUID, NUMERIC) TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS webhook_failures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider TEXT NOT NULL,
  event_type TEXT,
  external_ref TEXT,
  tenant_id UUID REFERENCES tenants(id) ON DELETE SET NULL,
  error_message TEXT NOT NULL,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE webhook_failures ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_read_webhook_failures ON webhook_failures;
CREATE POLICY admin_read_webhook_failures ON webhook_failures
  FOR SELECT USING (is_super_admin());
DROP POLICY IF EXISTS service_insert_webhook_failures ON webhook_failures;
CREATE POLICY service_insert_webhook_failures ON webhook_failures
  FOR INSERT WITH CHECK (true);

GRANT ALL ON TABLE webhook_failures TO service_role;
GRANT SELECT ON TABLE webhook_failures TO authenticated;

NOTIFY pgrst, 'reload schema';
