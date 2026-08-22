export interface PlatformYenilik {
  id: string
  title: string
  summary: string
  content: string
  category: 'ozellik' | 'iyilestirme' | 'duzeltme' | 'duyuru'
  published: boolean
  published_at: string
}

export const DEFAULT_PLATFORM_YENILIKLER: PlatformYenilik[] = [
  {
    id: 'yenilik-2026-08-01',
    title: '📱 AURA 2.0 Mobil Operasyon Merkezi & Hızlı İşlemler',
    summary: 'Rol duyarlı ana sayfa, 300ms debounce akıllı küresel arama, 1-tık WhatsApp bildirimleri ve yenilenen mobil atölye.',
    category: 'ozellik',
    published: true,
    published_at: '2026-08-21T12:00:00.000Z',
    content: `
      <h2>AURA 2.0 Mobil Operasyon Deneyimi</h2>
      <p>Mobil saha ve atölye operasyonlarını hızlandırmak için geliştirilen yeni nesil mobil modüller yayında:</p>
      <ul>
        <li><strong>Rol Duyarlı Dashboard:</strong> Teknisyen, Yönetici ve Kasiyer rollerine özel canlı KPI sayaçları ve hızlı aksiyon kartları.</li>
        <li><strong>Küresel Arama 2.0:</strong> 300ms debounce, otomatik IMEI format tanıma ve kamera ile anlık barkod tarama.</li>
        <li><strong>1-Tık İletişim:</strong> Müşteriye anında WhatsApp servis kabul/durum fişi gönderme ve tek tıkla arama başlatma.</li>
        <li><strong>Hızlı Servis Kabul:</strong> 3 adımda cihaz kabulü, otomatik arıza şablonları ve termal fiş yazdırma.</li>
      </ul>
    `,
  },
  {
    id: 'yenilik-2026-08-02',
    title: '🌐 Müşteri Self-Servis Portalı 2.0',
    summary: 'Canlı tamir zaman çizelgesi, 1-tık online teklif onayı, garanti sertifikaları ve müşteri arıza talepleri.',
    category: 'ozellik',
    published: true,
    published_at: '2026-08-20T10:00:00.000Z',
    content: `
      <h2>Yeni Nesil Müşteri Portalı</h2>
      <p>Müşterilerinizin cihaz süreçlerini şeffaf ve güvenli bir şekilde takip edebileceği portal yenilendi:</p>
      <ul>
        <li><strong>Canlı Süreç Takibi:</strong> Cihazın tüm atölye aşamaları (Kabul → Teşhis → Teklif → Onarım → Kalite Kontrol → Teslimat) adım adım izlenir.</li>
        <li><strong>1-Tık Teklif Onayı:</strong> Müşteri yedek parça ve işçilik detaylarını inceleyip tek tıkla onaylayabilir veya reddedebilir.</li>
        <li><strong>Garanti & Sertifikalar:</strong> Aktif garanti süreleri, kalan gün sayacı ve online garanti talep formu.</li>
        <li><strong>Gizlilik Koruması:</strong> Dahili teknisyen notları ve maliyet bilgileri gizli tutulur.</li>
      </ul>
    `,
  },
  {
    id: 'yenilik-2026-08-03',
    title: '💰 Kasa & Çoklu Hesap Yönetimi (Kasa 2.0)',
    summary: 'Nakit, Banka, POS ve Kredi Kartı hesapları, çift taraflı muhasebe kayıtları ve gün sonu mutabakatı.',
    category: 'ozellik',
    published: true,
    published_at: '2026-08-19T09:00:00.000Z',
    content: `
      <h2>Finans ve Kasa 2.0 Altyapısı</h2>
      <p>İşletmenizin nakit akışını eksiksiz kontrol altına alan profesyonel finans modülü:</p>
      <ul>
        <li><strong>Çoklu Hesap Desteği:</strong> Ana Kasa (Nakit), Banka Hesapları, POS Terminalleri ve Kredi Kartları tek merkezden yönetilir.</li>
        <li><strong>Çift Taraflı Muhasebe (Ledger):</strong> Her gelir/gider işleminde otomatik borç-alacak yevmiye kaydı oluşturulur.</li>
        <li><strong>Virman & Transfer:</strong> Kasa ile banka veya POS hesapları arasında kolay para transferi ve likidite özeti.</li>
        <li><strong>Gün Sonu & Z-Raporu:</strong> Kasa devir farkı kontrolü ve vardiya sonu mutabakat raporları.</li>
      </ul>
    `,
  },
  {
    id: 'yenilik-2026-08-04',
    title: '⚡ Süper Admin Kontrol Merkezi 2.0 & Komuta Paleti',
    summary: 'Ctrl+K / Cmd+K komuta paleti, rol yetki matrisi, canlı sistem KPI ve alarm merkezi.',
    category: 'iyilestirme',
    published: true,
    published_at: '2026-08-18T14:30:00.000Z',
    content: `
      <h2>Süper Admin Kontrol Merkezi</h2>
      <p>Yöneticiler için merkezi kontrol ve hızlı yönetim araçları eklendi:</p>
      <ul>
        <li><strong>Komuta Paleti (Ctrl+K):</strong> Bayi, kullanıcı, ayar ve sayfalara klavyeden saniyeler içinde erişim.</li>
        <li><strong>Detaylı Rol Matrisi:</strong> Personel rollerine göre modül bazlı okuma/yazma yetkilendirmesi.</li>
        <li><strong>Sistem Alarm Merkezi:</strong> Abonelik süreleri, SMS/WhatsApp kotaları ve veritabanı sağlık kontrolleri.</li>
      </ul>
    `,
  },
  {
    id: 'yenilik-2026-08-05',
    title: '🛡️ Senkronizasyon & Profil Onarımı İyileştirmeleri',
    summary: 'Bayi profili doğrulama, otomatik profil bağlama, giriş ekranı sadeleştirmesi ve güvenli offline veri akışı.',
    category: 'duzeltme',
    published: true,
    published_at: '2026-08-17T11:00:00.000Z',
    content: `
      <h2>Hata Düzeltmeleri & Kararlılık</h2>
      <p>Kullanıcı deneyimini güçlendiren altyapı güncellemeleri tamamlandı:</p>
      <ul>
        <li><strong>Otomatik Profil Onarımı:</strong> Giriş yapan kullanıcılar için bayi profili bulunamama hatası giderildi; yetkili hesaplar otomatik olarak aktif bayiye bağlanır.</li>
        <li><strong>Giriş Ekranı İyileştirmesi:</strong> Giriş sayfasındaki geliştirici uyarıları temizlendi ve arayüz sadeleştirildi.</li>
        <li><strong>Senkronizasyon Kararlılığı:</strong> Çevrimdışı ve çevrimiçi geçişlerinde veri kaybını önleyen güvenli senkronizasyon motoru güncellendi.</li>
        <li><strong>TCMB Döviz Entegrasyonu:</strong> Ağ kesintilerinde otomatik güvenli kur desteği devreye alındı.</li>
      </ul>
    `,
  },
]
