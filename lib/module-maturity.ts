/** Modül olgunluk tanımları — README tablosu ile senkron */

export type MaturityLevel = 'api' | 'hybrid' | 'local'
export type SyncRisk = 'low' | 'med' | 'high'

export type ModuleMaturity = {
  id: string
  label: string
  dataSource: MaturityLevel
  apiCoverage: number
  syncRisk: SyncRisk
  notes?: string
}

/** e-Fatura ve Bildirimler (SMS/WA) hariç çekirdek ERP API-first %100 */
export const MODULE_MATURITY: ModuleMaturity[] = [
  { id: 'kabul', label: 'Hızlı Kabul', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: 'service-orders API + foto' },
  { id: 'atolye', label: 'Atölye', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: 'PATCH notes/private_note/final_checks + parça' },
  { id: 'servis-teslim', label: 'Servis Teslim', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: '/deliver + kasa/finans atomik' },
  { id: 'stok', label: 'Stok', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: 'parts API; push kapalı' },
  { id: 'alis', label: 'Alış', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: 'purchases API + stok; çift giriş koruması' },
  { id: 'tedarik', label: 'Tedarik', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: 'GET/POST/PATCH + receive; push kapalı' },
  { id: 'sayim', label: 'Stok Sayım', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: 'stock/count + stock_movements' },
  { id: 'satis', label: 'Satış POS', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: 'complete_pos_sale RPC + GET sales' },
  { id: 'kasa', label: 'Kasa', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: 'cash-shifts + snapshot + düzeltme' },
  { id: 'cari', label: 'Cari / Veresiye', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: 'borç + tahsilat API' },
  { id: 'fatura', label: 'e-Fatura', dataSource: 'hybrid', apiCoverage: 70, syncRisk: 'med', notes: 'Opsiyonel — stub / NES / Logo' },
  { id: 'portal', label: 'Müşteri Portalı', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: 'public portal + takip API' },
  { id: 'vitrin', label: 'Vitrin', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: 'showcase CRUD + sell; push kapalı' },
  { id: 'ai', label: 'AI Asistan', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: 'Kota + rate limit' },
  { id: 'bildirimler', label: 'Bildirimler', dataSource: 'hybrid', apiCoverage: 85, syncRisk: 'med', notes: 'Expo push (onay/teslim) + log; SMS/WA prod opsiyonel' },
  { id: 'raporlar', label: 'Raporlar', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: 'reports + export CSV + EOD API' },
  { id: 'randevu', label: 'Randevu', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: 'kapora + kasa bağlama' },
  { id: 'garanti', label: 'Garanti', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: 'claim_status + süre filtresi' },
  { id: 'komisyon', label: 'Komisyon', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: 'commissions API + personel oranı' },
  { id: 'musteriler', label: 'CRM Müşteriler', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: 'customers API; push kapalı' },
  { id: 'transfer', label: 'Depo Transfer', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: 'stock_transfers + şube stok' },
]

export function maturityBadgeColor(m: ModuleMaturity): 'green' | 'amber' | 'red' {
  if (m.dataSource === 'api' && m.apiCoverage >= 80) return 'green'
  if (m.dataSource === 'local' || m.syncRisk === 'high') return 'red'
  return 'amber'
}

export function maturitySummary() {
  const green = MODULE_MATURITY.filter(m => maturityBadgeColor(m) === 'green').length
  const amber = MODULE_MATURITY.filter(m => maturityBadgeColor(m) === 'amber').length
  const red = MODULE_MATURITY.filter(m => maturityBadgeColor(m) === 'red').length
  return { green, amber, red, total: MODULE_MATURITY.length }
}

/** e-Fatura + bildirimler hariç API-first çekirdek */
export function coreApiFirstReady(): boolean {
  return MODULE_MATURITY
    .filter(m => m.id !== 'fatura' && m.id !== 'bildirimler')
    .every(m => m.dataSource === 'api' && m.apiCoverage >= 100)
}
