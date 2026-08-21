export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { getAccountLedger } from '@/lib/finance-accounts'
import { withApiHandler } from '@/lib/api-handler'

/**
 * GET /api/tenant/accounts/ledger
 * Hesap bazlı ledger sorgusu.
 *
 * Query params:
 *   accountId  — (opsiyonel) belirli hesap filtresi
 *   from       — (opsiyonel) başlangıç tarihi (ISO)
 *   to         — (opsiyonel) bitiş tarihi (ISO)
 *   limit      — (opsiyonel) max kayıt sayısı (varsayılan 500)
 */
export const GET = withApiHandler(async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const accountId = req.nextUrl.searchParams.get('accountId')
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')
  const limitStr = req.nextUrl.searchParams.get('limit')
  const limit = limitStr ? Math.min(Number(limitStr) || 500, 2000) : 500

  if (accountId && !isUuid(accountId)) {
    return NextResponse.json({ error: 'accountId geçerli UUID olmalı' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  try {
    const entries = await getAccountLedger(admin, auth.tenantId, {
      accountId: accountId ?? undefined,
      from: from ?? undefined,
      to: to ?? undefined,
      limit,
    })
    return NextResponse.json({ ok: true, entries, count: entries.length })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}, 'tenant/accounts/ledger')
