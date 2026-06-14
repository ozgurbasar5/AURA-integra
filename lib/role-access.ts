/**
 * Rol bazlı route ve yetki kontrolü
 * Sahip (tenant_admin, admin, mudur) → tam erişim
 */

export const OWNER_ROLES = ['tenant_admin', 'admin', 'mudur'] as const

export type AppRole = string

export function isOwnerRole(role: string): boolean {
  return OWNER_ROLES.includes(role as (typeof OWNER_ROLES)[number])
}

/** Rol → erişilebilir route prefix listesi (* = hepsi) */
const ROLE_ROUTES: Record<string, string[] | '*'> = {
  tenant_admin: '*',
  admin: '*',
  mudur: '*',
  teknisyen: [
    '/dashboard',
    '/dashboard/atolye',
    '/dashboard/yapilacaklar',
    '/dashboard/stok',
    '/dashboard/tedarik',
    '/dashboard/garanti',
    '/dashboard/randevu',
    '/dashboard/bildirimler',
    '/dashboard/destek',
  ],
  satis: [
    '/dashboard',
    '/dashboard/satis',
    '/dashboard/kabul',
    '/dashboard/stok',
    '/dashboard/musteriler',
    '/dashboard/bildirimler',
    '/dashboard/magaza',
    '/dashboard/vitrin',
    '/dashboard/ikinci-el',
    '/dashboard/destek',
  ],
  kasiyer: [
    '/dashboard',
    '/dashboard/satis',
    '/dashboard/kabul',
    '/dashboard/kasa',
    '/dashboard/stok',
    '/dashboard/musteriler',
    '/dashboard/bildirimler',
    '/dashboard/destek',
  ],
  muhasebe: [
    '/dashboard',
    '/dashboard/finans',
    '/dashboard/fatura',
    '/dashboard/raporlar',
    '/dashboard/kasa',
    '/dashboard/musteriler',
    '/dashboard/bildirimler',
    '/dashboard/destek',
  ],
  viewer: ['/dashboard', '/dashboard/stok', '/dashboard/atolye', '/dashboard/bildirimler'],
}

export function getAllowedRoutes(role: string): string[] | '*' {
  if (isOwnerRole(role)) return '*'
  return ROLE_ROUTES[role] ?? ['/dashboard']
}

export function isRouteAllowedForRole(pathname: string, role: string): boolean {
  const allowed = getAllowedRoutes(role)
  if (allowed === '*') return true
  return allowed.some(
    r => pathname === r || (r !== '/dashboard' && pathname.startsWith(`${r}/`)),
  )
}

export function isNavAllowed(href: string, role: string): boolean {
  return isRouteAllowedForRole(href, role)
}

/** Teknisyen paneli — sade sidebar grupları */
export function getSidebarGroupsForRole(role: string): string[] | null {
  if (isOwnerRole(role)) return null
  if (role === 'teknisyen') return ['ANA', 'ATÖLYE']
  if (role === 'satis') return ['ANA', 'SATIŞ']
  if (role === 'kasiyer') return ['ANA', 'KASA']
  if (role === 'muhasebe') return ['ANA', 'FİNANS']
  if (role === 'viewer') return ['ANA']
  return ['ANA']
}

export function getRoleHomeLabel(role: string): string {
  if (role === 'teknisyen') return 'Atölye Paneli'
  if (role === 'satis') return 'Satış Paneli'
  if (role === 'muhasebe') return 'Finans Paneli'
  if (role === 'kasiyer') return 'Kasa Paneli'
  return 'Yönetim Paneli'
}

export function canSeeFinance(role: string): boolean {
  return isOwnerRole(role) || role === 'muhasebe'
}

export function canDeliverService(role: string): boolean {
  return isOwnerRole(role) || role === 'satis' || role === 'kasiyer' || role === 'admin'
}

export function canEditPricing(role: string): boolean {
  return isOwnerRole(role) || role === 'satis' || role === 'muhasebe'
}

export function canManageUsers(role: string): boolean {
  return isOwnerRole(role)
}
