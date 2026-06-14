/** Supabase HTTP istekleri — uzun timeout layout/API takılmalarına yol açar */
export const SUPABASE_FETCH_TIMEOUT_MS = 8000

export function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return fetch(input, {
    ...init,
    signal: AbortSignal.timeout(SUPABASE_FETCH_TIMEOUT_MS),
  })
}

export const supabaseGlobalOptions = {
  global: {
    fetch: fetchWithTimeout,
  },
} as const

/** DB sorguları için kısa timeout — layout'ların takılmasını önler */
export async function withTimeout<T>(promise: PromiseLike<T>, ms: number, fallback: T): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      promise,
      new Promise<T>((resolve) => {
        timer = setTimeout(() => resolve(fallback), ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
