type RetryOpts = {
  retries?: number
  backoffMs?: number[]
  retryOn?: (res: Response) => boolean
  timeoutMs?: number
}

const DEFAULT_BACKOFF = [500, 1500, 4000]

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Geçici ağ/5xx hatalarında otomatik yeniden dene + zaman aşımı (timeout) koruması */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  opts?: RetryOpts,
): Promise<Response> {
  const retries = opts?.retries ?? 3
  const backoff = opts?.backoffMs ?? DEFAULT_BACKOFF
  const retryOn = opts?.retryOn ?? ((res: Response) => res.status >= 500 || res.status === 429)
  const timeoutMs = opts?.timeoutMs ?? 15000

  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(new Error('İstek zaman aşımına uğradı (timeout)')), timeoutMs)

    try {
      const customSignal = init?.signal
      let signal = controller.signal
      if (customSignal) {
        if (customSignal.aborted) {
          controller.abort(customSignal.reason)
        } else {
          customSignal.addEventListener('abort', () => controller.abort(customSignal.reason))
        }
      }

      const res = await fetch(input, { ...init, signal })
      clearTimeout(timer)

      if (!retryOn(res) || attempt === retries) return res
      await sleep(backoff[attempt] ?? backoff[backoff.length - 1] ?? 2000)
    } catch (err) {
      clearTimeout(timer)
      lastError = err
      if (attempt === retries) throw err
      await sleep(backoff[attempt] ?? backoff[backoff.length - 1] ?? 2000)
    }
  }
  throw lastError instanceof Error ? lastError : new Error('fetch failed')
}
