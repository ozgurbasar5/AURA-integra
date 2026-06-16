-- Roadmap schema additions
ALTER TABLE service_orders ADD COLUMN IF NOT EXISTS approval_expires_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS gib_reference TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMPTZ;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS api_key TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_service_orders_approval_token ON service_orders(approval_token);
