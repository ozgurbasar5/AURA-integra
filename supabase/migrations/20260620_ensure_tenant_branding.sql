-- tenants marka sütunları (shop_address hatası için)
-- Supabase SQL Editor'de çalıştırın veya: supabase db push

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS portal_slug text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shop_name text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shop_phone text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shop_address text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shop_logo text;

-- Mevcut address → shop_address (boş olanlar)
UPDATE tenants
SET shop_address = address
WHERE shop_address IS NULL AND address IS NOT NULL AND address <> '';

CREATE UNIQUE INDEX IF NOT EXISTS tenants_portal_slug_key
  ON tenants (portal_slug)
  WHERE portal_slug IS NOT NULL AND portal_slug <> '';

-- İsteğe bağlı: Siparişi olan tenant'a portal slug ata (Supabase SQL Editor)
-- UPDATE tenants SET portal_slug = 'summit'
-- WHERE id = (SELECT tenant_id FROM service_orders WHERE order_no = 'SRV-2606-0001' LIMIT 1)
--   AND (portal_slug IS NULL OR portal_slug = '');

NOTIFY pgrst, 'reload schema';
