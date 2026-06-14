import type { TenantStatus, PaymentStatus } from '@/types/database'

/** VantaPhone tarzı 3 sabit paket katmanı */
export const PLAN_TIERS = ['Deneyim', 'Pro', 'Business'] as const

export type TenantBlockReason =
  | 'no_tenant'
  | 'passive'
  | 'suspended'
  | 'subscription_expired'
  | 'payment_overdue'
  | 'profile_inactive'

export type TenantAccessResult =
  | { allowed: true }
  | { allowed: false; reason: TenantBlockReason; message: string }

export type TenantAccessInput = {
  status: TenantStatus | string
  subscription_end: string | null | undefined
  has_overdue_payment?: boolean
}

const BLOCK_MESSAGES: Record<TenantBlockReason, string> = {
  no_tenant: 'Bayi hesabınız bulunamadı. Sistem yöneticisiyle iletişime geçin.',
  passive: 'Bayi hesabınız pasif durumda. Erişim için ödeme veya aktivasyon gerekli.',
  suspended: 'Bayi hesabınız askıya alındı. Destek ekibiyle iletişime geçin.',
  subscription_expired: 'Abonelik süreniz doldu. Yenileme için sistem yöneticisiyle iletişime geçin.',
  payment_overdue: 'Gecikmiş ödemeniz bulunuyor. Panel erişimi ödeme sonrası açılır.',
  profile_inactive: 'Kullanıcı hesabınız pasif. Sistem yöneticisiyle iletişime geçin.',
}

export function getTenantBlockMessage(reason: TenantBlockReason): string {
  return BLOCK_MESSAGES[reason]
}

export function evaluateTenantAccess(input: TenantAccessInput): TenantAccessResult {
  const status = input.status as TenantStatus

  if (status === 'passive') {
    return { allowed: false, reason: 'passive', message: BLOCK_MESSAGES.passive }
  }
  if (status === 'suspended') {
    return { allowed: false, reason: 'suspended', message: BLOCK_MESSAGES.suspended }
  }

  if (input.has_overdue_payment) {
    return { allowed: false, reason: 'payment_overdue', message: BLOCK_MESSAGES.payment_overdue }
  }

  if (input.subscription_end) {
    const end = new Date(input.subscription_end)
    end.setHours(23, 59, 59, 999)
    if (end.getTime() < Date.now() && status !== 'trial') {
      return { allowed: false, reason: 'subscription_expired', message: BLOCK_MESSAGES.subscription_expired }
    }
    // Deneme süresi de bittiğinde kapat
    if (end.getTime() < Date.now() && status === 'trial') {
      return { allowed: false, reason: 'subscription_expired', message: BLOCK_MESSAGES.subscription_expired }
    }
  }

  return { allowed: true }
}

export function toDateString(d: Date): string {
  return d.toISOString().split('T')[0]
}

export function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

export function defaultTrialPeriodDays(): number {
  return 30
}

export function computeTrialEnd(from = new Date()): string {
  return toDateString(addDays(from, defaultTrialPeriodDays()))
}

/** Ödeme alındığında abonelik bitişini uzat (30 gün) */
export function extendSubscriptionEnd(
  currentEnd: string | null | undefined,
  periodDays = 30
): string {
  const now = new Date()
  const base =
    currentEnd && new Date(currentEnd).getTime() > now.getTime()
      ? new Date(currentEnd)
      : now
  return toDateString(addDays(base, periodDays))
}

export function isPaymentOverdue(dueDate: string, status: PaymentStatus): boolean {
  if (status === 'paid' || status === 'cancelled') return false
  const due = new Date(dueDate)
  due.setHours(23, 59, 59, 999)
  return due.getTime() < Date.now() && (status === 'pending' || status === 'overdue')
}
