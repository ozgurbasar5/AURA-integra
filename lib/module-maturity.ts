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

export const MODULE_MATURITY: ModuleMaturity[] = [
  { id: 'kabul', label: 'Hızlı Kabul', dataSource: 'api', apiCoverage: 95, syncRisk: 'low', notes: 'Service orders API + Storage foto' },
  { id: 'atolye', label: 'Atölye', dataSource: 'hybrid', apiCoverage: 85, syncRisk: 'med', notes: 'API-first bridge, store cache' },
  { id: 'stok', label: 'Stok', dataSource: 'hybrid', apiCoverage: 70, syncRisk: 'med', notes: 'parts API + sync push' },
  { id: 'satis', label: 'Satış POS', dataSource: 'hybrid', apiCoverage: 80, syncRisk: 'med', notes: 'pos-bridge atomik satış' },
  { id: 'kasa', label: 'Kasa', dataSource: 'hybrid', apiCoverage: 75, syncRisk: 'med', notes: 'cash-shifts API + cache' },
  { id: 'fatura', label: 'e-Fatura', dataSource: 'local', apiCoverage: 40, syncRisk: 'high', notes: 'Test modu stub' },
  { id: 'portal', label: 'Müşteri Portalı', dataSource: 'api', apiCoverage: 90, syncRisk: 'low' },
  { id: 'vitrin', label: 'Vitrin', dataSource: 'hybrid', apiCoverage: 60, syncRisk: 'med' },
  { id: 'ai', label: 'AI Asistan', dataSource: 'api', apiCoverage: 100, syncRisk: 'low', notes: 'Kota + rate limit' },
  { id: 'bildirimler', label: 'Bildirimler', dataSource: 'hybrid', apiCoverage: 70, syncRisk: 'med' },
  { id: 'raporlar', label: 'Raporlar', dataSource: 'hybrid', apiCoverage: 65, syncRisk: 'med' },
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
