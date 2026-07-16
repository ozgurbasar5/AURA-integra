export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canPushFinance } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { isOwnerRole } from '@/lib/role-access'

/**
 * Tarihsel kasa düzeltme — yalnızca sahip/yönetici.
 * Body: { delta: number, reason: string }
 * delta pozitif = kasa artar, negatif = azalır.
 */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canPushFinance(auth.role) || !isOwnerRole(auth.role)) {
    return NextResponse.json({ error: 'Kasa düzeltme yalnızca sahip/yönetici' }, { status: 403 })
  }

  let body: { delta?: number; reason?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const delta = Number(body.delta)
  const reason = String(body.reason || '').trim()
  if (!Number.isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: 'delta sıfırdan farklı sayı olmalı' }, { status: 400 })
  }
  if (Math.abs(delta) > 1_000_000) {
    return NextResponse.json({ error: 'delta çok büyük' }, { status: 400 })
  }
  if (reason.length < 5) {
    return NextResponse.json({ error: 'reason en az 5 karakter' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const { data: bal, error: kasaErr } = await admin.rpc('adjust_kasa_balance', {
    p_tenant_id: auth.tenantId,
    p_delta: delta,
  })
  if (kasaErr) {
    return NextResponse.json({ error: kasaErr.message }, { status: 500 })
  }

  const { error: txErr } = await admin.from('financial_transactions').insert({
    tenant_id: auth.tenantId,
    type: delta > 0 ? 'gelir' : 'gider',
    description: `Kasa düzeltme — ${reason}`,
    category: 'Kasa Düzeltme',
    amount: Math.abs(delta),
    payment_method: 'nakit',
    transaction_date: new Date().toISOString(),
    created_by: auth.userId,
  })
  if (txErr) {
    // Kasa değişti ama log yazılamadı — tersine çevir
    await admin.rpc('adjust_kasa_balance', {
      p_tenant_id: auth.tenantId,
      p_delta: -delta,
    })
    return NextResponse.json({ error: txErr.message }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    kasa_balance: Number(bal),
    delta,
    reason,
  })
}
