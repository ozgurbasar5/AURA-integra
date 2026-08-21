export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { canPushFinance } from '@/lib/api-role-guard'
import { isOwnerRole } from '@/lib/role-access'
import { getServiceClient } from '@/lib/supabase/service'
import { createReconciliation } from '@/lib/finance-accounts'
import { withApiHandler } from '@/lib/api-handler'

/**
 * POST /api/tenant/finance/reconcile
 * Mutabakat — sayılan bakiye ile sistem bakiyesi karşılaştırılır.
 *
 * Body: { account_id, counted_balance, notes? }
 *
 * Client system_balance GÖNDEREMİYOR — sunucu DB'den okur.
 */
export const POST = withApiHandler(async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canPushFinance(auth.role) || !isOwnerRole(auth.role)) {
    return NextResponse.json({ error: 'Mutabakat yalnızca sahip/yönetici' }, { status: 403 })
  }

  let body: {
    account_id?: string
    counted_balance?: number
    system_balance?: number // IGNORED — client gönderemez
    notes?: string
    auto_adjust?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.account_id || !isUuid(body.account_id)) {
    return NextResponse.json({ error: 'account_id geçerli UUID olmalı' }, { status: 400 })
  }
  if (body.counted_balance == null || !Number.isFinite(Number(body.counted_balance))) {
    return NextResponse.json({ error: 'counted_balance geçerli bir sayı olmalı' }, { status: 400 })
  }

  // GÜVENLIK: system_balance client'tan kabul edilmiyor
  if (body.system_balance !== undefined) {
    // Sessizce yoksay — log
    console.warn('[reconcile] Client system_balance gönderdi, yoksayıldı')
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  try {
    const result = await createReconciliation(admin, auth.tenantId, auth.userId, {
      account_id: body.account_id,
      counted_balance: Number(body.counted_balance),
      notes: body.notes,
      auto_adjust: Boolean(body.auto_adjust),
    })
    return NextResponse.json({ ok: true, ...result })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}, 'tenant/finance/reconcile')
