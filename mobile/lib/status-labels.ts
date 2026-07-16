/** DB / store durum → Türkçe etiket (web ile uyumlu) */

const LABELS: Record<string, string> = {
  alindi: 'Alındı',
  teshis: 'Teşhis',
  onay_bekleniyor: 'Onay Bekliyor',
  tamir: 'Tamirde',
  kalite_kontrol: 'Kalite Kontrol',
  teslime_hazir: 'Teslime Hazır',
  teslim: 'Teslim Edildi',
  iptal: 'İptal',
  waiting_diagnosis: 'Bekliyor',
  parts_waiting: 'Parça Bekliyor',
  in_repair: 'Tamirde',
  customer_approval_pending: 'Onay Bekliyor',
  ready_for_pickup: 'Teslime Hazır',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
}

export const STATUS_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'alindi', label: 'Alındı' },
  { id: 'teshis', label: 'Teşhis' },
  { id: 'tamir', label: 'Tamir' },
  { id: 'onay_bekleniyor', label: 'Onay' },
  { id: 'kalite_kontrol', label: 'Kalite' },
] as const

export function statusLabel(status?: string | null): string {
  if (!status) return '—'
  const key = status.trim().toLowerCase()
  return LABELS[key] || status
}

export function statusMatchesFilter(status: string | null | undefined, filterId: string): boolean {
  if (filterId === 'all') return true
  const s = String(status || '').toLowerCase()
  if (filterId === 'teshis') return s === 'teshis' || s === 'parts_waiting'
  if (filterId === 'tamir') return s === 'tamir' || s === 'in_repair'
  if (filterId === 'alindi') return s === 'alindi' || s === 'waiting_diagnosis'
  if (filterId === 'onay_bekleniyor') return s === 'onay_bekleniyor' || s === 'customer_approval_pending'
  if (filterId === 'kalite_kontrol') return s === 'kalite_kontrol' || s === 'ready_for_pickup' || s === 'teslime_hazir'
  return s === filterId
}
