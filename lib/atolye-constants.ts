import type { LucideIcon } from 'lucide-react'
import {
  Battery, Camera, Cpu, Eye, Monitor, Phone, Radio, Speaker, Vibrate, Zap,
} from 'lucide-react'

export interface DevicePartDef {
  id: string
  name: string
  icon: LucideIcon
  price: number
  path: string
  baseColor?: string
  fillRule?: 'nonzero' | 'evenodd' | 'inherit'
}

export const DEVICE_PARTS_SVG: DevicePartDef[] = [
  { id: 'motherboard', name: 'ANAKART', icon: Cpu, price: 4500, path: 'M 160 40 L 270 40 L 270 300 L 160 300 L 160 140 L 140 140 L 140 40 Z', baseColor: '#334155' },
  { id: 'battery', name: 'BATARYA', icon: Battery, price: 900, path: 'M 20 130 L 130 130 L 130 460 L 20 460 Z', baseColor: '#1e293b' },
  { id: 'camera_back', name: 'ARKA KAMERA', icon: Camera, price: 1200, path: 'M 190 50 L 260 50 L 260 120 L 190 120 Z', baseColor: '#0f172a' },
  { id: 'camera_front', name: 'ÖN KAMERA', icon: Eye, price: 800, path: 'M 80 20 L 150 20 L 150 50 L 80 50 Z', baseColor: '#000000' },
  { id: 'charging', name: 'ŞARJ SOKETİ', icon: Zap, price: 600, path: 'M 80 540 L 220 540 L 220 590 L 80 590 Z', baseColor: '#475569' },
  { id: 'taptic', name: 'TİTREŞİM', icon: Vibrate, price: 450, path: 'M 20 480 L 100 480 L 100 530 L 20 530 Z', baseColor: '#334155' },
  { id: 'speaker', name: 'HOPARLÖR', icon: Speaker, price: 500, path: 'M 130 480 L 270 480 L 270 530 L 130 530 Z', baseColor: '#334155' },
  { id: 'earpiece', name: 'AHİZE', icon: Phone, price: 300, path: 'M 100 5 L 200 5 L 200 15 L 100 15 Z', baseColor: '#64748b' },
  { id: 'wireless_charging', name: 'KABLOSUZ ŞARJ', icon: Radio, price: 400, path: 'M 150 200 m -50 0 a 50 50 0 1 0 100 0 a 50 50 0 1 0 -100 0 M 150 215 m -35 0 a 35 35 0 1 0 70 0 a 35 35 0 1 0 -70 0', fillRule: 'evenodd', baseColor: '#94a3b8' },
  { id: 'screen', name: 'EKRAN / CAM', icon: Monitor, price: 2500, path: 'M 5 5 L 295 5 L 295 595 L 5 595 Z M 10 10 L 10 590 L 290 590 L 290 10 Z', fillRule: 'evenodd', baseColor: 'transparent' },
]

export interface CategoryInfo {
  accessories: string[]
  preChecks: string[]
  finalChecks: string[]
}

export const CATEGORY_DATA: Record<string, CategoryInfo> = {
  'Cep Telefonu': {
    accessories: ['Cihazın Kendisi', 'Kutu', 'Orijinal Şarj Aleti', 'USB Kablo', 'Kılıf', 'Sim İğnesi', 'Fatura', 'Kulaklık', 'Dönüştürücü', 'Garanti Belgesi'],
    preChecks: ['Ekran Kırık/Çatlak', 'Kasa Ezik/Çizik', 'Arka Cam Kırık', 'Sıvı Teması Şüphesi', 'FaceID/TouchID Çalışmıyor', 'Kamera Lens Çizik', 'Vida Eksik/Oynanmış', 'Şarj Almıyor', 'El Feneri Yanmıyor', 'Ahize Sesi Az', 'Batarya Şişik'],
    finalChecks: ['Dokunmatik Hassasiyeti', 'Ön Kamera', 'Arka Kamera & Odak', 'Şarj Entegresi & Akım', 'Mikrofon (Alt/Üst)', 'Ahize & Hoparlör', 'Şebeke & Wifi & BT', 'Yakınlık Sensörü', 'TrueTone / Ekran Renkleri', 'FaceID / Parmak İzi', 'NFC / Kablosuz Şarj', 'Tuş Takımı Kontrolü'],
  },
  'Robot Süpürge': {
    accessories: ['Cihazın Kendisi', 'Şarj İstasyonu', 'Güç Kablosu', 'Yan Fırça', 'Ana Fırça', 'Paspas (Mop)', 'Paspas Standı', 'Su Tankı', 'Toz Haznesi', 'Filtre', 'Kumanda'],
    preChecks: ['Tekerlek Sıkışık/Zorlanıyor', 'Lidar Dönmüyor/Sesli', 'Sıvı Teması (Anakart)', 'Fan Sesi Yüksek/Islık', 'Yan Fırça Dönmüyor', 'Ana Fırça Dönmüyor', 'Tampon (Bumper) Takılı', 'Sensör Camları Çizik', 'Şarj Olmuyor Hatası'],
    finalChecks: ['Emiş Gücü (Pa) Testi', 'Haritalama & Lidar', 'Şarj Oluyor & Dock Dönüş', 'Su Akıtma (Pompa) Testi', 'Düşme Sensörleri', 'Wifi Bağlantısı', 'Halı Algılama', 'Sesli Asistan', 'Tekerlek Motor Testi', 'Batarya Kapasite Testi'],
  },
  Bilgisayar: {
    accessories: ['Cihazın Kendisi', 'Orijinal Şarj Aleti', 'Güç Kablosu', 'Çanta / Kılıf', 'Mouse', 'HDMI / Çevirici', 'Kutu', 'Batarya (Harici)'],
    preChecks: ['Ekran Kırık/Lekeli', 'Menteşe Gevşek/Kırık', 'Klavye Tuş Eksik', 'Kasa Köşe Ezik', 'Sıvı Teması', 'Trackpad Basmıyor', 'Vida Eksik', 'Fan Çok Sesli', 'USB Portları Hasarlı'],
    finalChecks: ['Klavye (Tüm Tuşlar)', 'Ekran & Ölü Piksel', 'Ses (Sağ/Sol Hoparlör)', 'Wifi & Bluetooth', 'Termal Test (Stress)', 'SSD Sağlık & Hız', 'Fan Devir Kontrolü', 'USB & Type-C Portları', 'Webcam & Mikrofon', 'Batarya Döngüsü', 'Menteşe Sertliği'],
  },
  Tablet: {
    accessories: ['Cihazın Kendisi', 'Kılıf', 'Akıllı Kalem', 'Şarj Aleti', 'Kablo', 'Klavye Kılıf', 'Kutu'],
    preChecks: ['Ekran Çatlak', 'Kasa Yamuk/Eğik', 'Butonlar Basmıyor', 'Şarj Soketi Gevşek', 'Kamera Lensi Kırık'],
    finalChecks: ['Dokunmatik (Multi-touch)', 'Kalem (Pencil) Testi', 'Ön/Arka Kamera', 'Şarj Entegresi', 'Wifi & Sim Kart', 'Jiroskop (Döndürme)', 'Mikrofon & Hoparlör'],
  },
  'Akıllı Saat': {
    accessories: ['Cihazın Kendisi', 'Kordon (Alt/Üst)', 'Şarj Kablosu / Standı', 'Kutu'],
    preChecks: ['Cam Çizik/Kırık', 'Kordon Kilit Arızalı', 'Arka Sensör Camı Kırık', 'Digital Crown Dönmüyor', 'Tuş Basmıyor'],
    finalChecks: ['Dokunmatik Hassasiyeti', 'Nabız & Oksijen Sensörü', 'Titreşim Motoru', 'Telefon Eşleşme', 'Mikrofon & Hoparlör', 'Su Tahliye Modu', 'Şarj Oluyor'],
  },
  'Oyun Konsolu': {
    accessories: ['Konsol', 'Güç Kablosu', 'HDMI Kablo', 'Gamepad (1)', 'Gamepad (2)', 'USB Kablo'],
    preChecks: ['HDMI Portu Bozuk', 'CD Okumuyor', 'Fan Sesi Aşırı', 'Görüntü Vermiyor', 'Gamepad Drift Sorunu', 'Kasa Hasarlı'],
    finalChecks: ['Görüntü & Ses Çıkışı', 'Disk Okuyucu Testi', 'Wifi/Ethernet', 'Isınma Testi', 'Gamepad Bağlantısı', 'HDD/SSD Sağlık'],
  },
  Diğer: {
    accessories: ['Cihazın Kendisi', 'Güç Kablosu', 'Kumanda', 'Adaptör', 'Aksesuar'],
    preChecks: ['Fiziksel Hasar', 'Eksik Parça', 'Açılmıyor', 'Ses Gelmiyor'],
    finalChecks: ['Güç Testi', 'Fonksiyon Testi', 'Güvenlik Testi', 'Temizlik'],
  },
}

export const DEVICE_CATEGORIES = Object.keys(CATEGORY_DATA)

export function getCategoryInfo(cat: string): CategoryInfo {
  return CATEGORY_DATA[cat] || CATEGORY_DATA.Diğer
}

export const SERVICE_STATUSES: Record<string, {
  label: string
  bg: string
  text: string
  border: string
  next: string[]
}> = {
  waiting_diagnosis: { label: 'Tanı Bekliyor', bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300', next: ['diagnosed', 'cancelled'] },
  diagnosed: { label: 'Teşhis Edildi', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', next: ['customer_approval_pending', 'no_fix_no_fee'] },
  customer_approval_pending: { label: 'Onay Bekliyor', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', next: ['customer_approved', 'customer_refused'] },
  customer_approved: { label: 'Onaylandı', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', next: ['assigned_technician', 'in_repair'] },
  assigned_technician: { label: 'Teknisyen Atandı', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', next: ['parts_checking', 'in_repair'] },
  parts_checking: { label: 'Parça Kontrol', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', next: ['parts_ordered', 'in_repair'] },
  parts_ordered: { label: 'Parça Bekliyor', bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', next: ['parts_received'] },
  parts_received: { label: 'Parça Geldi', bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', next: ['in_repair'] },
  in_repair: { label: 'Tamirde', bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-200', next: ['repair_paused', 'quality_check'] },
  repair_paused: { label: 'Tamir Duraklatıldı', bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', next: ['in_repair'] },
  quality_check: { label: 'Kalite Kontrol', bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200', next: ['repair_complete', 'in_repair'] },
  repair_complete: { label: 'Tamir Tamamlandı', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', next: ['customer_notified'] },
  customer_notified: { label: 'Müşteri Bilgilendirildi', bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', next: ['ready_for_pickup'] },
  ready_for_pickup: { label: 'Teslime Hazır', bg: 'bg-green-50', text: 'text-green-700', border: 'border-green-200', next: ['delivered'] },
  delivered: { label: 'Teslim Edildi', bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', next: [] },
  cancelled: { label: 'İptal', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', next: [] },
  no_fix_no_fee: { label: 'Tamir Edilemez', bg: 'bg-slate-100', text: 'text-slate-600', border: 'border-slate-300', next: [] },
  customer_refused: { label: 'Müşteri Reddetti', bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200', next: [] },
}

export const PROGRESS_STEPS = ['Kabul', 'İşlemde', 'Hazır', 'Teslim'] as const

export function getProgressStep(status: string): { index: number; special?: string } {
  if (status === 'parts_ordered' || status === 'parts_received') return { index: 1, special: 'Parça Bekliyor' }
  if (status === 'customer_approval_pending') return { index: 1, special: 'Onay Bekliyor' }
  if (['waiting_diagnosis', 'diagnosed', 'cancelled', 'no_fix_no_fee', 'customer_refused'].includes(status)) return { index: 0 }
  if (['customer_approved', 'assigned_technician', 'parts_checking', 'in_repair', 'repair_paused', 'quality_check'].includes(status)) return { index: 1 }
  if (['repair_complete', 'customer_notified', 'ready_for_pickup'].includes(status)) return { index: 2 }
  if (status === 'delivered') return { index: 3 }
  return { index: 0 }
}

/** WhatsApp mesajı için Türkçe durum etiketi */
export function statusLabelForWhatsapp(status: string): string {
  const map: Record<string, string> = {
    waiting_diagnosis: 'Bekliyor',
    in_repair: 'İşlemde',
    parts_ordered: 'Parça Bekliyor',
    customer_approval_pending: 'Onay Bekliyor',
    ready_for_pickup: 'Hazır',
    repair_complete: 'Hazır',
    delivered: 'Teslim Edildi',
  }
  return map[status] || SERVICE_STATUSES[status]?.label || status
}
