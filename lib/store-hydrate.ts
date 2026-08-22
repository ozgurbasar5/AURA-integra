/**
 * Bayi dashboard — Supabase Realtime + minimal localStorage sync
 */

import {
  onStoreChange,
  getStore,
  type StoreData,
  hydrateStoreFromRemote,
  seedDemoDataIfEmpty,
} from './store'
import { setActiveTenantId } from './tenant-store'
import {
  setSyncSyncing,
  setSyncSynced,
  setSyncError,
  setSyncOffline,
  setSyncIdle,
  incrementPending,
  decrementPending,
} from './sync-status'
import { subscribeTenantRealtime, unsubscribeTenantRealtime } from './realtime/tenant-channel'
import { fetchWithRetry } from './fetch-with-retry'

const MODULE_MAP: Record<string, keyof StoreData | 'notificationSettings'> = {
  stock: 'stock',
  customers: 'customers',
  finance: 'transactions',
  transactions: 'transactions',
  sales: 'sales',
  service: 'serviceOrders',
  serviceOrders: 'serviceOrders',
  serviceExpenses: 'serviceExpenses',
  statusHistory: 'statusHistory',
  purchases: 'purchases',
  todos: 'todos',
  customerOrders: 'customerOrders',
  storeProducts: 'storeProducts',
  assets: 'assets',
  campaigns: 'campaigns',
  deals: 'deals',
  vitrin: 'secondHandDevices',
  secondHand: 'secondHandDevices',
  secondhand: 'secondHandDevices',
  branches: 'branches',
  settings: 'notificationSettings',
  notifications: 'notificationLogs',
  support: 'supportTickets',
  personnel: 'personnel',
  warranties: 'warranties',
  invoices: 'invoices',
  appointments: 'appointments',
  cash: 'cashShifts',
  cashShifts: 'cashShifts',
  supplier: 'supplierOrders',
  supplierOrders: 'supplierOrders',
  foreignDevices: 'foreignDevices',
}

let pushTimer: ReturnType<typeof setTimeout> | null = null
let pendingModuleKey: string | null = null
let syncing = false
let isHydrating = false
let autoSyncEnabled = false
let flushListenersAttached = false
let syncInitStarted = false
let lastHydrateFailed = false
let realtimeCleanup: (() => void) | null = null
const SYNC_TOKEN_KEY = 'aura_sync_token'
const LAST_SYNC_KEY = 'aura_last_sync_at'

function settingsForPush(settings: StoreData['notificationSettings']): Record<string, unknown> {
  const copy = { ...settings } as Record<string, unknown>
  delete copy.shop_logo
  return copy
}

function isMissingSchemaError(message: string): boolean {
  return /does not exist|could not find the table|schema cache|column.*does not exist/i.test(message)
}

function isPermissionError(message: string): boolean {
  return /permission denied|42501/i.test(message)
}

function getLastSyncAt(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(LAST_SYNC_KEY)
}

function setLastSyncAt(iso: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(LAST_SYNC_KEY, iso)
}

export async function hydrateFromSupabase(full = false): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (isHydrating) return false

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    setSyncOffline()
    return false
  }

  isHydrating = true
  setSyncSyncing()

  try {
    const since = full ? null : getLastSyncAt()
    const qs = since ? `?since=${encodeURIComponent(since)}` : ''
    const res = await fetchWithRetry(`/api/tenant/sync${qs}`, { credentials: 'same-origin' }, { timeoutMs: 12000 })
    if (!res.ok) {
      lastHydrateFailed = true
      setSyncError('Senkronizasyon başarısız')
      return false
    }
    const json = await res.json() as {
      tenantId?: string
      data?: Partial<StoreData>
      partial?: boolean
      incremental?: boolean
      queryErrors?: { table: string; err: string }[]
      sync_token?: string
      synced_at?: string
    }
    if (json.tenantId) {
      setActiveTenantId(json.tenantId)
      if (realtimeCleanup) realtimeCleanup()
      realtimeCleanup = subscribeTenantRealtime(json.tenantId)
    }
    if (json.sync_token && typeof window !== 'undefined') {
      localStorage.setItem(SYNC_TOKEN_KEY, json.sync_token)
    }
    if (json.synced_at) setLastSyncAt(json.synced_at)
    if (json.data) {
      syncing = true
      hydrateStoreFromRemote(json.data)
      syncing = false
      setSyncSynced()
      if (json.partial && json.queryErrors?.length) {
        const schemaMissing = json.queryErrors.filter(e => isMissingSchemaError(e.err))
        const permErrors = json.queryErrors.filter(e => isPermissionError(e.err))
        const otherErrors = json.queryErrors.filter(
          e => !isMissingSchemaError(e.err) && !isPermissionError(e.err),
        )

        try {
          const { toast } = await import('sonner')
          if (schemaMissing.length) {
            const tables = schemaMissing.map(e => e.table).join(', ')
            toast.warning(
              `Şema eksik/hatalı: ${tables}. Supabase SQL Editor'da 20260622_repair_sync_tables.sql çalıştırın.`,
              { id: 'sync-schema-missing', duration: 12000 },
            )
          }
          if (permErrors.length) {
            const tables = permErrors.map(e => e.table).join(', ')
            toast.warning(
              `Tablo izni yok: ${tables}. Supabase SQL Editor'da 20260623_grant_erp_tables.sql çalıştırın.`,
              { id: 'sync-permission', duration: 12000 },
            )
          }
          if (otherErrors.length) {
            const tables = otherErrors.map(e => e.table).join(', ')
            toast.warning(`Bazı veriler yüklenemedi: ${tables}`, { id: 'sync-partial' })
          }
        } catch { /* no sonner */ }

        if (schemaMissing.length) {
          setSyncError(`Eksik tablo: ${schemaMissing.map(e => e.table).join(', ')}`)
        } else if (otherErrors.length) {
          setSyncError(`Kısmi senkron: ${otherErrors.map(e => e.table).join(', ')}`)
        }
      }
      lastHydrateFailed = false
      return true
    }
    lastHydrateFailed = true
    setSyncError('Senkron yanıtı geçersiz')
  } catch (err) {
    console.error('[hydrateFromSupabase] Error:', err)
    lastHydrateFailed = true
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setSyncOffline()
    } else {
      setSyncError('Bağlantı hatası')
    }
  } finally {
    isHydrating = false
    syncing = false
  }
  return false
}

/** Bağlantı geri gelince veya manuel retry için yeniden hydrate */
export async function retryTenantDataSync(full = false): Promise<boolean> {
  if (typeof window === 'undefined') return false
  return hydrateFromSupabase(full)
}

/** API-first modüller — bulk push kapalı */
const PUSH_DISABLED = new Set<string>([
  'serviceOrders',
  'stock',
  'sales',
  'transactions',
  'cashShifts',
  'appointments',
  'warranties',
  'invoices',
  'purchases',
  'secondHandDevices',
  'supplierOrders',
  'serviceExpenses',
  'customers',
])

async function pushModule(module: keyof StoreData | 'notificationSettings') {
  if (syncing) return
  if (PUSH_DISABLED.has(String(module))) return
  incrementPending(String(module))
  try {
    const store = getStore()
    if (module === 'notificationSettings') {
      const res = await fetch('/api/tenant/push', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'notificationSettings', settings: settingsForPush(store.notificationSettings) }),
      })
      if (!res.ok) setSyncError('Ayarlar kaydedilemedi', [String(module)])
      return
    }

    if (module === 'serviceExpenses') {
      const flat = Object.values(store.serviceExpenses).flat()
      if (!flat.length) return
      const res = await fetch('/api/tenant/push', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'serviceExpenses', items: flat }),
      })
      if (!res.ok) setSyncError('Servis giderleri kaydedilemedi', [String(module)])
      return
    }

    const items = store[module as keyof StoreData]
    if (!Array.isArray(items)) return

    const res = await fetch('/api/tenant/push', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module, items }),
    })
    const json = await res.json().catch(() => ({})) as { failedModules?: string[]; error?: string }
    if (!res.ok) {
      setSyncError(json.error || 'Veri kaydedilemedi', json.failedModules ?? [String(module)])
    }
  } catch {
    setSyncError('Çevrimdışı', [String(module)])
  } finally {
    decrementPending(String(module))
  }
}

export async function flushPendingPush(): Promise<void> {
  if (pushTimer) {
    clearTimeout(pushTimer)
    pushTimer = null
  }
  if (!pendingModuleKey || syncing || !autoSyncEnabled) return
  const moduleKey = pendingModuleKey
  pendingModuleKey = null
  const mapped = MODULE_MAP[moduleKey] ?? (moduleKey as keyof StoreData)
  await pushModule(mapped)
}

function schedulePush(moduleKey: string) {
  if (!autoSyncEnabled || syncing) return
  if (PUSH_DISABLED.has(moduleKey)) return
  pendingModuleKey = moduleKey
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    void flushPendingPush()
  }, 4000)
}

function attachFlushListeners() {
  if (flushListenersAttached || typeof window === 'undefined') return
  flushListenersAttached = true
  window.addEventListener('beforeunload', () => {
    if (pendingModuleKey && navigator.sendBeacon) {
      const store = getStore()
      const mapped = MODULE_MAP[pendingModuleKey] ?? pendingModuleKey
      let body: string
      if (mapped === 'notificationSettings') {
        body = JSON.stringify({ module: 'notificationSettings', settings: settingsForPush(store.notificationSettings) })
      } else if (mapped === 'serviceExpenses') {
        body = JSON.stringify({ module: 'serviceExpenses', items: Object.values(store.serviceExpenses).flat() })
      } else {
        const items = store[mapped as keyof StoreData]
        body = JSON.stringify({ module: mapped, items: Array.isArray(items) ? items : [] })
      }
      navigator.sendBeacon('/api/tenant/push', new Blob([body], { type: 'application/json' }))
    }
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') void flushPendingPush()
    else if (document.visibilityState === 'visible' && lastHydrateFailed) {
      void hydrateFromSupabase(false)
    }
  })
  window.addEventListener('online', () => {
    if (lastHydrateFailed || autoSyncEnabled) {
      void hydrateFromSupabase(false).then(ok => {
        if (ok) void flushPendingPush()
      })
    }
  })
}

/** Dashboard açılışında — ilk full sync, sonra Realtime + incremental */
export async function initTenantDataSync(): Promise<void> {
  if (typeof window === 'undefined') return
  if (syncInitStarted && !lastHydrateFailed) return
  syncInitStarted = true
  const hasSyncedBefore = Boolean(getLastSyncAt())
  await hydrateFromSupabase(!hasSyncedBefore)
  seedDemoDataIfEmpty()
  if (!autoSyncEnabled) {
    autoSyncEnabled = true
    attachFlushListeners()
    onStoreChange(schedulePush)
  }
}

export function disableAutoSync() {
  autoSyncEnabled = false
  if (pushTimer) clearTimeout(pushTimer)
  pendingModuleKey = null
  if (realtimeCleanup) {
    realtimeCleanup()
    realtimeCleanup = null
  }
  unsubscribeTenantRealtime()
}
