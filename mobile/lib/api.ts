import { API_BASE_URL, supabase } from './supabase'

const RETRYABLE = new Set([0, 408, 429, 500, 502, 503, 504])
const DEFAULT_TIMEOUT_MS = 18_000
const GET_CACHE_TTL_MS = 25_000

type CacheEntry = { at: number; data: unknown }
const getCache = new Map<string, CacheEntry>()
const inflight = new Map<string, Promise<unknown>>()

let unauthorizedHandler: (() => void) | null = null
let unauthorizedFiredAt = 0

export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn
  unauthorizedFiredAt = 0
}

function fireUnauthorized() {
  const now = Date.now()
  if (now - unauthorizedFiredAt < 4000) return
  unauthorizedFiredAt = now
  unauthorizedHandler?.()
}

function networkHint(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/Network request failed|Failed to fetch|ECONNREFUSED|ENOTFOUND|TLS|certificate|AbortError|timed out/i.test(msg)) {
    return 'Sunucuya ulaşılamıyor. Wi‑Fi / DNS / aile filtresini kontrol edin.'
  }
  return msg || 'Bağlantı hatası'
}

async function cacheScope(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  const uid = session?.user?.id ?? 'anon'
  return uid.slice(0, 12)
}

async function authHeaders(extra?: HeadersInit, skipJson = false): Promise<Headers> {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = new Headers(extra)
  if (!skipJson && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  if (session?.access_token) {
    headers.set('Authorization', `Bearer ${session.access_token}`)
  }
  return headers
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  retries = 1,
  timeoutMs = DEFAULT_TIMEOUT_MS,
): Promise<Response> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(url, { ...init, signal: ctrl.signal })
      clearTimeout(timer)
      if (!RETRYABLE.has(res.status) || attempt === retries) return res
      await new Promise(r => setTimeout(r, 280 * (attempt + 1)))
    } catch (e) {
      clearTimeout(timer)
      lastErr = e
      if (attempt === retries) {
        if (e instanceof Error && e.name === 'AbortError') {
          throw new Error('İstek zaman aşımına uğradı — tekrar deneyin')
        }
        throw new Error(networkHint(e))
      }
      await new Promise(r => setTimeout(r, 280 * (attempt + 1)))
    }
  }
  throw new Error(networkHint(lastErr))
}

export type ApiFetchOptions = RequestInit & {
  /** GET yanıtını kısa süre önbelleğe al (varsayılan: true for GET) */
  cache?: boolean
  /** Önbelleği yok say */
  fresh?: boolean
  timeoutMs?: number
  /** 401'de global oturum kapatma handler'ını atla */
  skipUnauthorizedHandler?: boolean
}

export function invalidateApiCache(prefix?: string) {
  if (!prefix) {
    getCache.clear()
    inflight.clear()
    return
  }
  for (const key of getCache.keys()) {
    if (key.includes(prefix)) getCache.delete(key)
  }
}

export async function apiFetch(path: string, init: ApiFetchOptions = {}) {
  const method = (init.method || 'GET').toUpperCase()
  const useCache = method === 'GET' && init.cache !== false && !init.fresh
  const scope = await cacheScope()
  const cacheKey = `${scope}:${method}:${path}`

  if (useCache) {
    const hit = getCache.get(cacheKey)
    if (hit && Date.now() - hit.at < GET_CACHE_TTL_MS) return hit.data
    const pending = inflight.get(cacheKey)
    if (pending) return pending
  }

  const { cache: _c, fresh: _f, timeoutMs, skipUnauthorizedHandler, ...rest } = init
  const run = (async () => {
    const headers = await authHeaders(rest.headers)
    const res = await fetchWithRetry(
      `${API_BASE_URL}${path}`,
      { ...rest, headers },
      method === 'GET' ? 1 : 2,
      timeoutMs ?? DEFAULT_TIMEOUT_MS,
    )
    const json = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (res.status === 401 && !skipUnauthorizedHandler) fireUnauthorized()
      throw new Error((json as { error?: string }).error || `HTTP ${res.status}`)
    }
    if (useCache) getCache.set(cacheKey, { at: Date.now(), data: json })
    return json
  })()

  if (useCache) {
    inflight.set(cacheKey, run)
    try {
      return await run
    } finally {
      inflight.delete(cacheKey)
    }
  }
  return run
}

/** FormData yükleme — Content-Type otomatik (boundary) bırakılır */
export async function apiUpload(path: string, form: FormData) {
  const headers = await authHeaders(undefined, true)
  const res = await fetchWithRetry(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers,
    body: form,
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    if (res.status === 401) fireUnauthorized()
    throw new Error((json as { error?: string }).error || `HTTP ${res.status}`)
  }
  invalidateApiCache('/api/')
  return json
}

let healthCache: { at: number; value: { ok: boolean; hint?: string | null; status?: number } } | null = null

export async function checkApiHealth(force = false): Promise<{ ok: boolean; hint?: string | null; status?: number }> {
  if (!force && healthCache && Date.now() - healthCache.at < 60_000) {
    return healthCache.value
  }
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 8_000)
    const res = await fetch(`${API_BASE_URL}/api/health/supabase`, { cache: 'no-store', signal: ctrl.signal })
    clearTimeout(t)
    if (res.status === 404) {
      const value = { ok: false, hint: 'API bulunamadı (404) — web deploy güncel mi?', status: 404 }
      healthCache = { at: Date.now(), value }
      return value
    }
    const json = await res.json().catch(() => ({})) as {
      ok?: boolean
      hint?: string | null
      reachability?: { ok?: boolean }
    }
    const reachBad = json.reachability != null && json.reachability.ok === false
    const ok = res.ok && json.ok !== false && !reachBad
    const value = { ok, hint: json.hint ?? (ok ? null : `Sağlık HTTP ${res.status}`), status: res.status }
    healthCache = { at: Date.now(), value }
    return value
  } catch (e) {
    const value = { ok: false, hint: networkHint(e) }
    healthCache = { at: Date.now(), value }
    return value
  }
}
