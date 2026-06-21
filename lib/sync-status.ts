/** Client-side Supabase sync durumu — store-hydrate tarafından güncellenir */

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'pending' | 'error'

type Listener = (state: SyncState) => void

export type SyncState = {
  status: SyncStatus
  lastSyncAt: string | null
  lastError: string | null
  pendingCount: number
  pendingModules: string[]
  failedModules: string[]
  isOnline: boolean
}

let state: SyncState = {
  status: 'idle',
  lastSyncAt: null,
  lastError: null,
  pendingCount: 0,
  pendingModules: [],
  failedModules: [],
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
}

const listeners = new Set<Listener>()

function emit() {
  listeners.forEach(fn => fn({ ...state }))
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    state = { ...state, isOnline: true }
    emit()
  })
  window.addEventListener('offline', () => {
    state = { ...state, isOnline: false, status: state.pendingCount > 0 ? 'pending' : state.status }
    emit()
  })
}

export function getSyncState(): SyncState {
  return { ...state }
}

export function subscribeSyncState(fn: Listener): () => void {
  listeners.add(fn)
  fn({ ...state })
  return () => listeners.delete(fn)
}

export function setSyncSyncing() {
  state = { ...state, status: 'syncing', lastError: null, failedModules: [] }
  emit()
}

export function setSyncSynced() {
  state = {
    ...state,
    status: state.pendingCount > 0 ? 'pending' : 'synced',
    lastSyncAt: new Date().toISOString(),
    lastError: null,
  }
  emit()
}

export function setSyncError(message: string, failedModules?: string[]) {
  state = {
    ...state,
    status: 'error',
    lastError: message,
    failedModules: failedModules ?? state.failedModules,
  }
  emit()
}

export function addPendingModule(module: string) {
  const mods = state.pendingModules.includes(module)
    ? state.pendingModules
    : [...state.pendingModules, module]
  state = { ...state, pendingModules: mods, pendingCount: mods.length, status: 'pending' }
  emit()
}

export function clearPendingModule(module: string) {
  const mods = state.pendingModules.filter(m => m !== module)
  state = {
    ...state,
    pendingModules: mods,
    pendingCount: mods.length,
    status: mods.length > 0 ? 'pending' : (state.lastError ? 'error' : 'synced'),
  }
  emit()
}

export function incrementPending(module?: string) {
  if (module) {
    addPendingModule(module)
    return
  }
  state = { ...state, pendingCount: state.pendingCount + 1, status: 'pending' }
  emit()
}

export function decrementPending(module?: string) {
  if (module) {
    clearPendingModule(module)
    return
  }
  state = {
    ...state,
    pendingCount: Math.max(0, state.pendingCount - 1),
    status: state.pendingCount <= 1 ? 'synced' : 'pending',
  }
  emit()
}
