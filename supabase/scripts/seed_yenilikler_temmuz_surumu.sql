-- Temmuz sürümü yenilikleri (Bayi + Mobil + Admin + ERP omurga)
-- Idempotent: aynı title varsa atlar

-- Eski pazaryeri duyurusunu kapat
UPDATE platform_yenilikler
SET published = false, updated_at = now()
WHERE title ILIKE '%Pazaryeri%' OR title ILIKE '%n11%' OR title ILIKE '%Trendyol%';

INSERT INTO platform_yenilikler (title, summary, content, category, published, published_at)
SELECT * FROM (VALUES
  (
    'Temmuz sürümü: Bayi, mobil ve admin iyileştirmeleri'::text,
    'Kabul→atölye→POS→kasa zinciri üç yüzeyde güçlendirildi; e-Fatura kuyruk, WhatsApp ve Expo saha ekranları.'::text,
    '<p>Bu güncellemede bayi paneli, Expo mobil ve süper admin operasyonları birlikte geliştirildi.</p><ul><li><strong>Bayi:</strong> e-Fatura kuyruk, WhatsApp Meta Cloud, kasa tüm paketlerde, garanti/randevu/fatura API</li><li><strong>Mobil:</strong> yeni kabul, atölye detay, kasa, barkod, e-posta MFA</li><li><strong>Admin:</strong> e-Fatura cron, AI maliyet widget, operasyon merkezi</li><li><strong>ERP:</strong> servis teslim, alış ve stok sayım omurgası</li></ul>'::text,
    'duyuru'::text,
    true,
    '2026-07-14 13:30:00+00'::timestamptz
  ),
  (
    'e-Fatura kuyruk paneli ve sandbox durumu',
    'Fatura sayfasında bekleyen/işlenen/hatalı kuyruk özeti; admin cron ile efatura-queue manuel tetiklenebilir.',
    '<p>e-Fatura akışı netleştirildi: kuyruk metrikleri, EFATURA_PROVIDER seçimi, Admin → Operasyon → e-Fatura Kuyruk cron.</p>',
    'ozellik', true, '2026-07-14 13:31:00+00'::timestamptz
  ),
  (
    'WhatsApp: Meta Cloud otomatik gönderim',
    'WHATSAPP_ACCESS_TOKEN varsa Meta Cloud kullanılır; yoksa wa.me yalnızca fallback. Servis durum değişiminde otomatik deneme.',
    '<p>Durum bildirimleri WhatsApp kanalına da yazılır. Env: WHATSAPP_PROVIDER, WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID.</p>',
    'ozellik', true, '2026-07-14 13:32:00+00'::timestamptz
  ),
  (
    'Kasa tüm paketlerde (Stok & Satış)',
    'Günlük kasa vardiyası artık Paket 1 ile açılabilir; POS ile aynı katmanda.',
    '<p>Önceden Finans paketinde (L3) olan Kasa rotası Stok &amp; Satış (L1) seviyesine alındı.</p>',
    'iyilestirme', true, '2026-07-14 13:33:00+00'::timestamptz
  ),
  (
    'Expo mobil: kabul, atölye detay, kasa ve barkod',
    'Mobil uygulama tezgahtar akışına derinleşti: yeni servis kabulü, durum güncelleme, kasa aç/kapa, kamera barkod.',
    '<ul><li>Kabul: müşteri, cihaz, IMEI, not</li><li>Atölye: iş detayı ve durum</li><li>Kasa sekmesi</li><li>Satış/Sayım barkod</li><li>E-posta MFA</li></ul><p>PWA alt menüye Sayım eklendi.</p>',
    'ozellik', true, '2026-07-14 13:34:00+00'::timestamptz
  ),
  (
    'Garanti, randevu ve fatura artık API-first',
    'Çok cihazlı bayilerde sync riski azaltıldı; listeler ve kayıtlar sunucu API üzerinden gider.',
    '<p>Store bulk push kapatıldı. Endpointler: /api/tenant/warranties, /api/tenant/appointments, /api/tenant/invoices</p>',
    'iyilestirme', true, '2026-07-14 13:35:00+00'::timestamptz
  ),
  (
    'Admin: AI maliyet, operasyon merkezi, kullanıcı arama',
    'Komuta Merkezinde AI kota/maliyet özeti; Operasyon hub; Auth kullanıcı ara/sil bayiler ekranında.',
    '<ul><li>AI kullanım widget</li><li>/admin/operasyon hub</li><li>Platform ayarları hydrate</li><li>find-user / delete-user UI</li></ul>',
    'ozellik', true, '2026-07-14 13:36:00+00'::timestamptz
  ),
  (
    'Pazaryeri kaldırıldı — ERP omurga önceliği',
    'n11/Trendyol/pazaryeri modülü kaldırıldı. Odak servis teslim, stok, alış ve kasa bütünlüğüne alındı.',
    '<p>E-ticaret pazaryeri entegrasyonu ürün kapsamından çıkarıldı. Teknik servis ERP omurgası güçlendiriliyor: sunucu tarafı teslim, parça düşümü, alış ve stok sayım.</p>',
    'duyuru', true, '2026-07-14 13:38:00+00'::timestamptz
  ),
  (
    'Servis teslim ve stok sayım API-first',
    'Atölye teslimi sunucuda atomik (parça + kasa + finans); alış ve sayım parts API üzerinden.',
    '<p>Endpointler: /api/service-orders/[id]/deliver, /api/service-orders/[id]/use-parts, /api/tenant/purchases, /api/tenant/stock/count</p>',
    'ozellik', true, '2026-07-14 13:39:00+00'::timestamptz
  )
) AS v(title, summary, content, category, published, published_at)
WHERE NOT EXISTS (
  SELECT 1 FROM platform_yenilikler p WHERE p.title = v.title
);

-- Eski Temmuz duyuru metnini ERP odaklıya çek (title aynıysa)
UPDATE platform_yenilikler
SET
  summary = 'Kabul→atölye→POS→kasa zinciri üç yüzeyde güçlendirildi; e-Fatura kuyruk, WhatsApp ve Expo saha ekranları.',
  content = '<p>Bu güncellemede bayi paneli, Expo mobil ve süper admin operasyonları birlikte geliştirildi.</p><ul><li><strong>Bayi:</strong> e-Fatura kuyruk, WhatsApp Meta Cloud, kasa tüm paketlerde, garanti/randevu/fatura API</li><li><strong>Mobil:</strong> yeni kabul, atölye detay, kasa, barkod, e-posta MFA</li><li><strong>Admin:</strong> e-Fatura cron, AI maliyet widget, operasyon merkezi</li><li><strong>ERP:</strong> servis teslim, alış ve stok sayım omurgası</li></ul>',
  updated_at = now()
WHERE title = 'Temmuz sürümü: Bayi, mobil ve admin iyileştirmeleri';
