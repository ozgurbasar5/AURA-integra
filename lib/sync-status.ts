/** Client-side Supabase sync durumu — store-hydrate tarafından güncellenir */

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'pending' | 'error'

type Listener = (state: SyncState) => void

export type SyncState = {
  status: SyncStatus
  lastSyncAt: string | null
  lastError: string | null
  pendingCount: number
}

let state: SyncState = {
  status: 'idle',
  lastSyncAt: null,
  lastError: null,
  pendingCount: 0,
}

const listeners = new Set<Listener>()

function emit() {
  listeners.forEach(fn => fn({ ...state }))
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
  state = { ...state, status: 'syncing', lastError: null }
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

export function setSyncError(message: string) {
  state = { ...state, status: 'error', lastError: message }
  emit()
}

export function incrementPending() {
  state = { ...state, pendingCount: state.pendingCount + 1, status: 'pending' }
  emit()
}

export function decrementPending() {
  state = {
    ...state,
    pendingCount: Math.max(0, state.pendingCount - 1),
    status: state.pendingCount <= 1 ? 'synced' : 'pending',
  }
  emit()
}
