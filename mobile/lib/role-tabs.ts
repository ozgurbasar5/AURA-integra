import React from 'react'

export type MobileTab =
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

export const OWNER_ROLES = ['super_admin', 'tenant_admin', 'admin', 'mudur', 'owner'] as const
export const OWNER_SET = new Set<string>(OWNER_ROLES)

const MODULE_ROLES: Record<MobileTab, Set<string> | '*'> = {
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

export function normalizeMobileRole(role?: string | null): string {
  const r = (role || '').trim().toLowerCase()
  if (r === 'superadmin' || r === 'super_admin') return 'super_admin'
  if (r === 'admin' || r === 'tenant_admin') return 'tenant_admin'
  return r
}

export function isOwnerRole(role?: string | null): boolean {
  return OWNER_SET.has(normalizeMobileRole(role))
}

export function isModuleAllowed(module: MobileTab, role?: string | null): boolean {
  const r = normalizeMobileRole(role)
  if (!r) return true
  if (OWNER_SET.has(r)) return true
  const allowed = MODULE_ROLES[module]
  if (allowed === '*') return true
  return allowed ? allowed.has(r) : true
}

export function isMobileTabAllowed(tab: MobileTab, role?: string | null): boolean {
  return isModuleAllowed(tab, role)
}

export type ModuleLink = {
  href: string
  label: string
  sub: string
  tab: MobileTab
  icon: React.ComponentProps<typeof import('@expo/vector-icons/FontAwesome').default>['name']
  accent: string
}

export const ALL_MODULES: ModuleLink[] = [
  { href: '/kabul', label: 'Hızlı Kabul', sub: 'Yeni servis kaydı', tab: 'kabul', icon: 'clipboard', accent: '#0284c7' },
  { href: '/atolye', label: 'Atölye', sub: 'Açık işler & durum', tab: 'atolye', icon: 'wrench', accent: '#0e5568' },
  { href: '/satis', label: 'Satış / POS', sub: 'Barkod & sepet', tab: 'satis', icon: 'shopping-cart', accent: '#059669' },
  { href: '/kasa', label: 'Kasa', sub: 'Vardiya & Z rapor', tab: 'kasa', icon: 'money', accent: '#d97706' },
  { href: '/stok', label: 'Stok', sub: 'Parça & transfer', tab: 'stok', icon: 'cubes', accent: '#6366f1' },
  { href: '/sayim', label: 'Stok sayım', sub: 'Sayım & fark', tab: 'sayim', icon: 'check-square-o', accent: '#7c3aed' },
  { href: '/tedarik', label: 'Tedarik', sub: 'Sipariş & mal kabul', tab: 'tedarik', icon: 'truck', accent: '#0d9488' },
  { href: '/alis', label: 'Alış', sub: 'Alım kaydı', tab: 'alis', icon: 'download', accent: '#b45309' },
  { href: '/cari', label: 'Cari', sub: 'Borç / tahsilat', tab: 'cari', icon: 'users', accent: '#0369a1' },
  { href: '/musteriler', label: 'Müşteriler', sub: 'CRM arama', tab: 'musteriler', icon: 'address-book', accent: '#0891b2' },
  { href: '/vitrin', label: 'Vitrin', sub: '2. el cihazlar', tab: 'vitrin', icon: 'mobile', accent: '#14b8a6' },
  { href: '/randevu', label: 'Randevu', sub: 'Günlük plan', tab: 'randevu', icon: 'calendar', accent: '#e11d48' },
  { href: '/garanti', label: 'Garanti', sub: 'Talepler', tab: 'garanti', icon: 'shield', accent: '#4f46e5' },
  { href: '/finans', label: 'Finans', sub: 'Gelir / gider', tab: 'finans', icon: 'line-chart', accent: '#16a34a' },
  { href: '/raporlar', label: 'Raporlar', sub: 'Özet & gün sonu', tab: 'raporlar', icon: 'bar-chart', accent: '#9333ea' },
  { href: '/komisyon', label: 'Komisyon', sub: 'Personel özeti', tab: 'komisyon', icon: 'pie-chart', accent: '#ca8a04' },
  { href: '/bildirimler', label: 'Bildirimler', sub: 'Push & uyarılar', tab: 'bildirimler', icon: 'bell', accent: '#dc2626' },
  { href: '/ayarlar', label: 'Ayarlar', sub: 'Profil & tercih', tab: 'ayarlar', icon: 'cog', accent: '#64748b' },
]

export function getModulesForRole(role?: string | null): ModuleLink[] {
  return ALL_MODULES.filter(m => isModuleAllowed(m.tab, role))
}
