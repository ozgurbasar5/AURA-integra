-- Bayi başvuruları — tüm kurulumlar için güvenli şema tamamlama
-- Eski/minimal tablolarda eksik sütunları ekler; status yoksa oluşturur

-- Tablo yoksa oluştur
CREATE TABLE IF NOT EXISTS bayi_basvurulari (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  email        TEXT NOT NULL,
  phone        TEXT,
  city         TEXT,
  message      TEXT,
  device_types TEXT[] DEFAULT '{}',
  monthly_service_count TEXT,
  plan_interest TEXT,
  status       TEXT DEFAULT 'beklemede',
  internal_note TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Mevcut tabloya eksik sütunları ekle (sıra önemli: status UPDATE'den önce)
ALTER TABLE bayi_basvurulari ADD COLUMN IF NOT EXISTS company_name TEXT;
ALTER TABLE bayi_basvurulari ADD COLUMN IF NOT EXISTS contact_name TEXT;
ALTER TABLE bayi_basvurulari ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE bayi_basvurulari ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE bayi_basvurulari ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE bayi_basvurulari ADD COLUMN IF NOT EXISTS message TEXT;
ALTER TABLE bayi_basvurulari ADD COLUMN IF NOT EXISTS device_types TEXT[] DEFAULT '{}';
ALTER TABLE bayi_basvurulari ADD COLUMN IF NOT EXISTS plan_interest TEXT;
ALTER TABLE bayi_basvurulari ADD COLUMN IF NOT EXISTS internal_note TEXT;
ALTER TABLE bayi_basvurulari ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE bayi_basvurulari ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'beklemede';
ALTER TABLE bayi_basvurulari ADD COLUMN IF NOT EXISTS monthly_service_count TEXT;

-- monthly_service_count INTEGER ise TEXT'e çevir
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'bayi_basvurulari'
      AND column_name = 'monthly_service_count'
      AND data_type = 'integer'
  ) THEN
    ALTER TABLE bayi_basvurulari
      ALTER COLUMN monthly_service_count TYPE TEXT
      USING monthly_service_count::TEXT;
  END IF;
END $$;

-- Eski İngilizce status değerlerini Türkçeye çevir (status sütunu artık var)
UPDATE bayi_basvurulari SET status = 'beklemede'  WHERE status IS NULL OR status = 'pending';
UPDATE bayi_basvurulari SET status = 'onaylandi'  WHERE status = 'approved';
UPDATE bayi_basvurulari SET status = 'reddedildi' WHERE status = 'rejected';

ALTER TABLE bayi_basvurulari ALTER COLUMN status SET DEFAULT 'beklemede';

ALTER TABLE bayi_basvurulari DROP CONSTRAINT IF EXISTS bayi_basvurulari_status_check;

-- is_super_admin yoksa oluştur (RLS policy için)
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
      AND role = 'super_admin'
      AND COALESCE(is_active, TRUE) = TRUE
  );
$$;

-- RLS
ALTER TABLE bayi_basvurulari ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS public_insert_basvuru ON bayi_basvurulari;
CREATE POLICY public_insert_basvuru ON bayi_basvurulari
  FOR INSERT WITH CHECK (TRUE);

DROP POLICY IF EXISTS admin_read_basvuru ON bayi_basvurulari;
CREATE POLICY admin_read_basvuru ON bayi_basvurulari
  FOR SELECT USING (is_super_admin());

DROP POLICY IF EXISTS basvuru_admin_update ON bayi_basvurulari;
CREATE POLICY basvuru_admin_update ON bayi_basvurulari
  FOR UPDATE USING (is_super_admin()) WITH CHECK (is_super_admin());
