-- Bayi başvuruları: legacy Türkçe sütunları yeni İngilizce sütunlarla senkronize et
-- Canlı DB'de sirket_adi / yetkili_kisi / telefon NOT NULL kalabilir; trigger ile çift yazım gerekmez

CREATE OR REPLACE FUNCTION sync_bayi_basvuru_columns()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.company_name IS NOT NULL AND (NEW.sirket_adi IS NULL OR NEW.sirket_adi = '') THEN
    NEW.sirket_adi := NEW.company_name;
  END IF;
  IF NEW.sirket_adi IS NOT NULL AND (NEW.company_name IS NULL OR NEW.company_name = '') THEN
    NEW.company_name := NEW.sirket_adi;
  END IF;
  IF NEW.contact_name IS NOT NULL AND (NEW.yetkili_kisi IS NULL OR NEW.yetkili_kisi = '') THEN
    NEW.yetkili_kisi := NEW.contact_name;
  END IF;
  IF NEW.yetkili_kisi IS NOT NULL AND (NEW.contact_name IS NULL OR NEW.contact_name = '') THEN
    NEW.contact_name := NEW.yetkili_kisi;
  END IF;
  IF NEW.phone IS NOT NULL AND (NEW.telefon IS NULL OR NEW.telefon = '') THEN
    NEW.telefon := NEW.phone;
  END IF;
  IF NEW.telefon IS NOT NULL AND (NEW.phone IS NULL OR NEW.phone = '') THEN
    NEW.phone := NEW.telefon;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_bayi_basvuru_columns ON bayi_basvurulari;
CREATE TRIGGER trg_sync_bayi_basvuru_columns
  BEFORE INSERT OR UPDATE ON bayi_basvurulari
  FOR EACH ROW EXECUTE FUNCTION sync_bayi_basvuru_columns();

-- Eksik legacy sütunları ekle (varsa atla)
ALTER TABLE bayi_basvurulari ADD COLUMN IF NOT EXISTS sirket_adi TEXT;
ALTER TABLE bayi_basvurulari ADD COLUMN IF NOT EXISTS yetkili_kisi TEXT;
ALTER TABLE bayi_basvurulari ADD COLUMN IF NOT EXISTS telefon TEXT;
