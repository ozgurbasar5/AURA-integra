-- Platform yenilikleri: süper admin yazar, tüm bayiler okur
CREATE TABLE IF NOT EXISTS platform_yenilikler (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title         TEXT NOT NULL,
  summary       TEXT NOT NULL DEFAULT '',
  content       TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL DEFAULT 'ozellik'
                CHECK (category IN ('ozellik', 'iyilestirme', 'duzeltme', 'duyuru')),
  published     BOOLEAN NOT NULL DEFAULT TRUE,
  published_at  TIMESTAMPTZ DEFAULT NOW(),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_platform_yenilikler_published_at
  ON platform_yenilikler (published_at DESC)
  WHERE published = TRUE;

ALTER TABLE platform_yenilikler ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS yenilikler_read ON platform_yenilikler;
CREATE POLICY yenilikler_read ON platform_yenilikler
  FOR SELECT USING (published = TRUE OR is_super_admin());

DROP POLICY IF EXISTS yenilikler_admin ON platform_yenilikler;
CREATE POLICY yenilikler_admin ON platform_yenilikler
  FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

GRANT SELECT ON platform_yenilikler TO authenticated, anon;
GRANT ALL ON platform_yenilikler TO service_role;

-- Kullanıcı başına okundu takibi (okunmamış rozet için)
CREATE TABLE IF NOT EXISTS platform_yenilik_reads (
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  yenilik_id  UUID NOT NULL REFERENCES platform_yenilikler(id) ON DELETE CASCADE,
  read_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, yenilik_id)
);

ALTER TABLE platform_yenilik_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS yenilik_reads_own ON platform_yenilik_reads;
CREATE POLICY yenilik_reads_own ON platform_yenilik_reads
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, DELETE ON platform_yenilik_reads TO authenticated;

-- İlk örnek kayıtlar
INSERT INTO platform_yenilikler (title, summary, content, category, published, published_at)
SELECT v.title, v.summary, v.content, v.category, v.published, v.published_at
FROM (VALUES
  (
    'Yenilikler sayfası açıldı',
    'Artık platformdaki her yeni özellik ve düzeltmeyi buradan takip edebilirsiniz.',
    '<p>Admin panelinden yayınlanan tüm yenilikler bu sayfada listelenir. Yeni bir sürüm veya iyileştirme çıktığında buradan anında görebilirsiniz.</p><ul><li>Özellikler</li><li>İyileştirmeler</li><li>Düzeltmeler</li><li>Duyurular</li></ul>',
    'duyuru',
    TRUE,
    NOW()
  ),
  (
    'Header''da Yenilikler rozeti',
    'Okunmamış yenilik sayısı üst barda görünür; anasayfada yeni yenilik bandı çıkar.',
    '<p>Bayi panelinde okunmamış yenilikler üst bardaki yıldız ikonunda sayılır. Anasayfada da hızlı erişim bandı vardır.</p>',
    'ozellik',
    TRUE,
    NOW()
  ),
  (
    'Mobil uygulamada Yenilikler',
    'Expo mobil uygulamadan da platform yeniliklerini takip edebilirsiniz.',
    '<p>Ana ekrandaki Yenilikler kartından güncellemeleri okuyabilirsiniz. Okunanlar işaretlenir.</p>',
    'ozellik',
    TRUE,
    NOW()
  )
) AS v(title, summary, content, category, published, published_at)
WHERE NOT EXISTS (
  SELECT 1 FROM platform_yenilikler p WHERE p.title = v.title
);
