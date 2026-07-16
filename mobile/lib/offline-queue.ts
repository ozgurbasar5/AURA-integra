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

export async function flushQueue(): Promise<{ ok: number; fail: number }> {
  const list = await listQueuedJobs()
  if (!list.length) return { ok: 0, fail: 0 }
  const remaining: QueuedJob[] = []
  let ok = 0
  let fail = 0
  for (const job of list) {
    try {
      await apiFetch(job.path, {
        method: job.method,
        body: JSON.stringify(job.body),
      })
      ok += 1
    } catch {
      remaining.push(job)
      fail += 1
    }
  }
  await save(remaining)
  return { ok, fail }
}
