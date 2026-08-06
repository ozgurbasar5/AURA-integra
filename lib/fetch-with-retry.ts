type RetryOpts = {
  retries?: number
  backoffMs?: number[]
  retryOn?: (res: Response) => boolean
}

const DEFAULT_BACKOFF = [500, 1500, 4000]

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/** Geçici ağ/5xx hatalarında otomatik yeniden dene */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  opts?: RetryOpts,
): Promise<Response> {
  const retries = opts?.retries ?? 3
  const backoff = opts?.backoffMs ?? DEFAULT_BACKOFF
  const retryOn = opts?.retryOn ?? ((res: Response) => res.status >= 500 || res.status === 429)

  let lastError: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(input, init)
      if (!retryOn(res) || attempt === retries) return res
      await sleep(backoff[attempt] ?? backoff[backoff.length - 1] ?? 2000)
    } catch (err) {
      lastError = err
      if (attempt === retries) throw err
      await sleep(backoff[attempt] ?? backoff[backoff.length - 1] ?? 2000)
    }
  }
  throw lastError instanceof Error ? lastError : new Error('fetch failed')
}
