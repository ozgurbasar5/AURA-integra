-- Webhook idempotency: tenant_payments.payment_method + external_ref

ALTER TABLE tenant_payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE tenant_payments ADD COLUMN IF NOT EXISTS external_ref TEXT;

DROP INDEX IF EXISTS idx_tenant_payments_external_ref;

CREATE UNIQUE INDEX IF NOT EXISTS idx_tenant_payments_external_ref
  ON tenant_payments (tenant_id, payment_method, external_ref)
  WHERE external_ref IS NOT NULL AND payment_method IS NOT NULL;
