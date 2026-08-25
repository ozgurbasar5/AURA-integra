/**
 * Ortak rol / modül matrisi — mobil tab ve web route erişimi tek kaynak.
 */

import { normalizeTenantRole } from './tenant-roles'

export const OWNER_ROLES = ['super_admin', 'tenant_admin', 'admin', 'mudur', 'owner'] as const
export const OWNER_SET = new Set<string>(OWNER_ROLES)

export type AppModule =
  | 'index'
  | 'kabul'
  | 'atolye'
  | 'satis'
  | 'sayim'
  | 'kasa'
  | 'cari'
  | 'vitrin'
  | 'alis'
  | 'stok'
  | 'tedarik'
  | 'musteriler'
  | 'randevu'
  | 'garanti'
  | 'finans'
  | 'raporlar'
  | 'komisyon'
  | 'bildirimler'
  | 'ayarlar'
  | 'magaza'
  | 'yapilacaklar'
  | 'fatura'

/** Modül → web dashboard route prefixleri */
export const MODULE_WEB_ROUTES: Record<AppModule, string[]> = {
  index: ['/dashboard'],
  kabul: ['/dashboard/kabul'],
  atolye: ['/dashboard/atolye'],
  satis: ['/dashboard/satis'],
  sayim: ['/dashboard/stok/sayim'],
  kasa: ['/dashboard/kasa'],
  cari: ['/dashboard/cari'],
  vitrin: ['/dashboard/vitrin', '/dashboard/ikinci-el'],
  alis: ['/dashboard/alis'],
  stok: ['/dashboard/stok'],
  tedarik: ['/dashboard/tedarik'],
  musteriler: ['/dashboard/musteriler'],
  randevu: ['/dashboard/randevu'],
  garanti: ['/dashboard/garanti'],
  finans: ['/dashboard/finans'],
  raporlar: ['/dashboard/raporlar'],
  komisyon: ['/dashboard/komisyon'],
  bildirimler: ['/dashboard/bildirimler'],
  ayarlar: ['/dashboard/ayarlar'],
  magaza: ['/dashboard/magaza'],
  yapilacaklar: ['/dashboard/yapilacaklar'],
  fatura: ['/dashboard/fatura'],
}

const MODULE_ROLES: Record<AppModule, Set<string> | '*'> = {
  index: '*',
  kabul: new Set(['satis', 'kasiyer', 'teknisyen', ...OWNER_ROLES]),
  atolye: new Set(['teknisyen', 'viewer', 'satis', ...OWNER_ROLES]),
  satis: new Set(['satis', 'kasiyer', ...OWNER_ROLES]),
  sayim: new Set(['teknisyen', 'satis', 'kasiyer', ...OWNER_ROLES]),
  kasa: new Set(['kasiyer', 'muhasebe', ...OWNER_ROLES]),
  cari: new Set(['kasiyer', 'muhasebe', 'satis', ...OWNER_ROLES]),
  vitrin: new Set(['satis', 'kasiyer', ...OWNER_ROLES]),
  alis: new Set(['muhasebe', 'satis', ...OWNER_ROLES]),
  stok: new Set(['teknisyen', 'satis', 'kasiyer', 'muhasebe', ...OWNER_ROLES]),
  tedarik: new Set(['muhasebe', 'satis', 'teknisyen', ...OWNER_ROLES]),
  musteriler: new Set(['satis', 'kasiyer', 'muhasebe', ...OWNER_ROLES]),
  randevu: new Set(['satis', 'teknisyen', 'kasiyer', ...OWNER_ROLES]),
  garanti: new Set(['teknisyen', 'satis', ...OWNER_ROLES]),
  finans: new Set(['muhasebe', 'kasiyer', ...OWNER_ROLES]),
  raporlar: new Set(['muhasebe', ...OWNER_ROLES]),
  komisyon: new Set([...OWNER_ROLES]),
  bildirimler: '*',
  ayarlar: new Set([...OWNER_ROLES, 'mudur']),
  magaza: new Set(['satis', ...OWNER_ROLES]),
  yapilacaklar: new Set(['teknisyen', ...OWNER_ROLES]),
  fatura: new Set(['muhasebe', ...OWNER_ROLES]),
}

const COMMON_WEB_ROUTES = [
  '/dashboard/bildirimler',
  '/dashboard/yenilikler',
  '/dashboard/destek',
]

export function normalizeRole(role?: string | null): string {
  return normalizeTenantRole(role || '')
}

export function isOwnerRole(role: string): boolean {
  return OWNER_SET.has(normalizeRole(role))
}

export function isModuleAllowed(module: AppModule, role?: string | null): boolean {
  const r = normalizeRole(role)
  if (!r) return true
  if (OWNER_SET.has(r)) return true
  const allowed = MODULE_ROLES[module]
  if (allowed === '*') return true
  return allowed.has(r)
}

/** Web dashboard route listesi — role-access türetimi */
export function getWebRoutesForRole(role: string): string[] | '*' {
  if (isOwnerRole(role)) return '*'
  const routes = new Set<string>(['/dashboard', ...COMMON_WEB_ROUTES])
  for (const [mod, paths] of Object.entries(MODULE_WEB_ROUTES) as [AppModule, string[]][]) {
    if (mod === 'index') continue
    if (isModuleAllowed(mod, role)) {
      paths.forEach(p => routes.add(p))
    }
  }
  return [...routes]
}

export function isRouteAllowedForRole(pathname: string, role: string): boolean {
  const allowed = getWebRoutesForRole(role)
  if (allowed === '*') return true
  return allowed.some(
    r => pathname === r || (r !== '/dashboard' && pathname.startsWith(`${r}/`)),
  )
}

export function isNavAllowed(href: string, role: string): boolean {
  return isRouteAllowedForRole(href, role)
}

/** Mobil tab adı → modül */
export function mobileTabToModule(tab: string): AppModule | null {
  if (tab in MODULE_ROLES) return tab as AppModule
  return null
}

export function isMobileTabAllowed(tab: string, role?: string | null): boolean {
  const mod = mobileTabToModule(tab)
  if (!mod) return true
  return isModuleAllowed(mod, role)
}

export function getSidebarGroupsForRole(role: string): string[] | null {
  const r = normalizeRole(role)
  if (isOwnerRole(r)) return null
  if (r === 'teknisyen') return ['ANA', 'ATÖLYE']
  if (r === 'satis') return ['ANA', 'SATIŞ']
  if (r === 'kasiyer') return ['ANA', 'KASA']
  if (r === 'muhasebe') return ['ANA', 'FİNANS']
  if (r === 'viewer') return ['ANA']
  return ['ANA']
}

export function getRoleHomeLabel(role: string): string {
  const r = normalizeRole(role)
  if (r === 'teknisyen') return 'Atölye Paneli'
  if (r === 'satis') return 'Satış Paneli'
  if (r === 'muhasebe') return 'Finans Paneli'
  if (r === 'kasiyer') return 'Kasa Paneli'
  return 'Yönetim Paneli'
}

export function canSeeFinance(role: string): boolean {
  const r = normalizeRole(role)
  return isOwnerRole(r) || r === 'muhasebe'
}

export function canDeliverService(role: string): boolean {
  const r = normalizeRole(role)
  return isOwnerRole(r) || r === 'satis' || r === 'kasiyer'
}

export function canEditPricing(role: string): boolean {
  const r = normalizeRole(role)
  return isOwnerRole(r) || r === 'satis' || r === 'muhasebe'
}

export function canManageUsers(role: string): boolean {
  return isOwnerRole(role)
}
