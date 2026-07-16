/** Mobil sekme erişimi — web role-access ile hizalı */

const OWNER = new Set(['tenant_admin', 'admin', 'mudur', 'owner'])

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

const TAB_ROLES: Record<MobileTab, Set<string> | '*'> = {
  index: '*',
  kabul: new Set(['satis', 'kasiyer', 'teknisyen', ...OWNER]),
  atolye: new Set(['teknisyen', 'viewer', 'satis', ...OWNER]),
  satis: new Set(['satis', 'kasiyer', ...OWNER]),
  sayim: new Set(['teknisyen', 'satis', 'kasiyer', ...OWNER]),
  kasa: new Set(['kasiyer', 'muhasebe', ...OWNER]),
  cari: new Set(['kasiyer', 'muhasebe', 'satis', ...OWNER]),
  vitrin: new Set(['satis', 'kasiyer', ...OWNER]),
  alis: new Set(['muhasebe', 'satis', ...OWNER]),
}

export function normalizeMobileRole(role?: string | null): string {
  return (role || '').trim().toLowerCase()
}

export function isMobileTabAllowed(tab: MobileTab, role?: string | null): boolean {
  const r = normalizeMobileRole(role)
  if (!r) return true
  if (OWNER.has(r)) return true
  const allowed = TAB_ROLES[tab]
  if (allowed === '*') return true
  return allowed.has(r)
}
