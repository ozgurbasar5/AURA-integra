import {
  LayoutDashboard, ClipboardCheck, Wrench, ShoppingCart, ScanBarcode, Wallet,
  type LucideIcon,
} from 'lucide-react'

/** Telefon alt gezinme — yüksek frekanslı akışlar (rol filtreli) */

export type WebMobileTabId = 'index' | 'kabul' | 'atolye' | 'satis' | 'sayim' | 'kasa'

const OWNER = new Set(['tenant_admin', 'admin', 'mudur', 'owner'])

const TAB_ROLES: Record<WebMobileTabId, Set<string> | '*'> = {
  index: '*',
  kabul: new Set(['satis', 'kasiyer', 'teknisyen', ...OWNER]),
  atolye: new Set(['teknisyen', 'viewer', 'satis', ...OWNER]),
  satis: new Set(['satis', 'kasiyer', ...OWNER]),
  sayim: new Set(['teknisyen', 'satis', 'kasiyer', ...OWNER]),
  kasa: new Set(['kasiyer', 'muhasebe', ...OWNER]),
}

export const MOBILE_BOTTOM_TABS: Array<{
  id: WebMobileTabId
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
  testId: string
}> = [
  { id: 'index', href: '/dashboard', label: 'Ana', icon: LayoutDashboard, exact: true, testId: 'mobile-nav-ana' },
  { id: 'kabul', href: '/dashboard/kabul', label: 'Kabul', icon: ClipboardCheck, testId: 'mobile-nav-kabul' },
  { id: 'atolye', href: '/dashboard/atolye', label: 'Atölye', icon: Wrench, testId: 'mobile-nav-atolye' },
  { id: 'satis', href: '/dashboard/satis', label: 'Satış', icon: ShoppingCart, testId: 'mobile-nav-satis' },
  { id: 'kasa', href: '/dashboard/kasa', label: 'Kasa', icon: Wallet, testId: 'mobile-nav-kasa' },
  { id: 'sayim', href: '/dashboard/stok/sayim', label: 'Sayım', icon: ScanBarcode, testId: 'mobile-nav-sayim' },
]

export function isWebMobileTabAllowed(tabId: WebMobileTabId, role?: string | null): boolean {
  const r = (role || '').trim().toLowerCase()
  if (!r) return true
  if (OWNER.has(r)) return true
  const allowed = TAB_ROLES[tabId]
  if (allowed === '*') return true
  return allowed.has(r)
}

export function getMobileBottomTabsForRole(role?: string | null) {
  return MOBILE_BOTTOM_TABS.filter(t => isWebMobileTabAllowed(t.id, role))
}

export function isMobileNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}
