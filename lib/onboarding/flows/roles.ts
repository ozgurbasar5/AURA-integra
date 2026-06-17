import { el, navStep, type SystemTourStep } from '../tour-types'

export const TECHNICIAN_FLOW: SystemTourStep[] = [
  navStep('/dashboard', 'Anasayfa', 'İş Kuyruğunuz', 'Size atanan tamirler ve günlük özet burada.'),
  el('/dashboard', 'dashboard-servis-akisi', 'Anasayfa', 'Servis Durumları', 'Bekleyen, tamirde ve hazır iş sayıları.'),
  el('/dashboard', 'servis-arama', 'Anasayfa', 'Hızlı Arama', 'IMEI veya servis no ile kayıt bulun.'),

  navStep('/dashboard/atolye', 'Atölye', 'Tamir Masası', 'Tüm açık işleriniz burada.', undefined, 2),
  el('/dashboard/atolye', 'atolye-filtreler', 'Atölye', 'Durum Filtreleri', 'Sadece tamirde veya hazır işleri gösterin.', undefined, 2),
  el('/dashboard/atolye', 'atolye-icerik', 'Atölye', 'İş Kartları', 'Karta tıklayınca parça ekleme ve durum güncelleme açılır.', undefined, 2),

  navStep('/dashboard/stok', 'Stok', 'Parça Deposu', 'Atölyede kullanacağınız parçaları buradan arayın.'),
  el('/dashboard/stok', 'stok-filtreler', 'Stok', 'Parça Arama', 'Marka ve barkod ile uyumlu parça bulun.'),
  el('/dashboard/stok', 'stok-giris-btn', 'Stok', 'Stok Girişi', 'Tedarik gelince + Giriş ile adet ekleyin; maliyet finansa yansır.'),

  navStep('/dashboard/yapilacaklar', 'Yapılacaklar', 'Görev Listesi', 'Yöneticinin atadığı işler.', undefined, 2),
  el('/dashboard/yapilacaklar', 'todo-liste', 'Yapılacaklar', 'Görevler', 'Öncelikli görevleri tamamlayıp işaretleyin.', undefined, 2),

  navStep('/dashboard/tedarik', 'Tedarik', 'Parça Siparişi', 'Stokta yoksa tedarikçiye sipariş.', undefined, 2),
  el('/dashboard/tedarik', 'tedarik-yeni-btn', 'Tedarik', 'Yeni Sipariş', 'Eksik parça için sipariş açın.', undefined, 2),

  navStep('/dashboard/ayarlar', 'Ayarlar', 'Kişisel Ayarlar', 'Tema ve bildirim tercihleri.'),
  el('/dashboard/ayarlar', 'ayarlar-tema-secim', 'Ayarlar', 'Tema', 'Koyu/açık mod seçin.'),
]

export const SALES_FLOW: SystemTourStep[] = [
  navStep('/dashboard', 'Anasayfa', 'Satış Paneli', 'Günlük satış özeti ve hızlı işlemler.'),
  el('/dashboard', 'dashboard-hizli-islemler', 'Anasayfa', 'Hızlı İşlemler', 'Kabul ve POS kısayolları.'),

  navStep('/dashboard/kabul', 'Hızlı Kabul', 'Servis Kabul', 'Müşteri cihaz teslimi kaydı.'),
  el('/dashboard/kabul', 'kabul-form', 'Hızlı Kabul', 'Kabul Formu', 'Müşteri + cihaz bilgisi girin.'),
  el('/dashboard/kabul', 'kabul-kayit-btn', 'Hızlı Kabul', 'Kayıt Oluştur', 'Fiş ve SMS otomatik hazırlanır.'),

  navStep('/dashboard/satis', 'Satış & POS', 'POS Ekranı', 'Barkodla satış yapın.'),
  el('/dashboard/satis', 'satis-arama', 'Satış & POS', 'Ürün Ara', 'Barkod okutun veya isim yazın.'),
  el('/dashboard/satis', 'satis-odeme-yontemi', 'Satış & POS', 'Ödeme', 'Nakit/kart/havale seçin.'),
  el('/dashboard/satis', 'satis-tamamla-btn', 'Satış & POS', 'Satışı Tamamla', 'Stok düşer, kasa güncellenir.'),

  navStep('/dashboard/stok', 'Stok', 'Stok Kontrol', 'Satış öncesi stok sorgulama.'),
  el('/dashboard/stok', 'stok-filtreler', 'Stok', 'Arama', 'Ürün ve barkod arayın.'),

  navStep('/dashboard/musteriler', 'Müşteriler', 'Müşteri Kartı', 'Geçmiş ve iletişim.'),
  el('/dashboard/musteriler', 'musteri-arama', 'Müşteriler', 'Ara', 'Telefon ile müşteri bulun.'),
]

export const KASIYER_FLOW: SystemTourStep[] = [
  ...SALES_FLOW.filter(s => s.route !== '/dashboard/musteriler'),
  navStep('/dashboard/kasa', 'Kasa', 'Kasa & Vardiya', 'Nakit takibi ve vardiya.', undefined, 3),
  el('/dashboard/kasa', 'kasa-vardiya-ac-btn', 'Kasa', 'Vardiya Aç', 'Sabah açılış bakiyesi girin.', undefined, 3),
  el('/dashboard/kasa', 'kasa-vardiya-kapat-btn', 'Kasa', 'Vardiya Kapat', 'Akşam sayım ve Z raporu.', undefined, 3),
  navStep('/dashboard/musteriler', 'Müşteriler', 'Müşteri', 'Hızlı telefon araması.'),
  el('/dashboard/musteriler', 'musteri-arama', 'Müşteriler', 'Ara', 'Telefon ile bulun.'),
]

export const MUHASEBE_FLOW: SystemTourStep[] = [
  navStep('/dashboard', 'Anasayfa', 'Finans Özeti', 'Günlük kasa ve gelir kartları.'),
  el('/dashboard', 'dashboard-metrikler', 'Anasayfa', 'Metrikler', 'Kasa bakiye ve günlük gelir.'),

  navStep('/dashboard/finans', 'Finans', 'Gelir/Gider', 'Tüm hareketler.', undefined, 3),
  el('/dashboard/finans', 'finans-tablo', 'Finans', 'Hareket Tablosu', 'Kategori ve dönem filtreli liste.', undefined, 3),
  el('/dashboard/finans', 'finans-grafik', 'Finans', 'Trend Grafiği', '6 aylık gelir-gider.', undefined, 3),

  navStep('/dashboard/kasa', 'Kasa', 'Vardiya Raporları', 'Kapanan vardiyalar.', undefined, 3),
  el('/dashboard/kasa', 'kasa-gecmis', 'Kasa', 'Geçmiş', 'Sayım farkları ve detay.', undefined, 3),

  navStep('/dashboard/raporlar', 'Raporlar', 'İşletme Raporları', 'Kârlılık analizi.', undefined, 3),
  el('/dashboard/raporlar', 'rapor-excel-btn', 'Raporlar', 'Dışa Aktar', 'Excel/PDF indirin.', undefined, 3),

  navStep('/dashboard/fatura', 'E-Fatura', 'E-Fatura', 'Resmi belgeler.', undefined, 3),
  el('/dashboard/fatura', 'fatura-tablo', 'E-Fatura', 'Fatura Listesi', 'Durum ve arşiv.', undefined, 3),
]
