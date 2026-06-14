-- ============================================================================
-- AURA İntegra — 3 Katmanlı Paket Sistemi + Temizlik
-- Supabase SQL Editor'de çalıştırın. FK güvenli (tenants/payments taşınır).
--
-- Paket 1: Stok & Satış      (Temel)
-- Paket 2: Teknik Servis     (Paket 1 dahil)
-- Paket 3: Finans & Analitik (Paket 1 + 2 dahil)
-- ============================================================================

-- ─── 0) Plan seviyesi yardımcı fonksiyonu ───────────────────────────────────
CREATE OR REPLACE FUNCTION _plan_level(n TEXT) RETURNS INT AS $$
  SELECT CASE
    WHEN n ILIKE '%finans%' OR n ILIKE '%analiti%' OR n ILIKE '%business%'
      OR n ILIKE '%kurumsal%' OR n ILIKE '%enterprise%' THEN 3
    WHEN n ILIKE '%servis%' OR n ILIKE '%atöl%' OR n ILIKE '%atol%'
      OR n ILIKE '%pro%' OR n ILIKE '%profesyonel%' THEN 2
    ELSE 1
  END
$$ LANGUAGE SQL IMMUTABLE;

-- ─── 1) Mükerrer paketleri tek seviyeye indir + kanonik 3 paket ─────────────
DO $$
DECLARE
  canon_id UUID;
  lvl INT;
  v_name TEXT;
  v_price NUMERIC;
  v_users INT;
  v_branches INT;
  v_features TEXT[];
BEGIN
  FOR lvl IN 1..3 LOOP
    -- Kanonik tanımlar
    IF lvl = 1 THEN
      v_name := 'Stok & Satış'; v_price := 450; v_users := 3; v_branches := 1;
      v_features := ARRAY['Stok & Envanter','Satış & POS','Müşteriler','Fatura & İrsaliye','Alış'];
    ELSIF lvl = 2 THEN
      v_name := 'Teknik Servis'; v_price := 750; v_users := 6; v_branches := 2;
      v_features := ARRAY['Stok & Satış (dahil)','Teknik Servis & Atölye','Cihaz & Arıza','Teknisyen','Garanti & Randevu'];
    ELSE
      v_name := 'Finans & Analitik'; v_price := 1200; v_users := 12; v_branches := 5;
      v_features := ARRAY['Teknik Servis (dahil)','Finans & Nakit Akışı','Banka & Vergi','Analitik','Öncelikli Destek'];
    END IF;

    -- Bu seviyedeki en eski planı kanonik seç
    SELECT id INTO canon_id FROM subscription_plans
      WHERE _plan_level(name) = lvl ORDER BY created_at NULLS FIRST LIMIT 1;

    IF canon_id IS NULL THEN
      -- Yoksa oluştur
      INSERT INTO subscription_plans (name, price, max_users, max_branches, features, is_active)
      VALUES (v_name, v_price, v_users, v_branches, v_features, (lvl = 1));
    ELSE
      -- Aynı seviyedeki diğer planlara bağlı tenants/payments'ı kanonik'e taşı
      UPDATE tenants SET plan_id = canon_id
        WHERE plan_id IN (
          SELECT id FROM subscription_plans WHERE _plan_level(name) = lvl AND id <> canon_id
        );
      UPDATE tenant_payments SET plan_id = canon_id
        WHERE plan_id IN (
          SELECT id FROM subscription_plans WHERE _plan_level(name) = lvl AND id <> canon_id
        );
      -- Mükerrerleri sil
      DELETE FROM subscription_plans WHERE _plan_level(name) = lvl AND id <> canon_id;
      -- Kanonik planı normalize et
      UPDATE subscription_plans SET
        name = v_name, price = v_price, max_users = v_users,
        max_branches = v_branches, features = v_features, is_active = (lvl = 1)
      WHERE id = canon_id;
    END IF;
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS _plan_level(TEXT);

-- ─── 2) plan_id NULL bayiler → Stok & Satış (temel) ─────────────────────────
UPDATE tenants
SET plan_id = (SELECT id FROM subscription_plans WHERE name = 'Stok & Satış' LIMIT 1)
WHERE plan_id IS NULL;

-- ─── 3) DEMO / FAKE bayileri temizle ────────────────────────────────────────
-- istanbul@demo.com, bursa@demo.com, ankara@demo.com gibi demo kayıtları sil.
-- (Gerçek bayilerinizi etkilemez — yalnızca @demo.com uzantılılar.)
DELETE FROM tenant_payments
  WHERE tenant_id IN (SELECT id FROM tenants WHERE email ILIKE '%@demo.com');
DELETE FROM user_profiles
  WHERE tenant_id IN (SELECT id FROM tenants WHERE email ILIKE '%@demo.com');
DELETE FROM tenants WHERE email ILIKE '%@demo.com';

-- ─── 4) Doğrulama ───────────────────────────────────────────────────────────
SELECT 'Paketler' AS tablo, name, price, max_users, is_active
  FROM subscription_plans ORDER BY price;
SELECT 'Bayiler' AS tablo, company_name, email, status FROM tenants ORDER BY created_at DESC;
