export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const days = Number(request.nextUrl.searchParams.get('days') ?? 30)
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await admin
    .from('tenant_payments')
    .select('amount, paid_at')
    .eq('status', 'paid')
    .gte('paid_at', since.toISOString())
    .order('paid_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const byDay = new Map<string, number>()
  for (let i = 0; i < days; i++) {
    const d = new Date()
    d.setDate(d.getDate() - (days - 1 - i))
    byDay.set(d.toISOString().slice(0, 10), 0)
  }

  for (const row of data ?? []) {
    if (!row.paid_at) continue
    const key = String(row.paid_at).slice(0, 10)
    byDay.set(key, (byDay.get(key) ?? 0) + Number(row.amount))
  }

  const chart = Array.from(byDay.entries()).map(([date, amount]) => ({
    date: new Date(date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' }),
    amount,
  }))

  return NextResponse.json({ data: chart })
}
