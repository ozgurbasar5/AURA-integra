-- Tenant marka alanları (AURA İntegra)
-- Supabase SQL Editor'de çalıştırın

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS portal_slug text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shop_name text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shop_phone text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shop_address text;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS shop_logo text;

CREATE UNIQUE INDEX IF NOT EXISTS tenants_portal_slug_key ON tenants (portal_slug) WHERE portal_slug IS NOT NULL AND portal_slug <> '';

COMMENT ON COLUMN tenants.portal_slug IS 'Müşteri takip URL slug — /takip?shop=slug';
COMMENT ON COLUMN tenants.shop_logo IS 'Base64 data URL veya public URL';
