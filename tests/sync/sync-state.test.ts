import { describe, it, expect, beforeEach } from 'vitest'
import {
  getSyncState,
  setSyncSyncing,
  setSyncSynced,
  setSyncError,
  setSyncOffline,
  setSyncIdle,
  addPendingModule,
  clearPendingModule,
} from '@/lib/sync-status'

describe('Sync State Machine', () => {
  beforeEach(() => {
    setSyncIdle()
  })

  it('1. Initial / Idle state is deterministic', () => {
    setSyncIdle()
    const state = getSyncState()
    expect(state.status).toBe('idle')
    expect(state.lastError).toBeNull()
  })

  it('2. Transition to syncing clears previous errors', () => {
    setSyncError('Önceki hata')
    expect(getSyncState().status).toBe('error')

    setSyncSyncing()
    const state = getSyncState()
    expect(state.status).toBe('syncing')
    expect(state.lastError).toBeNull()
  })

  it('3. Transition to synced updates lastSyncAt and status', () => {
    setSyncSyncing()
    setSyncSynced()
    const state = getSyncState()
    expect(state.status).toBe('synced')
    expect(state.lastSyncAt).toBeTruthy()
    expect(state.lastError).toBeNull()
  })

  it('4. Transition to offline sets offline status and user message', () => {
    setSyncOffline()
    const state = getSyncState()
    expect(state.status).toBe('offline')
    expect(state.isOnline).toBe(false)
    expect(state.lastError).toContain('Çevrimdışı')
  })

  it('5. Pending modules track properly without leaving syncing hanging', () => {
    addPendingModule('stock')
    let state = getSyncState()
    expect(state.status).toBe('pending')
    expect(state.pendingModules).toContain('stock')
    expect(state.pendingCount).toBe(1)

    clearPendingModule('stock')
    state = getSyncState()
    expect(state.status).toBe('synced')
    expect(state.pendingCount).toBe(0)
  })
})
