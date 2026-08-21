export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { canPushFinance } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { executeAccountTransfer } from '@/lib/finance-accounts'
import { withApiHandler } from '@/lib/api-handler'

/**
 * POST /api/tenant/accounts/transfer
 * Hesaplar arası atomik transfer.
 *
 * Body: { source_account_id, target_account_id, amount, description? }
 */
export const POST = withApiHandler(async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canPushFinance(auth.role)) {
    return NextResponse.json({ error: 'Transfer yetkisi yok' }, { status: 403 })
  }

  let body: {
    source_account_id?: string
    target_account_id?: string
    amount?: number
    description?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  // Validation
  if (!body.source_account_id || !isUuid(body.source_account_id)) {
    return NextResponse.json({ error: 'source_account_id geçerli UUID olmalı' }, { status: 400 })
  }
  if (!body.target_account_id || !isUuid(body.target_account_id)) {
    return NextResponse.json({ error: 'target_account_id geçerli UUID olmalı' }, { status: 400 })
  }
  if (body.source_account_id === body.target_account_id) {
    return NextResponse.json({ error: 'Kaynak ve hedef hesap aynı olamaz' }, { status: 400 })
  }

  const amount = Number(body.amount)
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Tutar pozitif bir sayı olmalıdır' }, { status: 400 })
  }
  if (amount > 10_000_000) {
    return NextResponse.json({ error: 'Tutar çok büyük' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  try {
    const result = await executeAccountTransfer(admin, auth.tenantId, auth.userId, {
      source_account_id: body.source_account_id,
      target_account_id: body.target_account_id,
      amount,
      description: body.description,
    })
    const { ok: _ok, ...rest } = result as any
    return NextResponse.json({ ok: true, ...rest })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}, 'tenant/accounts/transfer')
