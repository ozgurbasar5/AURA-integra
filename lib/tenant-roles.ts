/** Bayi paneli RBAC — tek kaynak rol tanımları */

export const TENANT_ROLE_VALUES = [
  'tenant_admin',
  'admin',
  'mudur',
  'teknisyen',
  'satis',
  'kasiyer',
  'muhasebe',
  'viewer',
] as const

export type TenantRole = (typeof TENANT_ROLE_VALUES)[number]

/** Admin panelinden veya eski kayıtlardan gelen İngilizce roller → bayi RBAC */
export const LEGACY_ROLE_MAP: Record<string, TenantRole> = {
  owner: 'tenant_admin',
  manager: 'mudur',
  staff: 'teknisyen',
  technician: 'teknisyen',
  cashier: 'kasiyer',
}

export const TENANT_ROLE_OPTIONS: { value: TenantRole; label: string; color: string }[] = [
  { value: 'tenant_admin', label: 'Sahip / Yönetici', color: 'bg-purple-100 text-purple-700' },
  { value: 'mudur', label: 'Müdür', color: 'bg-blue-100 text-blue-700' },
  { value: 'teknisyen', label: 'Teknisyen', color: 'bg-green-100 text-green-700' },
  { value: 'satis', label: 'Satış', color: 'bg-emerald-100 text-emerald-700' },
  { value: 'kasiyer', label: 'Kasiyer', color: 'bg-amber-100 text-amber-700' },
  { value: 'muhasebe', label: 'Muhasebe', color: 'bg-teal-100 text-teal-700' },
  { value: 'viewer', label: 'Sadece Görüntüleme', color: 'bg-slate-100 text-slate-700' },
]

export function normalizeTenantRole(role: string | null | undefined): string {
  if (!role) return 'viewer'
  const trimmed = role.trim()
  if ((TENANT_ROLE_VALUES as readonly string[]).includes(trimmed)) return trimmed
  return LEGACY_ROLE_MAP[trimmed] ?? trimmed
}

export function isValidTenantRole(role: string): role is TenantRole {
  return (TENANT_ROLE_VALUES as readonly string[]).includes(role)
}

export function sanitizeTenantRole(role: string | null | undefined): TenantRole {
  const normalized = normalizeTenantRole(role)
  return isValidTenantRole(normalized) ? normalized : 'viewer'
}
