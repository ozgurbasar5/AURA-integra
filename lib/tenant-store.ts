/**
 * Tenant-scoped localStorage keys — çok kiracılı tarayıcı izolasyonu
 */
const BASE_STORE_KEY = 'servissoft_store'
const BASE_VERSION_KEY = 'servissoft_store_version'
const TENANT_ID_KEY = 'aura_active_tenant_id'

export function setActiveTenantId(tenantId: string | null): void {
  if (typeof window === 'undefined') return
  if (tenantId) {
    localStorage.setItem(TENANT_ID_KEY, tenantId)
  } else {
    localStorage.removeItem(TENANT_ID_KEY)
  }
}

export function getActiveTenantId(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(TENANT_ID_KEY)
}

export function getStoreStorageKey(): string {
  const tid = getActiveTenantId()
  return tid ? `${BASE_STORE_KEY}:${tid}` : BASE_STORE_KEY
}

export function getStoreVersionKey(): string {
  const tid = getActiveTenantId()
  return tid ? `${BASE_VERSION_KEY}:${tid}` : BASE_VERSION_KEY
}

/** Logout veya tenant değişiminde tüm tenant store anahtarlarını temizle */
export function purgeTenantStore(tenantId?: string | null): void {
  if (typeof window === 'undefined') return
  const keysToRemove: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k) continue
    if (tenantId) {
      if (k === `${BASE_STORE_KEY}:${tenantId}` || k === `${BASE_VERSION_KEY}:${tenantId}`) {
        keysToRemove.push(k)
      }
    } else if (k.startsWith(`${BASE_STORE_KEY}:`) || k.startsWith(`${BASE_VERSION_KEY}:`) || k === BASE_STORE_KEY || k === BASE_VERSION_KEY) {
      keysToRemove.push(k)
    }
  }
  keysToRemove.forEach(k => localStorage.removeItem(k))
  localStorage.removeItem(TENANT_ID_KEY)
}

const CARI_CATS = new Set(['Cari Borç', 'Cari Tahsilat'])

/**
 * Nakit kasa bakiyesini işlemlerden türet.
 * Yalnızca nakit ödemeler sayılır; kart/havale/veresiye ve cari defter hareketleri hariç.
 * payment_method eksikse (eski kayıt) nakit kabul edilir.
 */
export function computeKasaFromTransactions(
  transactions: Array<{ type: string; amount: number; payment_method?: string; category?: string }>,
): number {
  return transactions.reduce((sum, t) => {
    if (t.category && CARI_CATS.has(t.category)) return sum
    const pm = (t.payment_method ?? 'nakit').toLocaleLowerCase('tr-TR')
    if (pm !== 'nakit') return sum
    if (t.type === 'gelir') return sum + t.amount
    if (t.type === 'gider') return sum - t.amount
    return sum
  }, 0)
}

/** tenant_settings JSONB deep merge */
export function deepMergeSettings(
  existing: Record<string, unknown>,
  incoming: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...existing }
  for (const [key, val] of Object.entries(incoming)) {
    if (
      val &&
      typeof val === 'object' &&
      !Array.isArray(val) &&
      existing[key] &&
      typeof existing[key] === 'object' &&
      !Array.isArray(existing[key])
    ) {
      out[key] = deepMergeSettings(
        existing[key] as Record<string, unknown>,
        val as Record<string, unknown>,
      )
    } else {
      out[key] = val
    }
  }
  return out
}
