import { API_BASE_URL, supabase } from './supabase'

const RETRYABLE = new Set([0, 408, 429, 500, 502, 503, 504])

function networkHint(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err)
  if (/Network request failed|Failed to fetch|ECONNREFUSED|ENOTFOUND|TLS|certificate/i.test(msg)) {
    return 'Sunucuya ulaşılamıyor. Wi‑Fi / DNS / aile filtresini kontrol edin.'
  }
  return msg || 'Bağlantı hatası'
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

async function fetchWithRetry(url: string, init: RequestInit, retries = 2): Promise<Response> {
  let lastErr: unknown
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, init)
      if (!RETRYABLE.has(res.status) || attempt === retries) return res
      await new Promise(r => setTimeout(r, 400 * (attempt + 1)))
    } catch (e) {
      lastErr = e
      if (attempt === retries) throw new Error(networkHint(e))
      await new Promise(r => setTimeout(r, 400 * (attempt + 1)))
    }
  }
  throw new Error(networkHint(lastErr))
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = await authHeaders(init.headers)
  const res = await fetchWithRetry(`${API_BASE_URL}${path}`, { ...init, headers })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((json as { error?: string }).error || `HTTP ${res.status}`)
  }
  return json
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
    throw new Error((json as { error?: string }).error || `HTTP ${res.status}`)
  }
  return json
}

export async function checkApiHealth(): Promise<{ ok: boolean; hint?: string | null }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health/supabase`, { cache: 'no-store' })
    const json = await res.json() as { ok?: boolean; hint?: string | null; reachability?: { ok?: boolean } }
    const ok = json.ok !== false && json.reachability?.ok !== false
    return { ok, hint: json.hint }
  } catch (e) {
    return { ok: false, hint: networkHint(e) }
  }
}
