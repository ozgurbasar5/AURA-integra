import type { SystemTourStep } from './tour-types'
import { el, navStep } from './tour-types'

export const ADMIN_FLOW: SystemTourStep[] = [
  navStep('/admin', 'Komuta Merkezi', 'Komuta Merkezi', 'Tüm bayilerin nabzı: uyarılar, gelir ve churn riski.'),
  el('/admin', 'admin-ops-alerts', 'Komuta Merkezi', 'Operasyon Uyarıları', 'Gecikmiş ödeme, başvuru ve webhook hataları burada.'),
  el('/admin', 'admin-churn-panel', 'Komuta Merkezi', 'Churn Paneli', 'Riskli bayiler ve önerilen müdahaleler.'),
  navStep('/admin/basvurular', 'Başvurular', 'Başvurular', 'Yeni bayi başvurularını incele ve onayla.'),
  el('/admin/basvurular', 'admin-basvuru-list', 'Başvurular', 'Başvuru Listesi', 'Satıra tıkla, not ekle, onayla veya reddet.'),
  navStep('/admin/bayiler', 'Bayiler', 'Bayi Yönetimi', 'Tüm bayiler: abonelik, sağlık skoru, panele giriş.'),
  el('/admin/bayiler', 'admin-bayiler-table', 'Bayiler', 'Bayi Tablosu', 'Satıra tıklayınca mini-CRM drawer açılır.'),
  navStep('/admin/odemeler', 'Ödemeler', 'Ödemeler', 'Bekleyen ve gecikmiş ödemeler.'),
  navStep('/admin/operasyon/audit', 'Operasyon', 'Denetim Kayıtları', 'Kim ne yaptı — tüm admin işlemleri loglanır.'),
  navStep('/admin/operasyon/webhook', 'Operasyon', 'Webhook Hataları', 'Entegrasyon hatalarını gör ve kapat.'),
  navStep('/admin/ayarlar', 'Ayarlar', 'Platform Ayarları', 'Paket fiyatları ve platform genel ayarları.'),
  el('/admin/ayarlar', 'admin-tour-restart', 'Ayarlar', 'Turu Tekrar Başlat', 'Bu turu istediğin zaman yeniden çalıştır.'),
]

export function getAdminTourSteps(): SystemTourStep[] {
  return ADMIN_FLOW
}
