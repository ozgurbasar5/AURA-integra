export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ')
}

// Format fonksiyonları lib/validators.ts'den kullanılmalı.
// Geriye dönük uyumluluk için re-export:
export { formatCurrency, formatDate, formatDateTime, formatRelativeTime as formatRelative } from './validators'


export const STATUS_LABELS: Record<string, string> = {
  alindi:            'Alındı',
  teshis:            'Teşhis',
  onay_bekleniyor:   'Onay Bekliyor',
  tamir:             'Tamirde',
  kalite_kontrol:    'Kalite Kontrol',
  teslim:            'Teslim Edildi',
  iptal:             'İptal',
}

export const STATUS_COLORS: Record<string, string> = {
  alindi:            'bg-zinc-700/50 text-zinc-300 border-zinc-600/50',
  teshis:            'bg-blue-500/15 text-blue-400 border-blue-500/30',
  onay_bekleniyor:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
  tamir:             'bg-orange-500/15 text-orange-400 border-orange-500/30',
  kalite_kontrol:    'bg-purple-500/15 text-purple-400 border-purple-500/30',
  teslim:            'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  iptal:             'bg-red-500/15 text-red-400 border-red-500/30',
}

export const TENANT_STATUS_COLORS: Record<string, string> = {
  active:    'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  trial:     'bg-blue-500/15 text-blue-400 border-blue-500/30',
  passive:   'bg-zinc-700/50 text-zinc-400 border-zinc-600/50',
  suspended: 'bg-red-500/15 text-red-400 border-red-500/30',
}

export const TENANT_STATUS_LABELS: Record<string, string> = {
  active:    'Aktif',
  trial:     'Deneme',
  passive:   'Pasif',
  suspended: 'Askıda',
}

export const PAYMENT_STATUS_COLORS: Record<string, string> = {
  paid:      'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  pending:   'bg-amber-500/15 text-amber-400 border-amber-500/30',
  overdue:   'bg-red-500/15 text-red-400 border-red-500/30',
  cancelled: 'bg-zinc-700/50 text-zinc-400 border-zinc-600/50',
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  paid:      'Ödendi',
  pending:   'Bekliyor',
  overdue:   'Gecikmiş',
  cancelled: 'İptal',
}
