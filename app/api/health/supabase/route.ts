import { NextRequest, NextResponse } from 'next/server'
import { checkSupabaseEnv } from '@/lib/supabase/validate-env'
import { isDiagnosticAuthorized } from '@/lib/diagnostic-auth'

export const dynamic = 'force-dynamic'

const PING_TIMEOUT_MS = 4500

/** Minimal public health — canlı DNS/TLS ping + env kontrolü */
export async function GET(request: NextRequest) {
  const env = checkSupabaseEnv()
  const authorized = isDiagnosticAuthorized(request)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''

  let reachability: {
    ok: boolean
    latency_ms: number | null
    error: string | null
    hint: string | null
  } = { ok: false, latency_ms: null, error: null, hint: null }

  if (env.ok && url) {
    const started = Date.now()
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), PING_TIMEOUT_MS)
    try {
      const pingUrl = `${url.replace(/\/$/, '')}/auth/v1/health`
      const res = await fetch(pingUrl, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      })
      const latency = Date.now() - started
      // 2xx/4xx = DNS+TLS+HTTP çalışıyor; network/TLS hataları catch'e düşer
      reachability = {
        ok: true,
        latency_ms: latency,
        error: res.ok || res.status < 500 ? null : `HTTP ${res.status}`,
        hint: null,
      }
      if (!res.ok && res.status >= 500) {
        reachability.ok = false
        reachability.hint = 'Supabase yanıt verdi ama sunucu hatası döndü.'
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      const isTls =
        /CERT|ALTNAME|SSL|TLS|certificate/i.test(msg) ||
        msg.includes('ERR_TLS')
      const isDns = /ENOTFOUND|EAI_AGAIN|getaddrinfo|DNS/i.test(msg)
      const isAbort = /abort/i.test(msg)
      reachability = {
        ok: false,
        latency_ms: Date.now() - started,
        error: isAbort ? 'Zaman aşımı' : msg.slice(0, 180),
        hint: isTls
          ? 'TLS/sertifika hatası — Windows DNS önbelleği veya aile filtresi (SafeSearch) Supabase adresini yanlış IP’ye yönlendiriyor olabilir. Yönetici olarak: ipconfig /flushdns'
          : isDns
            ? 'DNS çözümlemesi başarısız — internet / DNS ayarlarını kontrol edin.'
            : isAbort
              ? 'Supabase’e zamanında ulaşılamadı — ağ veya firewall kontrol edin.'
              : 'Supabase’e ulaşılamıyor. Ağ, VPN veya aile filtresini kontrol edin.',
      }
    } finally {
      clearTimeout(timer)
    }
  } else if (!env.ok) {
    reachability = {
      ok: false,
      latency_ms: null,
      error: 'env',
      hint: env.message,
    }
  }

  const ok = env.ok && reachability.ok

  if (!authorized) {
    return NextResponse.json({
      ok,
      env: { ok: env.ok, message: env.message },
      reachability: { ok: reachability.ok, latency_ms: reachability.latency_ms },
      hint: ok ? null : (reachability.hint || (!env.ok ? env.message : null)),
    })
  }

  return NextResponse.json({
    ok,
    message: ok ? 'Yapılandırma ve bağlantı OK' : (reachability.hint || env.message),
    env,
    reachability,
  })
}
