// lib/constants.ts — ServisSoft ERP sabit değerler ve durum makinesi

// ─── Servis Durumları — Tam State Machine ───────────────────────────────────

export interface StatusConfig {
  label: string
  color: string
  bg: string
  text: string
  border: string
  dot: string
  next: string[]          // izin verilen sonraki durumlar
  requiresNote?: boolean  // geçiş notu zorunlu mu
  smsEvent?: string       // bu duruma geçişte tetiklenen SMS event
}

export const SERVICE_STATUSES: Record<string, StatusConfig> = {
  teslim_alindi: {
    label: 'Teslim Alındı', color: 'slate',
    bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', dot: 'bg-slate-400',
    next: ['teshis_bekleniyor', 'iptal'],
    smsEvent: 'order_created',
  },
  teshis_bekleniyor: {
    label: 'Teşhis Bekleniyor', color: 'blue',
    bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500',
    next: ['teshis_yapildi', 'tamir_edilemez', 'iptal'],
  },
  teshis_yapildi: {
    label: 'Teşhis Yapıldı', color: 'blue',
    bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-600',
    next: ['musteri_onay_bekleniyor', 'tamir_edilemez'],
    requiresNote: true,
    smsEvent: 'diagnosis_done',
  },
  musteri_onay_bekleniyor: {
    label: 'Müşteri Onayı Bekleniyor', color: 'amber',
    bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500',
    next: ['onaylandi', 'musteri_reddetti'],
    smsEvent: 'approval_request',
  },
  onaylandi: {
    label: 'Müşteri Onayladı', color: 'emerald',
    bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500',
    next: ['teknisyen_atandi', 'onarimda'],
  },
  teknisyen_atandi: {
    label: 'Teknisyen Atandı', color: 'indigo',
    bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', dot: 'bg-sky-500',
    next: ['parca_kontrol', 'onarimda'],
  },
  parca_kontrol: {
    label: 'Parça Kontrol', color: 'orange',
    bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', dot: 'bg-orange-500',
    next: ['parca_sipariste', 'onarimda'],
  },
  parca_sipariste: {
    label: 'Parça Siparişte', color: 'orange',
    bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', dot: 'bg-orange-600',
    next: ['parca_geldi'],
  },
  parca_geldi: {
    label: 'Parça Geldi', color: 'teal',
    bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500',
    next: ['onarimda'],
  },
  onarimda: {
    label: 'Onarımda', color: 'indigo',
    bg: 'bg-sky-100', text: 'text-sky-900', border: 'border-sky-300', dot: 'bg-sky-600',
    next: ['onarim_duraklatildi', 'kalite_kontrol', 'tamamlandi'],
  },
  onarim_duraklatildi: {
    label: 'Onarım Duraklatıldı', color: 'yellow',
    bg: 'bg-yellow-50', text: 'text-yellow-700', border: 'border-yellow-200', dot: 'bg-yellow-500',
    next: ['onarimda', 'parca_sipariste'],
    requiresNote: true,
  },
  kalite_kontrol: {
    label: 'Kalite Kontrol', color: 'purple',
    bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', dot: 'bg-purple-500',
    next: ['tamamlandi', 'onarimda'],
  },
  tamamlandi: {
    label: 'Tamamlandı', color: 'green',
    bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', dot: 'bg-green-500',
    next: ['musteri_bilgilendirildi', 'teslime_hazir'],
    smsEvent: 'repair_done',
  },
  musteri_bilgilendirildi: {
    label: 'Müşteri Bilgilendirildi', color: 'blue',
    bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', dot: 'bg-blue-400',
    next: ['teslime_hazir'],
  },
  teslime_hazir: {
    label: 'Teslime Hazır', color: 'green',
    bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', dot: 'bg-green-600',
    next: ['teslim_edildi'],
    smsEvent: 'ready_pickup',
  },
  teslim_edildi: {
    label: 'Teslim Edildi', color: 'emerald',
    bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-300', dot: 'bg-emerald-600',
    next: ['garanti_talebi'],
    smsEvent: 'delivered',
  },
  garanti_talebi: {
    label: 'Garanti Talebi', color: 'red',
    bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', dot: 'bg-red-500',
    next: ['garanti_tamiri', 'musteri_reddetti'],
  },
  garanti_tamiri: {
    label: 'Garanti Tamiri', color: 'red',
    bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-300', dot: 'bg-red-600',
    next: ['tamamlandi'],
  },
  iptal: {
    label: 'İptal', color: 'red',
    bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-400',
    next: [],
    requiresNote: true,
  },
  tamir_edilemez: {
    label: 'Tamir Edilemez', color: 'gray',
    bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', dot: 'bg-slate-400',
    next: ['teslime_hazir'],
    requiresNote: true,
    smsEvent: 'cannot_repair',
  },
  musteri_reddetti: {
    label: 'Müşteri Reddetti', color: 'red',
    bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-200', dot: 'bg-red-400',
    next: ['teslime_hazir'],
    smsEvent: 'customer_rejected',
  },
}

// Durum geçişi doğrulama
export function canTransition(from: string, to: string): boolean {
  return SERVICE_STATUSES[from]?.next?.includes(to) ?? false
}

// ─── Cihaz Markaları ────────────────────────────────────────────────────────

export const DEVICE_BRANDS = [
  'Apple', 'Samsung', 'Xiaomi', 'Huawei', 'Oppo', 'Vivo', 'OnePlus',
  'Realme', 'Honor', 'Google', 'Motorola', 'Sony', 'Nokia', 'LG',
  'Lenovo', 'Asus', 'HP', 'Dell', 'MSI', 'Acer',
  'Roborock', 'Dreame', 'Ecovacs', 'iRobot', 'Dyson',
  'Garmin', 'Fitbit', 'JBL', 'Marshall', 'Bose',
  'Diğer',
]

export const DEVICE_CATEGORIES = [
  'Cep Telefonu', 'Tablet', 'Dizüstü Bilgisayar', 'Masaüstü Bilgisayar',
  'Akıllı Saat', 'Kulaklık', 'Robot Süpürge', 'Elektrikli Süpürge',
  'Oyun Konsolu', 'Drone', 'Kamera', 'Yazıcı', 'Monitör', 'Diğer',
]

// ─── Aksesuar Seçenekleri ───────────────────────────────────────────────────

export const ACCESSORY_OPTIONS = [
  'SIM Kart', 'Hafıza Kartı', 'Kutu', 'Şarj Aleti', 'Kablo',
  'Kılıf', 'Ekran Koruyucu', 'Kulaklık', 'Kalem (S-Pen)',
  'Adaptör', 'Güç Kaynağı', 'Fare', 'Klavye', 'Çanta',
]

// ─── Hasar Seçenekleri ──────────────────────────────────────────────────────

export const DAMAGE_OPTIONS = [
  'Ekran çatlak', 'Ekran kırık', 'Ekran yanık piksel', 'Kasa hasarlı',
  'Kasa çizik', 'Kamera kırık', 'Kamera camı çatlak', 'Arka cam kırık',
  'Şarj soketi hasarlı', 'Kulaklık girişi arızalı', 'Hoparlör arızalı',
  'Mikrofon arızalı', 'Tuş arızalı', 'Titreşim motoru arızalı',
  'Su hasarı', 'Batarya şişmiş', 'Açılmıyor', 'Yazılım sorunu',
  'Anakart arızalı', 'Sensör arızalı', 'WiFi/Bluetooth arızalı',
]

// ─── Parça Kategorileri ─────────────────────────────────────────────────────

export const PART_CATEGORIES = [
  'Ekran', 'Batarya', 'Şarj Portu', 'Arka Kapak', 'Kamera',
  'Hoparlör', 'Mikrofon', 'Anakart', 'IC (Entegre)', 'Flex Kablo',
  'Tuş Takımı', 'SIM Slot', 'Titreşim Motoru', 'Sensör',
  'Anten', 'WiFi Modülü', 'Vida Seti', 'Yapıştırıcı', 'Sarf Malzeme',
  'Robot Süpürge Parçası', 'Bilgisayar Parçası', 'Diğer',
]

// ─── Gelir/Gider Kategorileri ───────────────────────────────────────────────

export const INCOME_CATEGORIES = [
  'Servis Ücreti', 'Yedek Parça Satışı', 'Aksesuar Satışı',
  'Cihaz Satışı', '2. El Satış', 'Yazılım Hizmeti', 'Garanti Dışı Tamir',
  'Kurumsal Anlaşma', 'Diğer Gelir',
]

export const EXPENSE_CATEGORIES = [
  'Kira', 'Elektrik', 'Su', 'Doğalgaz', 'İnternet/Telefon',
  'Personel Maaş', 'SGK Primi', 'Tedarikçi Ödemesi', 'Sarf Malzeme',
  'Kargo/Kurye', 'Muhasebe', 'Vergi', 'Sigorta', 'Reklam/Pazarlama',
  'Bakım/Onarım', 'Demirbaş', 'Diğer Gider',
]

// ─── SMS Şablonları (160 karakter limiti gözetilmiş) ────────────────────────

export const SMS_TEMPLATES: Record<string, { name: string; text: string }> = {
  order_created: {
    name: 'Servis Kaydı',
    text: 'Sayin {musteri_adi}, {ariza_no} nolu cihaziniz teslim alinmistir. Takip: {takip_link}',
  },
  diagnosis_done: {
    name: 'Teşhis Tamamlandı',
    text: '{ariza_no} nolu cihazinizin teshisi tamamlandi. Tahmini ucret: {tutar}. Onay: {onay_link}',
  },
  approval_request: {
    name: 'Onay Talebi',
    text: '{ariza_no}: {cihaz} onarim ucreti {tutar}. Onaylamak icin: {onay_link}',
  },
  repair_done: {
    name: 'Onarım Tamamlandı',
    text: 'Sayin {musteri_adi}, {ariza_no} nolu cihazinizin onarimi tamamlandi. Teslim alabilirsiniz.',
  },
  ready_pickup: {
    name: 'Teslime Hazır',
    text: '{ariza_no}: Cihaziniz teslime hazir. Toplam: {tutar}. Adres: {adres}',
  },
  delivered: {
    name: 'Teslim Edildi',
    text: 'Sayin {musteri_adi}, cihaziniz teslim edildi. Gorusleriniz icin: {anket_link}',
  },
  satisfaction: {
    name: 'Memnuniyet Anketi',
    text: '{musteri_adi}, servisimizi degerlendirin! 1dk: {anket_link}',
  },
  warranty_expiring: {
    name: 'Garanti Bitiyor',
    text: 'Sayin {musteri_adi}, {ariza_no} nolu cihazinizin servis garantisi {tarih} tarihinde sona erecek.',
  },
  appointment_reminder: {
    name: 'Randevu Hatırlatma',
    text: '{musteri_adi}, yarin saat {saat} randevunuz var. Adres: {adres}. Iptal: {iptal_link}',
  },
  cannot_repair: {
    name: 'Tamir Edilemez',
    text: '{ariza_no}: Uzgunuz, cihaziniz tamir edilemez durumdadir. Teslim almak icin: {takip_link}',
  },
  customer_rejected: {
    name: 'Müşteri Reddetti',
    text: '{ariza_no}: Onariniz reddedildi. Cihazinizi teslim almak icin bize ulasin.',
  },
}

// ─── Roller ─────────────────────────────────────────────────────────────────

export const ROLES = {
  super_admin: { label: 'Süper Admin', color: 'bg-red-100 text-red-700' },
  tenant_admin: { label: 'İşletme Yöneticisi', color: 'bg-purple-100 text-purple-700' },
  mudur: { label: 'Müdür', color: 'bg-blue-100 text-blue-700' },
  teknisyen: { label: 'Teknisyen', color: 'bg-sky-100 text-sky-700' },
  muhasebe: { label: 'Muhasebe', color: 'bg-green-100 text-green-700' },
  satis: { label: 'Satış', color: 'bg-amber-100 text-amber-700' },
  kasiyer: { label: 'Kasiyer', color: 'bg-teal-100 text-teal-700' },
  viewer: { label: 'Sadece Görüntüleme', color: 'bg-slate-100 text-slate-600' },
}

// ─── Ödeme Yöntemleri ───────────────────────────────────────────────────────

export const PAYMENT_METHODS: Record<string, { label: string; icon: string }> = {
  nakit: { label: 'Nakit', icon: '💵' },
  kredi_karti: { label: 'Kredi Kartı', icon: '💳' },
  havale: { label: 'Havale', icon: '🏦' },
  eft: { label: 'EFT', icon: '🏦' },
  veresiye: { label: 'Veresiye', icon: '📝' },
  cek: { label: 'Çek', icon: '📄' },
  senet: { label: 'Senet', icon: '📃' },
}

// ─── Öncelik Seviyeleri ─────────────────────────────────────────────────────

export const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  normal: { label: 'Normal', color: 'text-slate-600', bg: 'bg-slate-100' },
  acil: { label: 'Acil', color: 'text-red-700', bg: 'bg-red-100' },
  garantili: { label: 'Garantili', color: 'text-purple-700', bg: 'bg-purple-100' },
}
