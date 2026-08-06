-- Sprint 1: Garanti Modülü Migration'ı
-- Bu SQL'i Supabase SQL Editor üzerinden çalıştırınız.

ALTER TABLE warranties ADD COLUMN IF NOT EXISTS imei TEXT;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS invoice_no TEXT;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS exclusion_reasons TEXT[];
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS claim_notes TEXT;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS void_reason TEXT;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS qr_token TEXT UNIQUE DEFAULT gen_random_uuid()::text;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS sla_days INTEGER DEFAULT 0;
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS notify_before_days INTEGER DEFAULT 7;

CREATE INDEX IF NOT EXISTS idx_warranties_imei ON warranties(tenant_id, imei);
CREATE INDEX IF NOT EXISTS idx_warranties_qr ON warranties(qr_token);

CREATE TABLE IF NOT EXISTS warranty_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  warranty_id UUID NOT NULL,
  issue_description TEXT NOT NULL,
  reported_at TIMESTAMPTZ DEFAULT now(),
  technician_notes TEXT,
  resolution TEXT,
  resolution_amount NUMERIC(12,2),
  status TEXT DEFAULT 'open',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warranty_claims_warranty ON warranty_claims(warranty_id);
