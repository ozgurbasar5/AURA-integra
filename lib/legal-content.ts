export const LEGAL_COMPANY = {
  name: 'AURA Bilişim Teknolojileri',
  email: 'destek@aurabilisim.net',
  web: 'https://aurabilisim.net',
  app: 'AURA İntegra',
  updated: '17 Haziran 2026',
} as const

export const PRIVACY_SECTIONS = [
  {
    title: '1. Veri Sorumlusu',
    body: `${LEGAL_COMPANY.name}, ${LEGAL_COMPANY.app} bulut ERP hizmeti kapsamında kişisel verilerinizin veri sorumlusudur. İletişim: ${LEGAL_COMPANY.email}`,
  },
  {
    title: '2. Toplanan Veriler',
    body: 'Bayi hesap bilgileri (ad, e-posta, telefon), müşteri ve servis kayıtları, stok/finans işlem verileri, bildirim logları ve teknik oturum bilgileri işlenir.',
  },
  {
    title: '3. İşleme Amaçları',
    body: 'Hizmet sunumu, teknik destek, faturalandırma, güvenlik, yasal yükümlülükler ve sistem iyileştirmesi amacıyla veriler işlenir.',
  },
  {
    title: '4. Saklama Süresi',
    body: 'Veriler hizmet süresi boyunca ve yasal saklama yükümlülükleri kapsamında tutulur. Hesap kapatıldığında makul süre içinde silinir veya anonimleştirilir.',
  },
  {
    title: '5. Üçüncü Taraflar',
    body: 'Altyapı: Supabase (veritabanı), Vercel (barındırma). Ödeme: Stripe/iyzico. SMS: Netgsm. Bu sağlayıcılarla veri işleme sözleşmeleri uygulanır.',
  },
  {
    title: '6. Haklarınız',
    body: 'KVKK md. 11 kapsamında erişim, düzeltme, silme, itiraz ve taşınabilirlik taleplerinizi destek@aurabilisim.net adresine iletebilirsiniz.',
  },
] as const

export const TERMS_SECTIONS = [
  {
    title: '1. Hizmet Tanımı',
    body: `${LEGAL_COMPANY.app}, teknik servis ve bayi işletmeleri için stok, atölye, kasa ve müşteri yönetimi sunan abonelik tabanlı bir SaaS ürünüdür.`,
  },
  {
    title: '2. Hesap ve Güvenlik',
    body: 'Bayi yöneticisi hesap güvenliğinden sorumludur. Yetkisiz erişim derhal bildirilmelidir.',
  },
  {
    title: '3. Abonelik ve Ödeme',
    body: 'Paket ücretleri aylık/yıllık olarak faturalandırılır. Deneme süresi sonunda ödeme yapılmazsa erişim kısıtlanabilir.',
  },
  {
    title: '4. Kabul Edilebilir Kullanım',
    body: 'Hizmet yalnızca yasal ticari faaliyetler için kullanılabilir. Kötüye kullanım, spam veya güvenlik ihlali hesabın askıya alınmasına yol açar.',
  },
  {
    title: '5. Sorumluluk Sınırı',
    body: 'Hizmet "olduğu gibi" sunulur. Veri yedekleme sorumluluğu kullanıcıya aittir; kritik işlemler için düzenli export önerilir.',
  },
  {
    title: '6. Fesih',
    body: 'Taraflar yazılı bildirimle sözleşmeyi feshedebilir. Fesih sonrası veri export talebi 30 gün içinde değerlendirilir.',
  },
] as const

export const KVKK_SECTIONS = [
  {
    title: 'Veri Sorumlusu Kimliği',
    body: `${LEGAL_COMPANY.name} — ${LEGAL_COMPANY.email} — ${LEGAL_COMPANY.web}`,
  },
  {
    title: 'Kişisel Verilerin İşlenme Amacı',
    body: 'Bayi ve son kullanıcı (müşteri) verileri; servis takibi, stok yönetimi, faturalandırma, SMS/e-posta bildirimleri ve yasal yükümlülükler için işlenir.',
  },
  {
    title: 'Hukuki Sebep',
    body: 'KVKK md. 5/2 (c) sözleşmenin kurulması ve ifası, (f) meşru menfaat, (ç) hukuki yükümlülük ve açık rıza (bildirim tercihleri) kapsamında.',
  },
  {
    title: 'Aktarım',
    body: 'Veriler Türkiye ve AB uyumlu bulut altyapısında saklanır. Yurt dışı aktarım gerektiğinde KVKK md. 9 hükümleri uygulanır.',
  },
  {
    title: 'İlgili Kişi Hakları',
    body: 'Başvurularınızı destek@aurabilisim.net üzerinden iletebilirsiniz. Yanıt süresi en geç 30 gündür.',
  },
] as const
