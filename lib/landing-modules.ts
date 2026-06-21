import type { LucideIcon } from 'lucide-react'
import {
  Wrench, ShoppingCart, Wallet, Users, BarChart3, Cloud,
  ClipboardCheck, Package, ScanBarcode, Truck, DollarSign,
  Globe, Store, Megaphone, UserCog, Building2, FileText,
  Shield, CalendarDays, CheckSquare, ClipboardList, RefreshCw,
  Percent, Bell, QrCode, MessageCircle, Layers, Zap, Search,
  Camera, Printer, TrendingUp,
} from 'lucide-react'
import { attachPanelRoutes } from './landing-panel-routes'

export type LandingModule = {
  id: string
  title: string
  desc: string
  tags: string[]
  icon: LucideIcon
  color: string
  illustration: 'atolye' | 'stok' | 'finans' | 'pos' | 'portal' | 'magaza' | 'yonetim' | 'admin'
  stat?: { label: string; value: string }
  /** Panelde karşılığı — doğrulandı */
  panelHref?: string
  /** Yalnızca platform super admin (/admin) */
  platformOnly?: boolean
}

export type LandingCategory = {
  id: string
  label: string
  subtitle: string
  icon: LucideIcon
  modules: LandingModule[]
}

export const LANDING_NAV = [
  { href: '#portal', label: 'Portal' },
  { href: '#moduller', label: 'Modüller' },
  { href: '#kesfet', label: 'Keşfet' },
  { href: '#entegrasyon', label: 'Entegrasyon' },
  { href: '#nasil-calisir', label: 'Süreç' },
  { href: '#paketler', label: 'Paketler' },
  { href: '#kurumsal', label: 'Kurumsal' },
  { href: '/basvuru', label: 'Bayi Başvuru' },
] as const

export const LANDING_CATEGORIES: LandingCategory[] = [
  {
    id: 'hizli',
    label: 'Hızlı İşlemler',
    subtitle: 'Günlük operasyonu saniyeler içinde başlatın',
    icon: Zap,
    modules: [
      { id: 'kabul', title: 'Hızlı Kabul', desc: 'Cihaz kabul formu, QR etiket, WhatsApp mesajı ve servis fişi tek akışta.', tags: ['QR etiket', 'KVKK', 'Fiş yazdır'], icon: ClipboardCheck, color: '#0e8fad', illustration: 'atolye', stat: { label: 'Ort. kabul süresi', value: '< 2 dk' } },
      { id: 'satis', title: 'Satış & POS', desc: 'Barkodlu satış, çoklu ödeme, stok düşümü ve kasa entegrasyonu.', tags: ['Barkod', 'Nakit/KK', 'KDV'], icon: ShoppingCart, color: '#2563eb', illustration: 'pos', stat: { label: 'POS işlem', value: 'Anlık sync' } },
      { id: 'alis', title: 'Alış & Tedarik', desc: 'Tedarikçiden alım → stok girişi → maliyet takibi otomatik.', tags: ['Alış→stok', 'Fatura', 'Tedarikçi'], icon: Truck, color: '#7c3aed', illustration: 'stok' },
      { id: 'kasa', title: 'Kasa Vardiyası', desc: 'Vardiya aç/kapa, Z raporu, nakit sayım ve gün sonu mutabakatı.', tags: ['Vardiya Z', 'Sayım', 'EOD'], icon: Wallet, color: '#059669', illustration: 'finans', stat: { label: 'Kasa sync', value: '7/24' } },
    ],
  },
  {
    id: 'atolye',
    label: 'Teknik Servis & Atölye',
    subtitle: 'Kabulden teslimata uçtan uca servis yönetimi',
    icon: Wrench,
    modules: [
      { id: 'atolye-kanban', title: 'Atölye & Kanban', desc: 'Durum panosu, teknisyen atama, parça kullanımı ve kalite kontrol listesi.', tags: ['Kanban', 'QC', 'Parça'], icon: Wrench, color: '#0e8fad', illustration: 'atolye', stat: { label: 'Servis durumu', value: '24 adım' } },
      { id: 'foto', title: 'Cihaz Fotoğrafları', desc: 'Kabul anında cihaz görselleri — hasar kaydı ve delil arşivi.', tags: ['PNG/JPG', '8 foto', 'Bulut'], icon: Camera, color: '#0891b2', illustration: 'atolye' },
      { id: 'ekspertiz', title: 'Ekspertiz & Teşhis', desc: 'Görsel teşhis şeması, onay linki ve müşteri SMS/WhatsApp bildirimi.', tags: ['Onay linki', 'SMS', 'WA'], icon: FileText, color: '#6366f1', illustration: 'atolye' },
      { id: 'garanti', title: 'Garanti & Randevu', desc: 'Garanti belgesi, randevu takvimi ve teslim protokolü.', tags: ['6 ay', 'Randevu', 'Belge'], icon: Shield, color: '#10b981', illustration: 'atolye' },
    ],
  },
  {
    id: 'stok',
    label: 'Stok & Envanter',
    subtitle: 'Tek envanter defteri — servis, POS ve alış senkron',
    icon: Package,
    modules: [
      { id: 'stok', title: 'Stok Yönetimi', desc: 'SKU, barkod, kritik stok uyarısı ve marka uyumluluk filtresi.', tags: ['Barkod', 'Kritik uyarı', 'Kategori'], icon: Package, color: '#d97706', illustration: 'stok', stat: { label: 'Stok hareketi', value: 'Anlık' } },
      { id: 'sayim', title: 'Stok Sayım', desc: 'Barkod/kamera ile hızlı sayım ve fark raporu.', tags: ['Kamera', 'Sayım', 'Export'], icon: ScanBarcode, color: '#ea580c', illustration: 'stok' },
      { id: 'tedarik', title: 'Tedarik Siparişleri', desc: 'Tedarikçi siparişi, teslim takibi ve otomatik stok girişi.', tags: ['Sipariş', 'Tedarikçi', 'Takip'], icon: Truck, color: '#7c3aed', illustration: 'stok' },
    ],
  },
  {
    id: 'finans',
    label: 'Finans & Raporlar',
    subtitle: 'Kasa, gelir-gider, e-fatura ve canlı KPI',
    icon: DollarSign,
    modules: [
      { id: 'finans', title: 'Gelir & Gider', desc: 'Nakit, KK, havale — kategori bazlı muhasebe özeti.', tags: ['Kategori', 'Ödeme', 'Not'], icon: DollarSign, color: '#059669', illustration: 'finans' },
      { id: 'rapor', title: 'Dashboard & Raporlar', desc: 'Bugün özeti, trend grafikleri, kalite donut ve TCMB döviz widget.', tags: ['KPI', 'TCMB', 'Export'], icon: BarChart3, color: '#0284c7', illustration: 'finans', stat: { label: 'Canlı KPI', value: 'Remote' } },
      { id: 'efatura', title: 'E-Fatura', desc: 'Fatura durumu, entegratör bağlantısı ve arşiv.', tags: ['E-Fatura', 'Arşiv', 'Durum'], icon: FileText, color: '#4f46e5', illustration: 'finans' },
      { id: 'komisyon', title: 'Komisyon', desc: 'Personel komisyon hesabı ve dönemsel özet.', tags: ['Personel', 'Oran', 'Özet'], icon: Percent, color: '#db2777', illustration: 'finans' },
    ],
  },
  {
    id: 'musteri',
    label: 'Müşteri & Portal',
    subtitle: 'CRM, online takip ve iletişim kanalları',
    icon: Users,
    modules: [
      { id: 'crm', title: 'Müşteri CRM', desc: 'Profil, geçmiş servisler, segment ve iletişim kayıtları.', tags: ['Segment', 'Geçmiş', 'KVKK'], icon: Users, color: '#8b5cf6', illustration: 'portal' },
      { id: 'portal', title: 'Müşteri Portalı', desc: 'Slug bazlı takip sayfası — müşteri cihaz durumunu canlı görür.', tags: ['Slug URL', 'Timeline', 'WA link'], icon: Globe, color: '#0ea5e9', illustration: 'portal', stat: { label: 'Portal', value: '7/24' } },
      { id: 'siparis', title: 'Müşteri Siparişleri', desc: 'Ön sipariş, stok bekleyen talepler ve teslimat takibi.', tags: ['Ön sipariş', 'Bekleme', 'Takip'], icon: ClipboardList, color: '#f59e0b', illustration: 'portal' },
      { id: 'sms', title: 'SMS & Bildirim', desc: 'Durum SMS\'i, NetGSM entegrasyonu ve bildirim logu.', tags: ['NetGSM', 'Durum SMS', 'Log'], icon: MessageCircle, color: '#22c55e', illustration: 'portal' },
    ],
  },
  {
    id: 'magaza',
    label: 'Mağaza & Vitrin',
    subtitle: 'Vitrin cihazları, kampanya ve ikinci el',
    icon: Store,
    modules: [
      { id: 'vitrin', title: 'Vitrin & İkinci El', desc: 'Showcase cihazları, fiyatlandırma ve vitrin yönetimi.', tags: ['Vitrin', '2. el', 'Fiyat'], icon: RefreshCw, color: '#ec4899', illustration: 'magaza' },
      { id: 'kampanya', title: 'Kampanya & Fırsat', desc: 'Dönemsel kampanyalar, indirim kuralları ve fırsat vitrini.', tags: ['Kampanya', 'İndirim', 'Fırsat'], icon: Megaphone, color: '#f97316', illustration: 'magaza' },
      { id: 'varlik', title: 'Varlık Yönetimi', desc: 'Demirbaş, ekipman ve amortisman takibi.', tags: ['Demirbaş', 'Ekipman', 'Takip'], icon: Building2, color: '#64748b', illustration: 'magaza' },
    ],
  },
  {
    id: 'yonetim',
    label: 'Yönetim & Ekip',
    subtitle: 'Personel, şube, görevler ve yetkilendirme',
    icon: UserCog,
    modules: [
      { id: 'personel', title: 'Personel & Roller', desc: 'Teknisyen, satış, kasa, muhasebe — rol bazlı sidebar ve yetki.', tags: ['Rol', 'Yetki', 'Sidebar'], icon: UserCog, color: '#6366f1', illustration: 'yonetim' },
      { id: 'sube', title: 'Çok Şube', desc: 'Şube seçici, şube bazlı rapor ve merkezi yönetim.', tags: ['Şube', 'Scope', 'Merkez'], icon: Building2, color: '#0e8fad', illustration: 'yonetim' },
      { id: 'todo', title: 'Yapılacaklar', desc: 'Görev listesi, öncelik, kategori ve ekip ataması.', tags: ['Görev', 'Öncelik', 'Atama'], icon: CheckSquare, color: '#14b8a6', illustration: 'yonetim' },
      { id: 'yurtdisi', title: 'Yurt Dışı / TR Kayıt', desc: 'IMEI kontrol, çalıntı listesi ve yabancı cihaz kaydı.', tags: ['IMEI', 'Kontrol', 'Kayıt'], icon: Globe, color: '#ef4444', illustration: 'yonetim' },
    ],
  },
  {
    id: 'platform',
    label: 'Platform & Admin',
    subtitle: 'Çok kiracılı SaaS — bayi ağı tek komuta merkezinde',
    icon: Cloud,
    modules: [
      { id: 'admin', title: 'Super Admin', desc: 'Bayi CRUD, paket yönetimi, başvuru onayı ve tenant sağlığı.', tags: ['Bayi', 'Paket', 'Audit'], icon: Cloud, color: '#1e40af', illustration: 'admin', stat: { label: 'Multi-tenant', value: 'İzole' } },
      { id: 'api', title: 'API & Entegrasyon', desc: 'REST API, webhook, public takip endpoint ve API key yönetimi.', tags: ['REST', 'Webhook', 'API key'], icon: Layers, color: '#475569', illustration: 'admin' },
      { id: 'search', title: 'Global Arama', desc: 'IMEI, barkod, müşteri ve iş emri — kamera ile tarama.', tags: ['IMEI', 'Barkod', 'Kamera'], icon: Search, color: '#0e8fad', illustration: 'admin' },
      { id: 'abonelik', title: 'Abonelik & Paket', desc: 'Kümülatif lisans, deneme süresi ve feature flag yönetimi.', tags: ['Deneme', 'Flag', 'Stripe'], icon: TrendingUp, color: '#059669', illustration: 'admin' },
    ],
  },
]

export const LANDING_CATEGORIES_RESOLVED: LandingCategory[] = LANDING_CATEGORIES.map(cat => ({
  ...cat,
  modules: attachPanelRoutes(cat.modules),
}))

/** Keşfet sekmesi — her kategoriden öne çıkan modül */
export const LANDING_FEATURED = LANDING_CATEGORIES.flatMap(c => c.modules.slice(0, 1))

export const LANDING_FLOW_NODES = [
  { id: 'kabul', label: 'Kabul', x: 8, icon: ClipboardCheck },
  { id: 'atolye', label: 'Atölye', x: 28, icon: Wrench },
  { id: 'stok', label: 'Stok', x: 48, icon: Package },
  { id: 'finans', label: 'Finans', x: 68, icon: DollarSign },
  { id: 'portal', label: 'Portal', x: 88, icon: Globe },
] as const

export const LANDING_EXTRAS = [
  { icon: QrCode, title: 'QR Servis Etiketi', desc: 'Kabul anında yazdırılabilir QR fiş.' },
  { icon: Printer, title: 'Fiş & Barkod Yazdır', desc: 'Servis fişi ve barkod etiket şablonları.' },
  { icon: Bell, title: 'Bildirim Merkezi', desc: 'SMS, e-posta ve sistem bildirimleri.' },
  { icon: CalendarDays, title: 'Randevu Takvimi', desc: 'Müşteri randevuları ve hatırlatma.' },
]
