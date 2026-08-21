export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { getTenantAccounts, getAccountById } from '@/lib/finance-accounts'
import { withApiHandler } from '@/lib/api-handler'

/**
 * GET /api/tenant/accounts
 * Tenant'a ait aktif hesapları listeler.
 * Query: ?includeInactive=true → pasif hesapları da getirir
 */
export const GET = withApiHandler(async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const includeInactive = req.nextUrl.searchParams.get('includeInactive') === 'true'

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  try {
    const accounts = await getTenantAccounts(admin, auth.tenantId, { includeInactive })
    return NextResponse.json({ ok: true, accounts })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}, 'tenant/accounts')
