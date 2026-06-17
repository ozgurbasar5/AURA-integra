import type { LucideIcon } from 'lucide-react'
import {
  LayoutDashboard, Wrench, Package, DollarSign,
  ShoppingCart, BarChart3, FileText, Settings,
  Bell, HelpCircle, Users, Shield, CalendarDays,
  UserCog, ShoppingBag, CheckSquare, ClipboardList,
  Store, Building2, Megaphone, Tag, Globe,
  ClipboardCheck, Wallet, Truck, Percent, RefreshCw, ScanBarcode,
  Zap, Layers,
} from 'lucide-react'
import { ROUTE_MIN_LEVEL, type PlanLevel } from '@/lib/plan-tiers'
import { isNavAllowed, getSidebarGroupsForRole, isOwnerRole } from '@/lib/role-access'
import { normalizeTenantRole } from '@/lib/tenant-roles'

export type NavItemDef = {
  href: string
  label: string
  icon: LucideIcon
  categoryId: string
  legacyGroup: string
  badge?: number
}

export type NavSection = {
  id: string
  label: string
  icon: LucideIcon
  collapsible: boolean
  items: NavItemDef[]
}

export const NAV_ITEMS: NavItemDef[] = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Anasayfa', categoryId: 'ana', legacyGroup: 'ANA' },
  { href: '/dashboard/bildirimler', icon: Bell, label: 'Bildirimler', categoryId: 'ana', legacyGroup: 'ANA' },
  { href: '/dashboard/kabul', icon: ClipboardCheck, label: 'Hızlı Kabul', categoryId: 'hizli', legacyGroup: 'HIZLI İŞLEMLER' },
  { href: '/dashboard/alis', icon: ShoppingBag, label: 'Alış', categoryId: 'hizli', legacyGroup: 'HIZLI İŞLEMLER' },
  { href: '/dashboard/satis', icon: ShoppingCart, label: 'Satış & POS', categoryId: 'hizli', legacyGroup: 'HIZLI İŞLEMLER' },
  { href: '/dashboard/kasa', icon: Wallet, label: 'Kasa Vardiyası', categoryId: 'hizli', legacyGroup: 'HIZLI İŞLEMLER' },
  { href: '/dashboard/stok', icon: Package, label: 'Stok', categoryId: 'stok', legacyGroup: 'MODÜLLER' },
  { href: '/dashboard/stok/sayim', icon: ScanBarcode, label: 'Stok Sayım', categoryId: 'stok', legacyGroup: 'MODÜLLER' },
  { href: '/dashboard/atolye', icon: Wrench, label: 'Teknik Servis', categoryId: 'atolye', legacyGroup: 'MODÜLLER' },
  { href: '/dashboard/tedarik', icon: Truck, label: 'Tedarik', categoryId: 'stok', legacyGroup: 'MODÜLLER' },
  { href: '/dashboard/finans', icon: DollarSign, label: 'Gelir/Gider', categoryId: 'finans', legacyGroup: 'MODÜLLER' },
  { href: '/dashboard/musteriler', icon: Users, label: 'Müşteriler', categoryId: 'satis-musteri', legacyGroup: 'MODÜLLER' },
  { href: '/dashboard/yapilacaklar', icon: CheckSquare, label: 'Yapılacaklar', categoryId: 'yonetim', legacyGroup: 'YÖNETİM' },
  { href: '/dashboard/calinti-kontrol', icon: Globe, label: 'Yurt Dışı / TR Kayıt', categoryId: 'satis-musteri', legacyGroup: 'YÖNETİM' },
  { href: '/dashboard/siparisler', icon: ClipboardList, label: 'Müşteri Siparişleri', categoryId: 'satis-musteri', legacyGroup: 'YÖNETİM' },
  { href: '/dashboard/magaza', icon: Store, label: 'Mağaza', categoryId: 'magaza', legacyGroup: 'MAĞAZA' },
  { href: '/dashboard/vitrin', icon: Store, label: 'Vitrin Cihazları', categoryId: 'magaza', legacyGroup: 'MAĞAZA' },
  { href: '/dashboard/vitrin', icon: RefreshCw, label: 'Vitrin / İkinci El', categoryId: 'magaza', legacyGroup: 'MAĞAZA' },
  { href: '/dashboard/varliklar', icon: Building2, label: 'Varlık Yönetimi', categoryId: 'magaza', legacyGroup: 'MAĞAZA' },
  { href: '/dashboard/kampanyalar', icon: Megaphone, label: 'Kampanyalar', categoryId: 'magaza', legacyGroup: 'MAĞAZA' },
  { href: '/dashboard/firsatlar', icon: Tag, label: 'Fırsatlar', categoryId: 'magaza', legacyGroup: 'MAĞAZA' },
  { href: '/dashboard/personel', icon: UserCog, label: 'Çalışanlar', categoryId: 'yonetim', legacyGroup: 'YÖNETİCİ' },
  { href: '/dashboard/komisyon', icon: Percent, label: 'Komisyon', categoryId: 'yonetim', legacyGroup: 'YÖNETİCİ' },
  { href: '/dashboard/subeler', icon: Building2, label: 'Şubeler', categoryId: 'yonetim', legacyGroup: 'YÖNETİCİ' },
  { href: '/dashboard/fatura', icon: FileText, label: 'E-Fatura', categoryId: 'finans', legacyGroup: 'YÖNETİCİ' },
  { href: '/dashboard/raporlar', icon: BarChart3, label: 'Raporlar', categoryId: 'finans', legacyGroup: 'YÖNETİCİ' },
  { href: '/dashboard/garanti', icon: Shield, label: 'Garanti', categoryId: 'atolye', legacyGroup: 'YÖNETİCİ' },
  { href: '/dashboard/randevu', icon: CalendarDays, label: 'Randevular', categoryId: 'atolye', legacyGroup: 'YÖNETİCİ' },
  { href: '/dashboard/musteri-portali', icon: Globe, label: 'Müşteri Portalı', categoryId: 'sistem', legacyGroup: 'SİSTEM' },
  { href: '/dashboard/ayarlar', icon: Settings, label: 'Ayarlar', categoryId: 'sistem', legacyGroup: 'SİSTEM' },
  { href: '/dashboard/dokumantasyon', icon: FileText, label: 'Dokümantasyon', categoryId: 'sistem', legacyGroup: 'SİSTEM' },
  { href: '/dashboard/destek', icon: HelpCircle, label: 'Destek', categoryId: 'sistem', legacyGroup: 'SİSTEM' },
]

export const CLASSIC_GROUPS = [
  'ANA', 'HIZLI İŞLEMLER', 'MODÜLLER', 'YÖNETİM', 'MAĞAZA', 'YÖNETİCİ', 'SİSTEM',
  'ATÖLYE', 'SATIŞ', 'KASA', 'FİNANS',
] as const

const TEKNISYEN_GROUP: Record<string, string> = {
  '/dashboard/atolye': 'ATÖLYE',
  '/dashboard/yapilacaklar': 'ATÖLYE',
  '/dashboard/stok': 'ATÖLYE',
  '/dashboard/tedarik': 'ATÖLYE',
  '/dashboard/garanti': 'ATÖLYE',
  '/dashboard/randevu': 'ATÖLYE',
}

const SATIS_GROUP: Record<string, string> = {
  '/dashboard/satis': 'SATIŞ',
  '/dashboard/kabul': 'SATIŞ',
  '/dashboard/stok': 'SATIŞ',
  '/dashboard/musteriler': 'SATIŞ',
  '/dashboard/magaza': 'SATIŞ',
  '/dashboard/vitrin': 'SATIŞ',
  '/dashboard/ikinci-el': 'SATIŞ',
}

const KASA_GROUP: Record<string, string> = {
  '/dashboard/satis': 'KASA',
  '/dashboard/kabul': 'KASA',
  '/dashboard/kasa': 'KASA',
  '/dashboard/stok': 'KASA',
  '/dashboard/musteriler': 'KASA',
}

const FINANS_GROUP: Record<string, string> = {
  '/dashboard/finans': 'FİNANS',
  '/dashboard/fatura': 'FİNANS',
  '/dashboard/raporlar': 'FİNANS',
  '/dashboard/kasa': 'FİNANS',
  '/dashboard/musteriler': 'FİNANS',
}

const OWNER_CATEGORIES: Omit<NavSection, 'items'>[] = [
  { id: 'ana', label: 'Ana', icon: LayoutDashboard, collapsible: false },
  { id: 'hizli', label: 'Hızlı İşlemler', icon: Zap, collapsible: true },
  { id: 'stok', label: 'Stok', icon: Package, collapsible: true },
  { id: 'atolye', label: 'Atölye', icon: Wrench, collapsible: true },
  { id: 'finans', label: 'Finans', icon: DollarSign, collapsible: true },
  { id: 'satis-musteri', label: 'Satış & Müşteri', icon: Users, collapsible: true },
  { id: 'magaza', label: 'Mağaza', icon: Store, collapsible: true },
  { id: 'yonetim', label: 'Yönetim', icon: UserCog, collapsible: true },
  { id: 'sistem', label: 'Sistem', icon: Layers, collapsible: true },
]

const ROLE_GROUP_META: Record<string, Omit<NavSection, 'items'>> = {
  ANA: { id: 'ana', label: 'Ana', icon: LayoutDashboard, collapsible: false },
  ATÖLYE: { id: 'atolye', label: 'Atölye', icon: Wrench, collapsible: true },
  SATIŞ: { id: 'satis', label: 'Satış', icon: ShoppingCart, collapsible: true },
  KASA: { id: 'kasa', label: 'Kasa', icon: Wallet, collapsible: true },
  FİNANS: { id: 'finans', label: 'Finans', icon: DollarSign, collapsible: true },
}

export function resolveLegacyGroup(href: string, role: string): string {
  const normalized = normalizeTenantRole(role)
  if (normalized === 'teknisyen') return TEKNISYEN_GROUP[href] ?? NAV_ITEMS.find(i => i.href === href)?.legacyGroup ?? 'ANA'
  if (normalized === 'satis') return SATIS_GROUP[href] ?? NAV_ITEMS.find(i => i.href === href)?.legacyGroup ?? 'ANA'
  if (normalized === 'kasiyer') return KASA_GROUP[href] ?? NAV_ITEMS.find(i => i.href === href)?.legacyGroup ?? 'ANA'
  if (normalized === 'muhasebe') return FINANS_GROUP[href] ?? NAV_ITEMS.find(i => i.href === href)?.legacyGroup ?? 'ANA'
  return NAV_ITEMS.find(i => i.href === href)?.legacyGroup ?? 'ANA'
}

export function filterAllowedNavItems(role: string, planLevel: PlanLevel): NavItemDef[] {
  const normalized = normalizeTenantRole(role)
  return NAV_ITEMS.filter(item => {
    if (!isNavAllowed(item.href, normalized)) return false
    const required = ROUTE_MIN_LEVEL[item.href]
    if (required === undefined) return true
    return planLevel >= required
  })
}

export function buildClassicSections(role: string, planLevel: PlanLevel): NavSection[] {
  const items = filterAllowedNavItems(role, planLevel)
  const normalized = normalizeTenantRole(role)
  const visibleGroups = getSidebarGroupsForRole(normalized) ?? CLASSIC_GROUPS.slice(0, 7)

  return visibleGroups
    .map(groupKey => {
      const groupItems = items.filter(i => resolveLegacyGroup(i.href, normalized) === groupKey)
      if (groupItems.length === 0) return null
      const meta = ROLE_GROUP_META[groupKey] ?? {
        id: groupKey.toLowerCase().replace(/\s+/g, '-'),
        label: groupKey,
        icon: Layers,
        collapsible: groupKey !== 'ANA',
      }
      return { ...meta, items: groupItems }
    })
    .filter((s): s is NavSection => s !== null)
}

export function buildCategorizedSections(role: string, planLevel: PlanLevel): NavSection[] {
  const items = filterAllowedNavItems(role, planLevel)
  const normalized = normalizeTenantRole(role)

  if (isOwnerRole(normalized)) {
    return OWNER_CATEGORIES
      .map(cat => ({
        ...cat,
        items: items.filter(i => i.categoryId === cat.id),
      }))
      .filter(s => s.items.length > 0)
  }

  const visibleGroups = getSidebarGroupsForRole(normalized) ?? ['ANA']
  return visibleGroups
    .map(groupKey => {
      const groupItems = items.filter(i => resolveLegacyGroup(i.href, normalized) === groupKey)
      if (groupItems.length === 0) return null
      const meta = ROLE_GROUP_META[groupKey] ?? {
        id: groupKey.toLowerCase(),
        label: groupKey,
        icon: Layers,
        collapsible: groupKey !== 'ANA',
      }
      return { ...meta, items: groupItems }
    })
    .filter((s): s is NavSection => s !== null)
}

export function findSectionForPath(
  sections: NavSection[],
  pathname: string,
): string | null {
  for (const section of sections) {
    for (const item of section.items) {
      if (item.href === '/dashboard') {
        if (pathname === '/dashboard') return section.id
      } else if (pathname === item.href || pathname.startsWith(`${item.href}/`)) {
        return section.id
      }
    }
  }
  return null
}

export const SIDEBAR_STATE_KEY = 'aura_sidebar_state'

export type SidebarPersistedState = {
  expandedCategories: string[]
  collapsed: boolean
}

export function getSidebarState(): SidebarPersistedState {
  if (typeof window === 'undefined') {
    return { expandedCategories: [], collapsed: false }
  }
  try {
    const raw = localStorage.getItem(SIDEBAR_STATE_KEY)
    if (!raw) return { expandedCategories: [], collapsed: false }
    return { expandedCategories: [], collapsed: false, ...JSON.parse(raw) }
  } catch {
    return { expandedCategories: [], collapsed: false }
  }
}

export function saveSidebarState(state: SidebarPersistedState) {
  if (typeof window === 'undefined') return
  localStorage.setItem(SIDEBAR_STATE_KEY, JSON.stringify(state))
}
