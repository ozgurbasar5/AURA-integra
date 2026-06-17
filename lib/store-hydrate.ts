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
      data?: Partial<StoreData>
      partial?: boolean
      queryErrors?: { table: string; err: string }[]
    }
    if (json.data) {
      syncing = true
      hydrateStoreFromRemote(json.data)
      syncing = false
      setSyncSynced()
      if (json.partial && json.queryErrors?.length) {
        const tables = json.queryErrors.map(e => e.table).join(', ')
        setSyncError(`Kısmi senkron: ${tables}`)
        try {
          const { toast } = await import('sonner')
          toast.warning(`Bazı veriler yüklenemedi: ${tables}`)
        } catch { /* no sonner */ }
      }
      return true
    }
  } catch {
    setSyncError('Çevrimdışı')
  }
  return false
}

async function pushKasaBalance() {
  if (syncing) return
  try {
    const store = getStore()
    await fetch('/api/tenant/push', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ module: 'kasaBalance', balance: store.kasaBakiye }),
    })
  } catch {
    /* offline */
  }
}

async function pushModule(module: keyof StoreData | 'notificationSettings') {
  if (syncing) return
  incrementPending()
  try {
    const store = getStore()
    if (module === 'notificationSettings') {
      const res = await fetch('/api/tenant/push', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ module: 'notificationSettings', settings: store.notificationSettings }),
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
  if (['finance', 'transactions', 'sales', 'cash', 'cashShifts'].includes(moduleKey)) {
    await pushKasaBalance()
  }
}

function schedulePush(moduleKey: string) {
  if (!autoSyncEnabled || syncing) return
  pendingModuleKey = moduleKey
  if (pushTimer) clearTimeout(pushTimer)
  pushTimer = setTimeout(() => {
    void flushPendingPush()
  }, 2500)
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
        body = JSON.stringify({ module: 'notificationSettings', settings: store.notificationSettings })
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
  await hydrateFromSupabase()
  seedDemoDataIfEmpty()
  if (autoSyncEnabled) return
  autoSyncEnabled = true
  attachFlushListeners()
  onStoreChange(schedulePush)
}

export function disableAutoSync() {
  autoSyncEnabled = false
  if (pushTimer) clearTimeout(pushTimer)
  pendingModuleKey = null
}
