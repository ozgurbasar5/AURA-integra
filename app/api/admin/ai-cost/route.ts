export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase/service'

/** Aylık AI maliyet özeti — flash-lite ~$0.10/1M in + $0.40/1M out; ortalama $0.25/1M varsayımı */
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  const admin = getServiceClient()
  if (!admin) {
    return NextResponse.json({ ok: false, error: 'Service role gerekli' }, { status: 503 })
  }

  const monthStart = new Date()
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)

  const { data, error } = await admin
    .from('ai_usage_logs')
    .select('tenant_id, tokens_in, tokens_out, created_at')
    .gte('created_at', monthStart.toISOString())
    .limit(5000)

  if (error) {
    // Tablo yoksa sıfır dön
    if (/does not exist|relation/i.test(error.message)) {
      return NextResponse.json({
        ok: true,
        month_messages: 0,
        month_tokens: 0,
        estimated_usd: 0,
        tenants_using: 0,
      })
    }
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  const rows = data ?? []
  const tokens = rows.reduce(
    (s, r) => s + Number(r.tokens_in || 0) + Number(r.tokens_out || 0),
    0,
  )
  const tenants = new Set(rows.map(r => r.tenant_id).filter(Boolean))
  const estimated_usd = (tokens / 1_000_000) * 0.25

  return NextResponse.json({
    ok: true,
    month_messages: rows.length,
    month_tokens: tokens,
    estimated_usd,
    tenants_using: tenants.size,
  })
}
