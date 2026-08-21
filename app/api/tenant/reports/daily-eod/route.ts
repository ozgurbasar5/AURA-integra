export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { buildDailyFinancialReport } from '@/lib/daily-financial-report'
import { withApiHandler } from '@/lib/api-handler'

/**
 * GET /api/tenant/reports/daily-eod
 * Kasa 2.0 Gün Sonu ve Günlük Finans Raporu
 *
 * Query Parametreleri:
 * - date?: YYYY-MM-DD (örn: 2026-08-19)
 * - from?: ISO String
 * - to?: ISO String
 * - timezone?: 'Europe/Istanbul' (default)
 */
export const GET = withApiHandler(async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { searchParams } = req.nextUrl
  const date = searchParams.get('date')
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const timezone = searchParams.get('timezone') ?? 'Europe/Istanbul'

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  try {
    const report = await buildDailyFinancialReport(admin, auth.tenantId, {
      date,
      from,
      to,
      timezone,
    })

    return NextResponse.json({ ok: true, report })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}, 'tenant/reports/daily-eod')
