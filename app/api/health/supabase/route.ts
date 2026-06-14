import { NextRequest, NextResponse } from 'next/server'
import { checkSupabaseEnv, EXPECTED_PROJECT_REF } from '@/lib/supabase/validate-env'

export const dynamic = 'force-dynamic'

function buildHtml(data: Record<string, unknown>): string {
  const ok = data.ok === true
  const env = data.env as { urlRef?: string; anonRef?: string; serviceRef?: string; message?: string }
  const db = data.database as { status?: string | number; ms?: number } | undefined

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>AURA İntegra — Supabase Durumu</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 20px; background: #f8fafc; color: #0f172a; }
    h1 { font-size: 1.25rem; margin-bottom: 8px; }
    .badge { display: inline-block; padding: 6px 14px; border-radius: 999px; font-weight: 700; font-size: 14px; }
    .ok { background: #dcfce7; color: #166534; }
    .fail { background: #fee2e2; color: #991b1b; }
    .card { background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-top: 20px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    td { padding: 8px 0; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
    td:first-child { color: #64748b; width: 140px; }
    a { color: #2563eb; }
    pre { background: #f1f5f9; padding: 12px; border-radius: 8px; overflow: auto; font-size: 12px; }
  </style>
</head>
<body>
  <h1>AURA İntegra — Supabase Bağlantı Testi</h1>
  <span class="badge ${ok ? 'ok' : 'fail'}">${ok ? '✓ Yapılandırma OK' : '✗ Sorun var'}</span>

  <div class="card">
    <table>
      <tr><td>Proje URL</td><td><code>${env.urlRef ?? '—'}</code></td></tr>
      <tr><td>Anon key ref</td><td><code>${env.anonRef ?? '—'}</code></td></tr>
      <tr><td>Service key ref</td><td><code>${env.serviceRef ?? '—'}</code></td></tr>
      <tr><td>Beklenen proje</td><td><code>${EXPECTED_PROJECT_REF}</code></td></tr>
      <tr><td>Eşleşme</td><td>${data.matchesIntegra ? '✓ Evet' : '✗ Hayır'}</td></tr>
      ${db ? `<tr><td>Veritabanı</td><td>${db.status} (${db.ms}ms)</td></tr>` : ''}
      <tr><td>Mesaj</td><td>${env.message ?? data.hint ?? ''}</td></tr>
    </table>
  </div>

  <div class="card">
    <p><strong>Sonraki adımlar</strong></p>
    <ul>
      <li><a href="/login?cikis=1">Oturumu kapat</a> → tekrar giriş</li>
      <li><a href="/login">Giriş sayfası</a></li>
      <li><a href="/admin">Admin paneli</a></li>
    </ul>
  </div>

  <div class="card">
    <p style="margin:0 0 8px;color:#64748b;font-size:13px">JSON (API):</p>
    <pre>${JSON.stringify(data, null, 2)}</pre>
  </div>
</body>
</html>`
}

export async function GET(request: NextRequest) {
  const env = checkSupabaseEnv()
  const wantHtml =
    request.nextUrl.searchParams.get('view') === '1' ||
    (request.headers.get('accept') ?? '').includes('text/html')

  const payload: Record<string, unknown> = {
    ok: env.ok,
    env,
    expectedProject: EXPECTED_PROJECT_REF,
    matchesIntegra: env.urlRef === EXPECTED_PROJECT_REF && env.anonRef === EXPECTED_PROJECT_REF,
    hint: env.ok
      ? 'Yapılandırma doğru.'
      : env.message,
  }

  if (request.nextUrl.searchParams.get('ping') === '1') {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
    let dbStatus: number | 'timeout' | 'error' = 'error'
    let dbMs = 0
    if (env.ok && url) {
      try {
        const t0 = Date.now()
        const res = await fetch(`${url}/rest/v1/subscription_plans?select=id&limit=1`, {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          signal: AbortSignal.timeout(8000),
        })
        dbMs = Date.now() - t0
        dbStatus = res.status
      } catch {
        dbStatus = 'timeout'
      }
    }
    payload.database = { status: dbStatus, ms: dbMs }
    payload.ok = env.ok && dbStatus !== 'timeout' && dbStatus !== 'error'
  }

  if (wantHtml) {
    return new NextResponse(buildHtml(payload), {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
  }

  return NextResponse.json(payload, {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  })
}
