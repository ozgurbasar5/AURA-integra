-- Kullanıcı onboarding turu tamamlama bayrağı
-- İlk girişte driver.js turu otomatik başlar; tamamlanınca veya atlanınca true olur.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN user_profiles.onboarding_completed IS
  'Dashboard interaktif turunun tamamlandığını gösterir; false ise ilk yüklemede tur başlar.';
