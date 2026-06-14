-- ============================================================================
-- AURA İntegra — SaaS Güncelleme (VantaPhone tarzı) — GÜVENLİ SÜRÜM
-- Supabase SQL Editor'de çalıştırın. DELETE kullanılmaz (FK hatası olmaz).
-- ============================================================================

-- Bayi başvuruları
CREATE TABLE IF NOT EXISTS bayi_basvurulari (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  city         TEXT,
  message      TEXT,
  status       TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── 1) Eksik paketleri ekle (silme yok) ────────────────────────────────────
INSERT INTO subscription_plans (name, price, max_users, max_branches, features, is_active)
SELECT 'Deneyim', 0, 2, 1,
  ARRAY['30 Gün Deneme','Teknik Servis','Stok Yönetimi','2 Kullanıcı','1 Şube'], TRUE
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Deneyim');

INSERT INTO subscription_plans (name, price, max_users, max_branches, features, is_active)
SELECT 'Pro', 450, 4, 2,
  ARRAY['Teknik Servis','Stok','Finans','Raporlar','4 Kullanıcı','2 Şube'], FALSE
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Pro');

INSERT INTO subscription_plans (name, price, max_users, max_branches, features, is_active)
SELECT 'Business', 800, 8, 4,
  ARRAY['Tüm Modüller','Çoklu Şube','Varlık Yönetimi','8 Kullanıcı','4 Şube','Öncelikli Destek'], FALSE
WHERE NOT EXISTS (SELECT 1 FROM subscription_plans WHERE name = 'Business');

-- ─── 2) Eski isimleri yeni isimlere güncelle (UUID korunur, FK bozulmaz) ───
UPDATE subscription_plans SET
  name = 'Deneyim', price = 0, max_users = 2, max_branches = 1,
  features = ARRAY['30 Gün Deneme','Teknik Servis','Stok Yönetimi','2 Kullanıcı','1 Şube'],
  is_active = TRUE
WHERE name IN ('Starter', 'Başlangıç', 'Deneyim', 'VantaPhone Deneyim');

UPDATE subscription_plans SET
  name = 'Pro', price = 450, max_users = 4, max_branches = 2,
  features = ARRAY['Teknik Servis','Stok','Finans','Raporlar','4 Kullanıcı','2 Şube'],
  is_active = FALSE
WHERE name IN ('Pro', 'Profesyonel', 'VantaPhone Pro');

UPDATE subscription_plans SET
  name = 'Business', price = 800, max_users = 8, max_branches = 4,
  features = ARRAY['Tüm Modüller','Çoklu Şube','Varlık Yönetimi','8 Kullanıcı','4 Şube','Öncelikli Destek'],
  is_active = FALSE
WHERE name IN ('Business', 'Enterprise', 'Kurumsal', 'VantaPhone Business');

-- ─── 3) Vitrin paketi: yalnızca Deneyim aktif ───────────────────────────────
UPDATE subscription_plans SET is_active = FALSE;
UPDATE subscription_plans SET is_active = TRUE
WHERE name = 'Deneyim'
  AND id = (SELECT id FROM subscription_plans WHERE name = 'Deneyim' ORDER BY created_at LIMIT 1);

-- ─── 4) plan_id NULL bayiler → Deneyim ───────────────────────────────────────
UPDATE tenants
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'Deneyim' ORDER BY created_at LIMIT 1)
WHERE plan_id IS NULL;

-- ─── 5) Süper admin profili (admin@aurabilisim.com vb.) ─────────────────────
INSERT INTO user_profiles (id, full_name, role, is_active, tenant_id)
SELECT
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', 'AURA Admin'),
  'super_admin',
  TRUE,
  NULL
FROM auth.users u
WHERE u.email ILIKE 'admin@aurabilisim%'
ON CONFLICT (id) DO UPDATE SET
  role       = 'super_admin',
  is_active  = TRUE,
  tenant_id  = NULL,
  full_name  = COALESCE(EXCLUDED.full_name, user_profiles.full_name);

-- Mevcut admin profilinde yanlış rol varsa düzelt
UPDATE user_profiles
SET role = 'super_admin', tenant_id = NULL, is_active = TRUE
WHERE id IN (SELECT id FROM auth.users WHERE email ILIKE 'admin@aurabilisim%');

-- ─── 6) İndeksler ───────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tenant_payments_status ON tenant_payments(status);
CREATE INDEX IF NOT EXISTS idx_tenant_payments_due ON tenant_payments(due_date);
CREATE INDEX IF NOT EXISTS idx_tenants_subscription_end ON tenants(subscription_end);

-- ─── 7) Doğrulama (sonuçları kontrol edin) ──────────────────────────────────
SELECT 'Paketler' AS tablo, name, price, is_active FROM subscription_plans ORDER BY price;
SELECT 'Süper Admin' AS tablo, u.email, p.role, p.is_active
FROM auth.users u
LEFT JOIN user_profiles p ON p.id = u.id
WHERE u.email ILIKE 'admin@aurabilisim%';
