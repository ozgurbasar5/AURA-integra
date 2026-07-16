/**
 * Rol bazlı route ve yetki kontrolü
 * Sahip (tenant_admin, admin, mudur) → tam erişim
 */

import { normalizeTenantRole } from './tenant-roles'

export const OWNER_ROLES = ['tenant_admin', 'admin', 'mudur'] as const

export type AppRole = string

export function isOwnerRole(role: string): boolean {
  const normalized = normalizeTenantRole(role)
  return OWNER_ROLES.includes(normalized as (typeof OWNER_ROLES)[number])
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
    '/dashboard/yenilikler',
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
    '/dashboard/yenilikler',
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
    '/dashboard/yenilikler',
    '/dashboard/destek',
  ],
  muhasebe: [
    '/dashboard',
    '/dashboard/finans',
    '/dashboard/cari',
    '/dashboard/fatura',
    '/dashboard/raporlar',
    '/dashboard/kasa',
    '/dashboard/musteriler',
    '/dashboard/bildirimler',
    '/dashboard/yenilikler',
    '/dashboard/destek',
  ],
  viewer: [
    '/dashboard',
    '/dashboard/stok',
    '/dashboard/atolye',
    '/dashboard/bildirimler',
    '/dashboard/yenilikler',
  ],
}

export function getAllowedRoutes(role: string): string[] | '*' {
  const normalized = normalizeTenantRole(role)
  if (isOwnerRole(normalized)) return '*'
  return ROLE_ROUTES[normalized] ?? ROLE_ROUTES[role] ?? ['/dashboard']
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
  const r = normalizeTenantRole(role)
  if (isOwnerRole(r)) return null
  if (r === 'teknisyen') return ['ANA', 'ATÖLYE']
  if (r === 'satis') return ['ANA', 'SATIŞ']
  if (r === 'kasiyer') return ['ANA', 'KASA']
  if (r === 'muhasebe') return ['ANA', 'FİNANS']
  if (r === 'viewer') return ['ANA']
  return ['ANA']
}

export function getRoleHomeLabel(role: string): string {
  const r = normalizeTenantRole(role)
  if (r === 'teknisyen') return 'Atölye Paneli'
  if (r === 'satis') return 'Satış Paneli'
  if (r === 'muhasebe') return 'Finans Paneli'
  if (r === 'kasiyer') return 'Kasa Paneli'
  return 'Yönetim Paneli'
}

export function canSeeFinance(role: string): boolean {
  const r = normalizeTenantRole(role)
  return isOwnerRole(r) || r === 'muhasebe'
}

export function canDeliverService(role: string): boolean {
  const r = normalizeTenantRole(role)
  return isOwnerRole(r) || r === 'satis' || r === 'kasiyer' || r === 'admin'
}

export function canEditPricing(role: string): boolean {
  const r = normalizeTenantRole(role)
  return isOwnerRole(r) || r === 'satis' || r === 'muhasebe'
}

export function canManageUsers(role: string): boolean {
  return isOwnerRole(role)
}
