-- Kurulum sihirbazı + interaktif tur — kullanıcı başına bir kez
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS setup_wizard_completed BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN user_profiles.setup_wizard_completed IS
  'Kurulum sihirbazı tamamlandı/atlandı; false ise ilk girişte bir kez gösterilir.';

-- onboarding_completed zaten 20260625_onboarding_flag.sql ile eklenmiş olmalı
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT false;
