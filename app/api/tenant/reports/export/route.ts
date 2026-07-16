export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { requireTenantPlanLevel } from '@/lib/tenant-plan-guard'
import { isReportCari } from '@/lib/reports-aggregate'

function csvEscape(v: unknown): string {
  const s = String(v ?? '')
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`
  return s
}

/** Sunucu CSV export — Excel ile açılır (UTF-8 BOM) */
export async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const plan = await requireTenantPlanLevel(auth.supabase, auth.tenantId, 3)
  if (!plan.ok) {
    return NextResponse.json({ error: plan.message }, { status: plan.status })
  }

  const days = Math.min(365, Math.max(7, Number(req.nextUrl.searchParams.get('days')) || 90))
  const since = new Date()
  since.setDate(since.getDate() - days)
  const sinceStr = since.toISOString().slice(0, 10)

  const { data, error } = await auth.supabase
    .from('financial_transactions')
    .select('transaction_date, type, category, amount, description, payment_method, customer_name, created_at')
    .eq('tenant_id', auth.tenantId)
    .gte('transaction_date', sinceStr)
    .order('transaction_date', { ascending: false })
    .limit(10000)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const rows = (data ?? []).filter(r => !isReportCari(r.category != null ? String(r.category) : null))
  const header = ['Tarih', 'Tür', 'Kategori', 'Tutar', 'Ödeme', 'Müşteri', 'Açıklama']
  const lines = [
    header.join(','),
    ...rows.map(r =>
      [
        csvEscape(String(r.transaction_date ?? r.created_at ?? '').slice(0, 10)),
        csvEscape(r.type),
        csvEscape(r.category),
        csvEscape(r.amount),
        csvEscape(r.payment_method),
        csvEscape(r.customer_name),
        csvEscape(r.description),
      ].join(','),
    ),
  ]

  const bom = '\uFEFF'
  const body = bom + lines.join('\r\n')
  const filename = `aura-finans-${sinceStr}-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
