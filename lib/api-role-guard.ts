import { isOwnerRole, isRouteAllowedForRole } from './role-access'
import { normalizeTenantRole } from './tenant-roles'

/** Tenant API yazma işlemleri için minimum yetki */
export function canWriteTenantData(role: string): boolean {
  const r = normalizeTenantRole(role)
  return r !== 'viewer'
}

/** Profil / branding / tenant ayarları */
export function canManageTenantSettings(role: string): boolean {
  return isOwnerRole(normalizeTenantRole(role))
}

/** Finans / kasa push */
export function canPushFinance(role: string): boolean {
  const r = normalizeTenantRole(role)
  return isOwnerRole(r) || r === 'muhasebe' || r === 'kasiyer'
}

/** Modül bazlı push yetkisi */
export function canPushModule(role: string, module: string): boolean {
  const r = normalizeTenantRole(role)
  if (r === 'viewer') return false

  const financeModules = ['finance', 'transactions', 'cash', 'cashShifts', 'kasaBalance', 'invoices']
  if (financeModules.includes(module)) return canPushFinance(r)

  const adminModules = ['branches', 'personnel', 'notificationSettings']
  if (adminModules.includes(module)) return canManageTenantSettings(r)

  if (module === 'serviceOrders' || module === 'service') {
    return isRouteAllowedForRole('/dashboard/atolye', r) || isRouteAllowedForRole('/dashboard/kabul', r)
  }

  return true
}

export function roleGuardResponse(message = 'Bu işlem için yetkiniz yok') {
  return { ok: false as const, status: 403, message }
}
