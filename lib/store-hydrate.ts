/**
 * Bayi dashboard — Supabase ↔ localStorage otomatik senkronizasyon
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
  incrementPending,
  decrementPending,
} from './sync-status'

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
let autoSyncEnabled = false
let flushListenersAttached = false
let syncInitStarted = false
let rehydrateTimer: ReturnType<typeof setInterval> | null = null
const SYNC_TOKEN_KEY = 'aura_sync_token'
const REHYDRATE_MS = 3 * 60 * 1000

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

export async function hydrateFromSupabase(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  setSyncSyncing()
  try {
    const res = await fetch('/api/tenant/sync', { credentials: 'same-origin' })
    if (!res.ok) {
      setSyncError('Senkronizasyon başarısız')
      return false
    }
    const json = await res.json() as {
      tenantId?: string
      data?: Partial<StoreData>
      partial?: boolean
      queryErrors?: { table: string; err: string }[]
      sync_token?: string
    }
    if (json.tenantId) setActiveTenantId(json.tenantId)
    if (json.sync_token && typeof window !== 'undefined') {
      localStorage.setItem(SYNC_TOKEN_KEY, json.sync_token)
    }
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
      return true
    }
  } catch {
    setSyncError('Çevrimdışı')
  }
  return false
}

async function pushModule(module: keyof StoreData | 'notificationSettings') {
  if (syncing) return
  if (module === 'serviceOrders') return
  incrementPending()
  try {
    const store = getStore()
    if (module === 'notificationSettings') {
      const res = await fetch('/api/tenant/push', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'notificationSettings', settings: settingsForPush(store.notificationSettings) }),
      })
      if (!res.ok) setSyncError('Ayarlar kaydedilemedi')
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
      if (!res.ok) setSyncError('Servis giderleri kaydedilemedi')
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
    if (!res.ok) setSyncError('Veri kaydedilemedi')
  } catch {
    setSyncError('Çevrimdışı')
  } finally {
    decrementPending()
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
  })
}

/** Dashboard açılışında çağır — önce çek, sonra dinlemeye başla */
export async function initTenantDataSync(): Promise<void> {
  if (typeof window === 'undefined') return
  if (syncInitStarted) return
  syncInitStarted = true
  await hydrateFromSupabase()
  seedDemoDataIfEmpty()
  if (!autoSyncEnabled) {
    autoSyncEnabled = true
    attachFlushListeners()
    onStoreChange(schedulePush)
  }
  if (!rehydrateTimer) {
    rehydrateTimer = setInterval(() => {
      if (!syncing && document.visibilityState === 'visible') {
        void hydrateFromSupabase()
      }
    }, REHYDRATE_MS)
  }
}

export function disableAutoSync() {
  autoSyncEnabled = false
  if (pushTimer) clearTimeout(pushTimer)
  pendingModuleKey = null
  if (rehydrateTimer) {
    clearInterval(rehydrateTimer)
    rehydrateTimer = null
  }
}
