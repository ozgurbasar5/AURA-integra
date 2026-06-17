/**
 * Rate limiting — Upstash Redis (prod) veya in-memory fallback (dev)
 */

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()
const CLEANUP_INTERVAL = 60_000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, b] of buckets) {
    if (b.resetAt < now) buckets.delete(key)
  }
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number }

function checkRateLimitMemory(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  cleanup()
  const now = Date.now()
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs })
    return { ok: true }
  }

  if (bucket.count >= limit) {
    return { ok: false, retryAfterSec: Math.ceil((bucket.resetAt - now) / 1000) }
  }

  bucket.count++
  return { ok: true }
}

async function checkRateLimitUpstash(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null

  const windowKey = `rl:${key}:${Math.floor(Date.now() / (windowSec * 1000))}`
  try {
    const incrRes = await fetch(`${url}/incr/${encodeURIComponent(windowKey)}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!incrRes.ok) return null
    const incrJson = await incrRes.json() as { result?: number }
    const count = Number(incrJson.result ?? 0)

    if (count === 1) {
      await fetch(`${url}/expire/${encodeURIComponent(windowKey)}/${windowSec}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
    }

    if (count > limit) {
      return { ok: false, retryAfterSec: windowSec }
    }
    return { ok: true }
  } catch {
    return null
  }
}

export async function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000))
  const upstash = await checkRateLimitUpstash(key, limit, windowSec)
  if (upstash) return upstash
  return checkRateLimitMemory(key, limit, windowMs)
}

export function rateLimitResponse(retryAfterSec: number): Response {
  return new Response(
    JSON.stringify({ error: 'Çok fazla istek. Lütfen bekleyin.' }),
    {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(retryAfterSec),
      },
    },
  )
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
  return request.headers.get('x-real-ip') || 'unknown'
}
