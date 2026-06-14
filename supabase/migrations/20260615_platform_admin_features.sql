-- Platform ayarları, audit log, başvuru düzeltmeleri, tenant feature flags

ALTER TABLE bayi_basvurulari ADD COLUMN IF NOT EXISTS internal_note TEXT;

DROP POLICY IF EXISTS basvuru_admin_update ON bayi_basvurulari;
CREATE POLICY basvuru_admin_update ON bayi_basvurulari
  FOR UPDATE USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE TABLE IF NOT EXISTS platform_settings (
  id         TEXT PRIMARY KEY DEFAULT 'default',
  settings   JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_settings_admin ON platform_settings;
CREATE POLICY platform_settings_admin ON platform_settings
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

INSERT INTO platform_settings (id, settings) VALUES ('default', '{
  "trial_days": 30,
  "payment_reminder_days_before": 3,
  "auto_suspend_overdue_days": 7,
  "support_email": "destek@aurabilisim.com",
  "sms_enabled": false,
  "email_enabled": true
}'::jsonb) ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_email TEXT,
  action      TEXT NOT NULL,
  target_type TEXT,
  target_id   TEXT,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_admin ON admin_audit_logs;
CREATE POLICY audit_admin ON admin_audit_logs
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS feature_flags JSONB DEFAULT '{
  "sms": true,
  "portal": true,
  "whatsapp": false,
  "efatura": false
}'::jsonb;

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS documentation_pages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug        TEXT UNIQUE NOT NULL,
  title       TEXT NOT NULL,
  content     TEXT NOT NULL DEFAULT '',
  category    TEXT DEFAULT 'genel',
  sort_order  INT DEFAULT 0,
  is_published BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE documentation_pages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS docs_read ON documentation_pages;
CREATE POLICY docs_read ON documentation_pages FOR SELECT USING (TRUE);
DROP POLICY IF EXISTS docs_admin ON documentation_pages;
CREATE POLICY docs_admin ON documentation_pages
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());
