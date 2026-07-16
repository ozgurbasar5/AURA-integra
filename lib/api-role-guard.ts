import { isOwnerRole } from './role-access'
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

const PUSH_MODULE_ALLOWLIST = new Set([
  'todos',
  'customerOrders',
  'storeProducts',
  'assets',
  'campaigns',
  'deals',
  'secondHandDevices',
  'stolenIMEIs',
  'branches',
  'notificationLogs',
  'supportTickets',
  'supplierOrders',
  'personnel',
  'foreignDevices',
  'serviceExpenses',
  'statusHistory',
  'notificationSettings',
])

/** API-first — push kapalı (client no-op + server reject) */
const PUSH_DISABLED_MODULES = new Set([
  'serviceOrders',
  'stock',
  'sales',
  'transactions',
  'cashShifts',
  'kasaBalance',
  'appointments',
  'warranties',
  'invoices',
  'purchases',
  'secondHandDevices',
  'supplierOrders',
  'serviceExpenses',
  'customers',
])

export function isPushDisabledModule(module: string): boolean {
  return PUSH_DISABLED_MODULES.has(module)
}

export function isKnownPushModule(module: string): boolean {
  return PUSH_MODULE_ALLOWLIST.has(module)
}

/** Modül bazlı push yetkisi */
export function canPushModule(role: string, module: string): boolean {
  if (!isKnownPushModule(module)) return false

  const r = normalizeTenantRole(role)
  if (r === 'viewer') return false

  const financeModules = ['finance', 'transactions', 'cash', 'cashShifts', 'invoices']
  if (financeModules.includes(module)) return canPushFinance(r)

  const adminModules = ['branches', 'personnel', 'notificationSettings']
  if (adminModules.includes(module)) return canManageTenantSettings(r)

  return true
}

export function roleGuardResponse(message = 'Bu işlem için yetkiniz yok') {
  return { ok: false as const, status: 403, message }
}
