import NetInfo from '@react-native-community/netinfo'
import { flushQueue, listQueuedJobs, type QueuedJob } from './offline-queue'

export type FlushResult = { ok: number; fail: number; remaining: QueuedJob[] }

let debounceTimer: ReturnType<typeof setTimeout> | null = null
let flushing = false

export function formatFlushResult(result: Pick<FlushResult, 'ok' | 'fail'>): string {
  const { ok, fail } = result
  if (ok === 0 && fail === 0) return 'Kuyrukta bekleyen iş yok'
  if (fail === 0) return `${ok} işlem gönderildi`
  if (ok === 0) return `${fail} işlem gönderilemedi — tekrar deneyin`
  return `${ok} gönderildi, ${fail} başarısız`
}

export async function flushQueueWithMeta(): Promise<FlushResult> {
  const { ok, fail } = await flushQueue()
  const remaining = await listQueuedJobs()
  return { ok, fail, remaining }
}

/** Reconnect sonrası otomatik kuyruk gönderimi (debounced) */
export function startOfflineAutoSync(onResult?: (result: FlushResult) => void): () => void {
  const unsub = NetInfo.addEventListener(state => {
    const online = !!state.isConnected && state.isInternetReachable !== false
    if (!online) return
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      void (async () => {
        if (flushing) return
        const jobs = await listQueuedJobs()
        if (!jobs.length) return
        flushing = true
        try {
          const result = await flushQueueWithMeta()
          if (result.ok > 0 || result.fail > 0) onResult?.(result)
        } finally {
          flushing = false
        }
      })()
    }, 2500)
  })

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer)
    unsub()
  }
}
