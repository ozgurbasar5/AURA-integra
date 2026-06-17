import { el, navStep, pageStep, type SystemTourStep } from '../tour-types'

/** İşletmeci — kısa metin, sayfa + buton mantığı */
export const OWNER_FLOW: SystemTourStep[] = [
  // Anasayfa
  navStep('/dashboard', 'Anasayfa', 'Anasayfa', 'Günlük özet: satış, servis, stok ve kasa.'),
  el('/dashboard', 'dashboard-hizli-islemler', 'Anasayfa', 'Hızlı İşlemler', 'Sık kullanılan modüllere tek tıkla geçiş.'),
  el('/dashboard', 'dashboard-metrikler', 'Anasayfa', 'Metrikler', 'Anlık satış, servis ve kasa rakamları.'),
  el('/dashboard', 'servis-arama', 'Anasayfa', 'Servis Arama', 'IMEI veya telefon ile kayıt bul.'),

  // Kabul
  navStep('/dashboard/kabul', 'Hızlı Kabul', 'Hızlı Kabul', 'Cihaz tesliminde servis kaydı açılır.'),
  el('/dashboard/kabul', 'kabul-form', 'Hızlı Kabul', 'Kabul Formu', 'Müşteri, telefon ve cihaz bilgilerini gir.'),
  el('/dashboard/kabul', 'kabul-kayit-btn', 'Hızlı Kabul', 'Kaydı Oluştur', 'İş emri açar; SMS ve fiş hazırlar.'),
  el('/dashboard/kabul', 'kabul-onizleme', 'Hızlı Kabul', 'Önizleme', 'Fiş yazdır veya WhatsApp gönder.'),

  // Satış
  navStep('/dashboard/satis', 'Satış & POS', 'Satış & POS', 'Barkodlu satış; stok ve kasa otomatik güncellenir.'),
  el('/dashboard/satis', 'satis-arama', 'Satış & POS', 'Ürün Ara', 'Barkod okut, sepete ekle.'),
  el('/dashboard/satis', 'satis-odeme-yontemi', 'Satış & POS', 'Ödeme Tipi', 'Nakit, kart veya havale seç.'),
  el('/dashboard/satis', 'satis-tamamla-btn', 'Satış & POS', 'Satışı Tamamla', 'Stok düşer, kasaya yazar.'),

  // Atölye
  navStep('/dashboard/atolye', 'Teknik Servis', 'Teknik Servis', 'Açık tamir işleri ve durum takibi.', undefined, 2),
  el('/dashboard/atolye', 'atolye-yeni-servis-btn', 'Teknik Servis', 'Yeni Servis', 'Manuel servis kaydı aç.', undefined, 2),
  el('/dashboard/atolye', 'atolye-icerik', 'Teknik Servis', 'İş Listesi', 'Karta tıkla: durum güncelle, parça ekle.', undefined, 2),

  // Stok
  navStep('/dashboard/stok', 'Stok', 'Stok', 'Parça envanteri ve barkod yönetimi.'),
  el('/dashboard/stok', 'stok-yeni-parca-btn', 'Stok', 'Yeni Parça', 'Yeni parça tanımla; barkod otomatik üretilir.'),
  el('/dashboard/stok', 'stok-filtreler', 'Stok', 'Arama & Filtre', 'Parça adı veya barkod ile ara.'),
  el('/dashboard/stok', 'stok-giris-btn', 'Stok', '+ Giriş', 'Tedarik gelen adedi ekle; maliyet finansa gider.'),
  el('/dashboard/stok', 'stok-sayim-link', 'Stok', 'Stok Sayım', 'Fiziksel sayım ile sistemi karşılaştır.'),

  navStep('/dashboard/stok/sayim', 'Stok Sayım', 'Stok Sayım', 'Raftaki adet ile sistem kaydını eşleştir.'),
  el('/dashboard/stok/sayim', 'sayim-kaydet-btn', 'Stok Sayım', 'Sayımı Kaydet', 'Farkları onayla, stoğu güncelle.'),

  // Kasa
  navStep('/dashboard/kasa', 'Kasa', 'Kasa & Vardiya', 'Günlük nakit takibi ve vardiya.', undefined, 3),
  el('/dashboard/kasa', 'kasa-vardiya-ac-btn', 'Kasa', 'Vardiya Aç', 'Sabah kasa açılış tutarını gir.', undefined, 3),
  el('/dashboard/kasa', 'kasa-vardiya-kapat-btn', 'Kasa', 'Vardiya Kapat', 'Akşam sayım yap, Z raporu al.', undefined, 3),

  // Finans
  navStep('/dashboard/finans', 'Finans', 'Gelir / Gider', 'Tüm para hareketleri burada.', undefined, 3),
  el('/dashboard/finans', 'finans-gelir-btn', 'Finans', 'Gelir Ekle', 'Manuel gelir kaydı gir.', undefined, 3),
  el('/dashboard/finans', 'finans-gider-btn', 'Finans', 'Gider Ekle', 'Kira, maaş vb. gider kaydı.', undefined, 3),
  el('/dashboard/finans', 'finans-tablo', 'Finans', 'Hareket Listesi', 'Gelir-gider geçmişini filtrele.', undefined, 3),

  // Müşteriler
  navStep('/dashboard/musteriler', 'Müşteriler', 'Müşteriler', 'Müşteri kartı ve servis geçmişi.'),
  el('/dashboard/musteriler', 'musteri-yeni-btn', 'Müşteriler', 'Yeni Müşteri', 'Manuel müşteri kartı oluştur.'),
  el('/dashboard/musteriler', 'musteri-arama', 'Müşteriler', 'Ara', 'Telefon veya isimle bul.'),
  el('/dashboard/musteriler', 'musteri-tablo', 'Müşteriler', 'Liste', 'Satıra tıkla, geçmişi gör.'),

  // Raporlar
  navStep('/dashboard/raporlar', 'Raporlar', 'Raporlar', 'Kâr, satış ve performans analizi.', undefined, 3),
  el('/dashboard/raporlar', 'rapor-sekmeler', 'Raporlar', 'Sekmeler', 'Analitik grafikler veya gün sonu listesi.', undefined, 3),
  el('/dashboard/raporlar', 'rapor-excel-btn', 'Raporlar', 'Dışa Aktar', 'Excel veya PDF indir.', undefined, 3),

  // Personel
  navStep('/dashboard/personel', 'Personel', 'Çalışanlar', 'Ekip, rol ve yetki yönetimi.', undefined, 2),
  el('/dashboard/personel', 'personel-yeni-btn', 'Personel', 'Yeni Personel', 'Davet gönder, rol ata.', undefined, 2),
  navStep('/dashboard/komisyon', 'Komisyon', 'Komisyon', 'Personel prim hesabı.', undefined, 2),

  // Bildirimler
  navStep('/dashboard/bildirimler', 'Bildirimler', 'Bildirimler', 'SMS ve bildirim geçmişi.'),
  el('/dashboard/bildirimler', 'bildirim-gonder-btn', 'Bildirimler', 'Bildirim Gönder', 'Tekil veya toplu SMS gönder.'),

  // Alış & Tedarik
  navStep('/dashboard/alis', 'Alış', 'Alış', 'Cihaz alım kayıtları.'),
  el('/dashboard/alis', 'alis-yeni-btn', 'Alış', 'Yeni Alış', 'Alınan cihazı kaydet.'),
  navStep('/dashboard/tedarik', 'Tedarik', 'Tedarik', 'Eksik parça siparişi.', undefined, 2),
  el('/dashboard/tedarik', 'tedarik-yeni-btn', 'Tedarik', 'Yeni Sipariş', 'Tedarikçiye sipariş aç.', undefined, 2),

  // Mağaza & Vitrin
  navStep('/dashboard/magaza', 'Mağaza', 'Mağaza', 'Satış ürün kataloğu.', undefined, 3),
  el('/dashboard/magaza', 'magaza-urun-ekle-btn', 'Mağaza', 'Ürün Ekle', 'POS\'ta satılacak ürün ekle.', undefined, 3),
  navStep('/dashboard/vitrin', 'Vitrin', 'Vitrin', 'Teşhir cihazları.', undefined, 3),
  el('/dashboard/vitrin', 'vitrin-cihaz-ekle-btn', 'Vitrin', 'Cihaz Ekle', 'Vitrine cihaz koy.', undefined, 3),

  // Randevu, Garanti, Yapılacaklar, Fatura
  navStep('/dashboard/randevu', 'Randevu', 'Randevular', 'Müşteri randevu planı.', undefined, 2),
  el('/dashboard/randevu', 'randevu-yeni-btn', 'Randevu', 'Yeni Randevu', 'Tarih ve müşteri ile randevu oluştur.', undefined, 2),
  navStep('/dashboard/garanti', 'Garanti', 'Garanti', 'Garanti süresi takibi.', undefined, 2),
  navStep('/dashboard/yapilacaklar', 'Yapılacaklar', 'Yapılacaklar', 'Ekip görev listesi.', undefined, 2),
  navStep('/dashboard/fatura', 'E-Fatura', 'E-Fatura', 'Resmi fatura kesimi.', undefined, 3),
  el('/dashboard/fatura', 'fatura-yeni-btn', 'E-Fatura', 'Yeni Fatura', 'Fatura oluştur veya gönder.', undefined, 3),

  // Ayarlar
  navStep('/dashboard/ayarlar', 'Ayarlar', 'Ayarlar', 'Marka, tema ve entegrasyonlar.'),
  el('/dashboard/ayarlar', 'ayarlar-genel-marka', 'Ayarlar', 'Marka & Logo', 'Dükkan adı ve logo; fişlerde görünür.'),
  el('/dashboard/ayarlar', 'ayarlar-tema-secim', 'Ayarlar', 'Tema', 'Koyu/açık mod ve renk.'),
  el('/dashboard/ayarlar', 'ayarlar-tur-tekrar-btn', 'Ayarlar', 'Turu Tekrar Başlat', 'Bu turu istediğin zaman yeniden çalıştır.'),
  pageStep('/dashboard/ayarlar', 'Ayarlar', 'Tur Bitti', 'Günlük akış: Kabul → Atölye → Satış → Kasa kapanışı.'),
]
