-- Tam olgunluk sprinti: Storage bucket, e-Fatura kuyruk, AI kullanım tabloları

-- ─── Device photos Storage bucket ───────────────────────────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'device-photos',
  'device-photos',
  true,
  1048576,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Public read for device photos (URLs embedded in portal/print)
-- PostgreSQL: CREATE POLICY does not support IF NOT EXISTS — drop then create
DROP POLICY IF EXISTS device_photos_public_read ON storage.objects;
CREATE POLICY device_photos_public_read ON storage.objects
  FOR SELECT USING (bucket_id = 'device-photos');

DROP POLICY IF EXISTS device_photos_auth_read ON storage.objects;
CREATE POLICY device_photos_auth_read ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'device-photos');

-- ─── e-Fatura kuyruk (stub — gerçek HTTP sonra) ─────────────────────────────
CREATE TABLE IF NOT EXISTS efatura_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  invoice_id UUID NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'submitted', 'failed')),
  retry_count INT NOT NULL DEFAULT 0,
  gib_reference TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_efatura_queue_tenant_status ON efatura_queue(tenant_id, status);

ALTER TABLE efatura_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS efatura_queue_tenant ON efatura_queue;
CREATE POLICY efatura_queue_tenant ON efatura_queue
  FOR ALL USING (
    tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE ON efatura_queue TO authenticated;
GRANT ALL ON efatura_queue TO service_role;

-- ─── AI kullanım logları ve kota ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  model TEXT NOT NULL,
  input_tokens INT NOT NULL DEFAULT 0,
  output_tokens INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_tenant_month ON ai_usage_logs(tenant_id, created_at DESC);

CREATE TABLE IF NOT EXISTS tenant_ai_quotas (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  month_key TEXT NOT NULL,
  messages_used INT NOT NULL DEFAULT 0,
  tokens_used INT NOT NULL DEFAULT 0,
  PRIMARY KEY (tenant_id, month_key)
);

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenant_ai_quotas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_usage_logs_tenant ON ai_usage_logs;
CREATE POLICY ai_usage_logs_tenant ON ai_usage_logs
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

DROP POLICY IF EXISTS tenant_ai_quotas_tenant ON tenant_ai_quotas;
CREATE POLICY tenant_ai_quotas_tenant ON tenant_ai_quotas
  FOR SELECT USING (
    tenant_id IN (SELECT tenant_id FROM user_profiles WHERE id = auth.uid())
  );

GRANT SELECT ON ai_usage_logs TO authenticated;
GRANT ALL ON ai_usage_logs TO service_role;
GRANT SELECT ON tenant_ai_quotas TO authenticated;
GRANT ALL ON tenant_ai_quotas TO service_role;
