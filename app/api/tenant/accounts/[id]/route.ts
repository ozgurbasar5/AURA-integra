export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { getAccountById } from '@/lib/finance-accounts'
import { withApiHandler } from '@/lib/api-handler'

/**
 * GET /api/tenant/accounts/[id]
 * Belirli bir hesabın detaylarını getirir.
 * Cross-tenant erişim engellenir.
 */
export const GET = withApiHandler(async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const accountId = params?.id
  if (!accountId || !isUuid(accountId)) {
    return NextResponse.json({ error: 'Geçerli account_id (UUID) gerekli' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  try {
    const account = await getAccountById(admin, auth.tenantId, accountId)
    if (!account) {
      return NextResponse.json({ error: 'Hesap bulunamadı' }, { status: 404 })
    }
    return NextResponse.json({ ok: true, account })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}, 'tenant/accounts/[id]')
