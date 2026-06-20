-- Cihaz kabul / atölye detay fotoğrafları (base64 data URL veya public URL)
ALTER TABLE service_orders
  ADD COLUMN IF NOT EXISTS device_images JSONB NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN service_orders.device_images IS 'Cihaz fotoğrafları — string[] JSON (data URL veya storage URL)';
