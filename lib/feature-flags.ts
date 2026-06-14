export type TenantFeatureFlags = {
  sms?: boolean
  portal?: boolean
  whatsapp?: boolean
  efatura?: boolean
}

const DEFAULT_FLAGS: TenantFeatureFlags = {
  sms: true,
  portal: true,
  whatsapp: true,
  efatura: false,
}

let cachedFlags: TenantFeatureFlags | null = null

export async function fetchTenantFeatureFlags(): Promise<TenantFeatureFlags> {
  if (typeof window === 'undefined') return DEFAULT_FLAGS
  try {
    const res = await fetch('/api/tenant/feature-flags', { credentials: 'same-origin' })
    if (!res.ok) return DEFAULT_FLAGS
    const json = await res.json()
    cachedFlags = { ...DEFAULT_FLAGS, ...(json.flags ?? {}) }
    return cachedFlags as TenantFeatureFlags
  } catch {
    return cachedFlags ?? DEFAULT_FLAGS
  }
}

export function isFeatureEnabled(flags: TenantFeatureFlags, key: keyof TenantFeatureFlags): boolean {
  return flags[key] !== false
}
