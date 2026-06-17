-- Dokümantasyon sayfaları — dashboard fallback yerine Supabase kaynağı

INSERT INTO documentation_pages (slug, title, content, category, sort_order, is_published)
VALUES
(
  'teknik-servis-giris',
  'Teknik Servise Giriş',
  '<h2>Teknik Servis Modülü</h2><p>Cihaz kabul, teşhis, tamir ve teslim sürecini uçtan uca yönetin.</p><h3>Servis Akışı</h3><ol><li>Cihaz Kabul</li><li>Teşhis</li><li>Müşteri Onayı</li><li>Tamir</li><li>Kalite Kontrol</li><li>Teslim</li></ol>',
  'teknik-servis',
  1,
  TRUE
),
(
  'stok-yonetimi',
  'Stok & Envanter',
  '<h2>Stok & Tedarik Modülü</h2><p>Parça envanterinizi, tedarikçilerinizi ve sipariş süreçlerinizi tek ekranda yönetin.</p>',
  'stok',
  2,
  TRUE
),
(
  'finans-muhasebe',
  'Finans ve Kasa',
  '<h2>Finans Modülü</h2><p>Gelir/gider takibi, kasa yönetimi ve finansal raporlamayı tek ekranda yönetin.</p>',
  'finans',
  3,
  TRUE
),
(
  'musteri-portali',
  'Müşteri Portali',
  '<h2>Müşteri Portali</h2><p>Bayi slug adresi ile müşterileriniz servis durumunu takip edebilir.</p>',
  'portal',
  4,
  TRUE
),
(
  'kullanici-yonetimi',
  'Kullanıcı ve Roller',
  '<h2>Kullanıcı Yönetimi</h2><p>Personel hesapları, roller ve yetkiler bu modülden yönetilir.</p>',
  'kullanici',
  5,
  TRUE
),
(
  'admin-kilavuzu',
  'Admin Kılavuzu',
  '<h2>Platform Yönetimi</h2><p>Super admin paneli ile bayiler, paketler ve platform ayarları yönetilir.</p>',
  'admin',
  6,
  TRUE
)
ON CONFLICT (slug) DO NOTHING;
