export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { requireTenantPlanLevel } from '@/lib/tenant-plan-guard'

export async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const plan = await requireTenantPlanLevel(auth.supabase, auth.tenantId, 3)
  if (!plan.ok) {
    return NextResponse.json({ error: plan.message }, { status: plan.status })
  }

  const shiftId = req.nextUrl.searchParams.get('shiftId')
  if (!shiftId) {
    return NextResponse.json({ error: 'shiftId gerekli' }, { status: 400 })
  }

  const { supabase, tenantId } = auth
  const { data: shift, error } = await supabase
    .from('cash_shifts')
    .select('*')
    .eq('tenant_id', tenantId)
    .eq('id', shiftId)
    .maybeSingle()

  if (error || !shift) {
    return NextResponse.json({ error: 'Vardiya bulunamadı' }, { status: 404 })
  }

  const snapshot = shift.report_snapshot as Record<string, unknown> | null
  if (snapshot && typeof snapshot === 'object' && snapshot.meta) {
    return NextResponse.json({ ok: true, report: snapshot, source: 'snapshot' })
  }

  return NextResponse.json({
    ok: true,
    shift: {
      id: shift.id,
      opened_at: shift.opened_at,
      closed_at: shift.closed_at,
      opened_by: shift.opened_by,
      closed_by: shift.closed_by,
      opening_balance: Number(shift.opening_balance),
      closing_balance: shift.closing_balance != null ? Number(shift.closing_balance) : null,
      expected_cash: shift.expected_cash != null ? Number(shift.expected_cash) : null,
      difference: shift.difference != null ? Number(shift.difference) : null,
      status: shift.status,
    },
    source: 'shift',
  })
}
