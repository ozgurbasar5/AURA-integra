export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canPushFinance } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { data, error } = await auth.supabase
    .from('cash_shifts')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('opened_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canPushFinance(auth.role)) {
    return NextResponse.json({ error: 'Kasa yetkisi yok' }, { status: 403 })
  }

  let body: { action: 'open' | 'close'; opening_balance?: number; closing_balance?: number; opened_by?: string; closed_by?: string; notes?: string; shift_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  if (body.action === 'open') {
    const { data: existing } = await admin
      .from('cash_shifts')
      .select('id')
      .eq('tenant_id', auth.tenantId)
      .eq('status', 'open')
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ error: 'Açık vardiya zaten var' }, { status: 409 })
    }

    const row = {
      id: crypto.randomUUID(),
      tenant_id: auth.tenantId,
      status: 'open',
      opening_balance: Number(body.opening_balance) || 0,
      opened_by: body.opened_by ?? auth.userId,
      opened_at: new Date().toISOString(),
    }

    const { data, error } = await admin.from('cash_shifts').insert(row).select('*').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, shift: data })
  }

  if (body.action === 'close') {
    const { data: openShift, error: findErr } = await admin
      .from('cash_shifts')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .eq('status', 'open')
      .maybeSingle()

    if (findErr || !openShift) {
      return NextResponse.json({ error: 'Açık vardiya bulunamadı' }, { status: 404 })
    }

    const closing = Number(body.closing_balance) || 0
    const opening = Number(openShift.opening_balance) || 0
    const difference = closing - opening

    const { data, error } = await admin
      .from('cash_shifts')
      .update({
        status: 'closed',
        closing_balance: closing,
        difference,
        closed_by: body.closed_by ?? auth.userId,
        closed_at: new Date().toISOString(),
        notes: body.notes ?? null,
      })
      .eq('id', openShift.id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, shift: data })
  }

  return NextResponse.json({ error: 'Geçersiz action' }, { status: 400 })
}
