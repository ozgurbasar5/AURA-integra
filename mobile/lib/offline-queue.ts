import AsyncStorage from '@react-native-async-storage/async-storage'
import { apiFetch } from './api'

const KEY = 'aura_offline_queue_v1'

export type QueuedJob = {
  id: string
  path: string
  method: string
  body: unknown
  created_at: string
  label?: string
}

export async function listQueuedJobs(): Promise<QueuedJob[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as QueuedJob[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

async function save(jobs: QueuedJob[]) {
  await AsyncStorage.setItem(KEY, JSON.stringify(jobs.slice(0, 50)))
}

export async function enqueueJob(job: Omit<QueuedJob, 'id' | 'created_at'>): Promise<QueuedJob> {
  const full: QueuedJob = {
    ...job,
    id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    created_at: new Date().toISOString(),
  }
  const list = await listQueuedJobs()
  list.unshift(full)
  await save(list)
  return full
}

let flushInProgress: Promise<{ ok: number; fail: number }> | null = null

export async function flushQueue(): Promise<{ ok: number; fail: number }> {
  if (flushInProgress) return flushInProgress

  flushInProgress = (async () => {
    const list = await listQueuedJobs()
    if (!list.length) return { ok: 0, fail: 0 }
    const remaining: QueuedJob[] = []
    let ok = 0
    let fail = 0
    for (let i = 0; i < list.length; i++) {
      const job = list[i]
      try {
        await apiFetch(job.path, {
          method: job.method,
          body: JSON.stringify(job.body),
          skipUnauthorizedHandler: true,
        })
        ok += 1
      } catch (e) {
        const msg = e instanceof Error ? e.message : ''
        if (/401|403|Oturum|HTTP 401/i.test(msg)) {
          remaining.push(...list.slice(i))
          fail += list.length - i
          break
        }
        remaining.push(job)
        fail += 1
      }
    }
    await save(remaining)
    return { ok, fail }
  })()

  try {
    return await flushInProgress
  } finally {
    flushInProgress = null
  }
}
