import { describe, it, expect, beforeEach } from 'vitest'
import {
  enqueueWebJob,
  listWebQueuedJobs,
  isNetworkErrorMessage,
  type WebQueuedJob,
} from '@/lib/offline-queue-web'

// localStorage mock
const store: Record<string, string> = {}

global.localStorage = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, val: string) => { store[key] = val },
  removeItem: (key: string) => { delete store[key] },
  clear: () => Object.keys(store).forEach(k => delete store[k]),
  key: () => null,
  length: 0,
}

describe('offline queue web', () => {
  beforeEach(() => {
    localStorage.clear()
    // window simulasyonu
    Object.defineProperty(global, 'window', {
      value: {
        dispatchEvent: () => {},
        localStorage,
      },
      writable: true,
    })
  })

  it('iş kuyruğa eklenir', () => {
    const job = enqueueWebJob({
      path: '/api/tenant/sales',
      method: 'POST',
      body: { items: [] },
      label: 'Test Satış',
    })
    expect(job.id).toMatch(/^wq_/)
    expect(job.path).toBe('/api/tenant/sales')
    expect(job.created_at).toBeTruthy()
  })

  it('birden fazla iş eklenir ve listelenebilir', () => {
    enqueueWebJob({ path: '/api/1', method: 'POST', body: {} })
    enqueueWebJob({ path: '/api/2', method: 'POST', body: {} })
    const jobs = listWebQueuedJobs()
    expect(jobs.length).toBe(2)
  })

  it('her iş benzersiz ID alır', () => {
    const j1 = enqueueWebJob({ path: '/api/1', method: 'POST', body: {} })
    const j2 = enqueueWebJob({ path: '/api/2', method: 'POST', body: {} })
    expect(j1.id).not.toBe(j2.id)
  })

  it('son eklenen en başta olur (LIFO)', () => {
    enqueueWebJob({ path: '/api/first', method: 'POST', body: {} })
    enqueueWebJob({ path: '/api/second', method: 'POST', body: {} })
    const jobs = listWebQueuedJobs()
    expect(jobs[0].path).toBe('/api/second')
  })
})

describe('isNetworkErrorMessage', () => {
  it('network hatalarını tanır', () => {
    expect(isNetworkErrorMessage('Network error')).toBe(true)
    expect(isNetworkErrorMessage('Failed to fetch')).toBe(true)
    expect(isNetworkErrorMessage('fetch failed')).toBe(true)
    expect(isNetworkErrorMessage('offline')).toBe(true)
    expect(isNetworkErrorMessage('ECONNREFUSED')).toBe(true)
    expect(isNetworkErrorMessage('Load failed')).toBe(true)
  })

  it('normal hataları tanımaz', () => {
    expect(isNetworkErrorMessage('404 Not Found')).toBe(false)
    expect(isNetworkErrorMessage('401 Unauthorized')).toBe(false)
    expect(isNetworkErrorMessage('Validation error')).toBe(false)
  })
})
