-- Manuel çalıştırma (Supabase SQL Editor): son Yenilikler UX kayıtları
INSERT INTO platform_yenilikler (title, summary, content, category, published, published_at)
SELECT v.title, v.summary, v.content, v.category, TRUE, NOW()
FROM (VALUES
  (
    'Header''da Yenilikler rozeti',
    'Okunmamış yenilik sayısı üst barda görünür; anasayfada yeni yenilik bandı çıkar.',
    '<p>Bayi panelinde okunmamış yenilikler üst bardaki yıldız ikonunda sayılır. Anasayfada da hızlı erişim bandı vardır.</p>',
    'ozellik'
  ),
  (
    'Mobil uygulamada Yenilikler',
    'Expo mobil uygulamadan da platform yeniliklerini takip edebilirsiniz.',
    '<p>Ana ekrandaki Yenilikler kartından güncellemeleri okuyabilirsiniz. Okunanlar işaretlenir.</p>',
    'ozellik'
  )
) AS v(title, summary, content, category)
WHERE NOT EXISTS (
  SELECT 1 FROM platform_yenilikler p WHERE p.title = v.title
);
