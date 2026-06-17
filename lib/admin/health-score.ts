export type TenantHealthInput = {
  active_users: number
  total_users?: number
  orders_30d: number
  revenue_30d: number
  overdue_payments: number
  subscription_end?: string | null
  status?: string
  last_login_days?: number | null
}

export type HealthIntervention = {
  priority: 'high' | 'medium' | 'low'
  message: string
  action?: string
}

export function computeHealthScore(h: TenantHealthInput): number {
  let score = 100
  if (h.overdue_payments > 0) score -= 25 * Math.min(h.overdue_payments, 3)
  if (h.orders_30d === 0) score -= 20
  if (h.revenue_30d === 0 && h.orders_30d === 0) score -= 15
  if (h.active_users === 0) score -= 20
  if (h.subscription_end) {
    const days = Math.ceil((new Date(h.subscription_end).getTime() - Date.now()) / 86400000)
    if (days < 0) score -= 30
    else if (days <= 7) score -= 15
    else if (days <= 14) score -= 8
  }
  if (h.last_login_days != null && h.last_login_days > 14) score -= 15
  if (h.status === 'passive' || h.status === 'suspended') score -= 40
  return Math.max(0, Math.min(100, score))
}

export function healthScoreLabel(score: number): { label: string; color: string } {
  if (score >= 75) return { label: 'Sağlıklı', color: 'text-emerald-400 bg-emerald-500/15 border-emerald-500/30' }
  if (score >= 50) return { label: 'İzle', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' }
  return { label: 'Riskli', color: 'text-red-400 bg-red-500/15 border-red-500/30' }
}

export function suggestInterventions(h: TenantHealthInput, companyName: string): HealthIntervention[] {
  const items: HealthIntervention[] = []
  if (h.overdue_payments > 0) {
    items.push({ priority: 'high', message: `${companyName}: gecikmiş ödeme var`, action: 'Ödeme hatırlat' })
  }
  if (h.subscription_end) {
    const days = Math.ceil((new Date(h.subscription_end).getTime() - Date.now()) / 86400000)
    if (days <= 14 && days >= 0) {
      items.push({ priority: 'high', message: `${companyName}: abonelik ${days} gün içinde bitiyor`, action: 'Abonelik uzat' })
    }
    if (days < 0) {
      items.push({ priority: 'high', message: `${companyName}: abonelik süresi dolmuş`, action: 'Acil iletişim' })
    }
  }
  if (h.orders_30d === 0) {
    items.push({ priority: 'medium', message: `${companyName}: 30 gündür servis kaydı yok`, action: 'Kullanım kontrolü' })
  }
  if (h.active_users === 0) {
    items.push({ priority: 'medium', message: `${companyName}: aktif kullanıcı yok`, action: 'Panele gir' })
  }
  if (h.last_login_days != null && h.last_login_days > 14) {
    items.push({ priority: 'low', message: `${companyName}: ${h.last_login_days} gündür giriş yok`, action: 'Arama listesi' })
  }
  return items
}
