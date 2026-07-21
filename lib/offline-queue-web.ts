/**
 * Web PWA offline yazma kuyruğu — mobil offline-queue pattern mirror.
 */

export type WebQueuedJob = {
  id: string
  path: string
  method: string
  body: unknown
  created_at: string
  label?: string
}

const KEY = 'aura_web_offline_queue_v1'
const MAX = 50

function read(): WebQueuedJob[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as WebQueuedJob[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function write(jobs: WebQueuedJob[]) {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEY, JSON.stringify(jobs.slice(0, MAX)))
}

export function listWebQueuedJobs(): WebQueuedJob[] {
  return read()
}

export function enqueueWebJob(job: Omit<WebQueuedJob, 'id' | 'created_at'>): WebQueuedJob {
  const full: WebQueuedJob = {
    ...job,
    id: `wq_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
  }
  const list = read()
  list.unshift(full)
  write(list)
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('aura-web-queue-change'))
  }
  return full
}

let flushPromise: Promise<{ ok: number; fail: number; remaining: WebQueuedJob[] }> | null = null

export async function flushWebQueue(): Promise<{ ok: number; fail: number; remaining: WebQueuedJob[] }> {
  if (flushPromise) return flushPromise

  flushPromise = (async () => {
    const list = read()
    if (!list.length) return { ok: 0, fail: 0, remaining: [] }
    const remaining: WebQueuedJob[] = []
    let ok = 0
    let fail = 0

    for (let i = 0; i < list.length; i++) {
      const job = list[i]
      try {
        const res = await fetch(job.path, {
          method: job.method,
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(job.body),
        })
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            remaining.push(...list.slice(i))
            fail += list.length - i
            break
          }
          remaining.push(job)
          fail += 1
          continue
        }
        ok += 1
      } catch {
        remaining.push(job)
        fail += 1
      }
    }

    write(remaining)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('aura-web-queue-change'))
    }
    return { ok, fail, remaining }
  })()

  try {
    return await flushPromise
  } finally {
    flushPromise = null
  }
}

export function isNetworkErrorMessage(msg: string): boolean {
  return /Network|Failed to fetch|fetch failed|offline|ECONNREFUSED|Load failed/i.test(msg)
}
