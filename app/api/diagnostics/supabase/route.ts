export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'

const TIMEOUT_MS = 5000

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> {
  return Promise.race([
    Promise.resolve(promise),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} 5000ms zaman aşımına uğradı`)), timeoutMs)
    ),
  ])
}

export async function GET(req: NextRequest) {
  const totalStart = performance.now()
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const baseUrl = rawUrl.replace(/\/$/, '')

  // 1. Supabase URL Accessibility Ping
  let urlAccessible = { ok: false, latency_ms: 0, error: null as string | null }
  if (baseUrl) {
    const t0 = performance.now()
    try {
      const pingUrl = `${baseUrl}/auth/v1/health`
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
      const res = await fetch(pingUrl, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
      clearTimeout(timer)
      const lat = performance.now() - t0
      urlAccessible = {
        ok: res.ok || res.status < 500,
        latency_ms: Math.round(lat * 10) / 10,
        error: res.ok || res.status < 500 ? null : `HTTP ${res.status}`,
      }
    } catch (e) {
      const lat = performance.now() - t0
      urlAccessible = {
        ok: false,
        latency_ms: Math.round(lat * 10) / 10,
        error: e instanceof Error ? e.message.slice(0, 150) : 'Ağ hatası',
      }
    }
  } else {
    urlAccessible = { ok: false, latency_ms: 0, error: 'NEXT_PUBLIC_SUPABASE_URL tanımlı değil' }
  }

  // 2. Service Client Initialization Check
  const tClientStart = performance.now()
  const admin = getServiceClient()
  const tClientLat = performance.now() - tClientStart
  const serviceClientCreated = {
    ok: Boolean(admin),
    latency_ms: Math.round(tClientLat * 10) / 10,
  }

  // 3. Light Database Query (SELECT id FROM subscription_plans LIMIT 1)
  let lightDbQuery = { ok: false, latency_ms: 0, error: null as string | null }
  if (admin) {
    const tDbStart = performance.now()
    try {
      const queryPromise = admin
        .from('subscription_plans')
        .select('id')
        .limit(1)

      const { data, error } = await withTimeout(queryPromise, TIMEOUT_MS, 'DB Query')
      const lat = performance.now() - tDbStart
      lightDbQuery = {
        ok: !error,
        latency_ms: Math.round(lat * 10) / 10,
        error: error ? error.message : null,
      }
    } catch (e) {
      const lat = performance.now() - tDbStart
      lightDbQuery = {
        ok: false,
        latency_ms: Math.round(lat * 10) / 10,
        error: e instanceof Error ? e.message.slice(0, 150) : 'DB zaman aşımı',
      }
    }
  } else {
    lightDbQuery = { ok: false, latency_ms: 0, error: 'Service client oluşturulamadı' }
  }

  // 4. Auth / Session Resolution Check
  let authSessionCheck = {
    ok: false,
    latency_ms: 0,
    user_authenticated: false,
    error: null as string | null,
  }
  const tAuthStart = performance.now()
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader && authHeader.startsWith('Bearer ') && admin) {
      const token = authHeader.replace(/^Bearer\s+/i, '').trim()
      const userPromise = admin.auth.getUser(token)
      const { data, error } = await withTimeout(userPromise, TIMEOUT_MS, 'Auth Check')
      const lat = performance.now() - tAuthStart
      authSessionCheck = {
        ok: !error && Boolean(data?.user),
        latency_ms: Math.round(lat * 10) / 10,
        user_authenticated: Boolean(data?.user),
        error: error ? error.message : null,
      }
    } else {
      // Cookie or anonymous health check
      const lat = performance.now() - tAuthStart
      authSessionCheck = {
        ok: true,
        latency_ms: Math.round(lat * 10) / 10,
        user_authenticated: false,
        error: null,
      }
    }
  } catch (e) {
    const lat = performance.now() - tAuthStart
    authSessionCheck = {
      ok: false,
      latency_ms: Math.round(lat * 10) / 10,
      user_authenticated: false,
      error: e instanceof Error ? e.message.slice(0, 150) : 'Auth zaman aşımı',
    }
  }

  const totalDuration = Math.round((performance.now() - totalStart) * 10) / 10
  const isHealthy = urlAccessible.ok && serviceClientCreated.ok && lightDbQuery.ok && authSessionCheck.ok

  return NextResponse.json({
    ok: isHealthy,
    timestamp: new Date().toISOString(),
    diagnostics: {
      url_accessible: urlAccessible,
      service_client_created: serviceClientCreated,
      light_db_query: lightDbQuery,
      auth_session_check: authSessionCheck,
      total_duration_ms: totalDuration,
    },
  }, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, no-cache, must-revalidate',
    },
  })
}
