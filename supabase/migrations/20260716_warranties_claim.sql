-- Garanti talep durumu
ALTER TABLE warranties ADD COLUMN IF NOT EXISTS claim_status TEXT DEFAULT 'yok';
