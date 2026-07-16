export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { personnelToStore } from '@/lib/db-mappers'
import { calcTechnicianCommissions, mapDbStatusToStore } from '@/lib/erp-features'

function defaultFromDate(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function defaultToDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function inDateRange(iso: string | null | undefined, from: string, to: string): boolean {
  if (!iso) return false
  const day = iso.slice(0, 10)
  return day >= from && day <= to
}

export async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const from = req.nextUrl.searchParams.get('from') || defaultFromDate()
  const to = req.nextUrl.searchParams.get('to') || defaultToDate()
  const toEnd = `${to}T23:59:59.999Z`

  const [ordersRes, personnelRes, salesRes] = await Promise.all([
    auth.supabase
      .from('service_orders')
      .select(
        'status, estimated_cost, actual_cost, closed_at, delivered_at, created_at, technician:user_profiles!technician_id(full_name)',
      )
      .eq('tenant_id', auth.tenantId)
      .in('status', ['teslim', 'delivered', 'teslim_edildi'])
      .limit(3000),
    auth.supabase
      .from('personnel_profiles')
      .select('*')
      .eq('tenant_id', auth.tenantId)
      .eq('is_active', true),
    auth.supabase
      .from('sales')
      .select('total, subtotal, extra, created_at, sold_by, seller:user_profiles!sold_by(full_name)')
      .eq('tenant_id', auth.tenantId)
      .gte('created_at', from)
      .lte('created_at', toEnd)
      .limit(3000),
  ])

  if (ordersRes.error) return NextResponse.json({ error: ordersRes.error.message }, { status: 500 })
  if (personnelRes.error) return NextResponse.json({ error: personnelRes.error.message }, { status: 500 })
  if (salesRes.error) return NextResponse.json({ error: salesRes.error.message }, { status: 500 })

  const personnel = (personnelRes.data ?? []).map(r => personnelToStore(r as Record<string, unknown>))

  const serviceOrders = (ordersRes.data ?? [])
    .filter(o => {
      const at = o.closed_at || o.delivered_at || o.created_at
      return inDateRange(String(at ?? ''), from, to)
    })
    .map(o => {
      const tech = o.technician as { full_name?: string } | null
      return {
        technician: tech?.full_name ?? null,
        status: mapDbStatusToStore(String(o.status ?? '')),
        actual_cost: o.actual_cost != null ? Number(o.actual_cost) : undefined,
        estimated_cost: Number(o.estimated_cost) || 0,
      }
    })

  const saleOrders = (salesRes.data ?? []).map(s => {
    const extra = (s.extra as Record<string, unknown>) ?? {}
    const seller = s.seller as { full_name?: string } | null
    const amount = Number(extra.total_with_vat ?? s.total ?? s.subtotal) || 0
    return {
      technician: seller?.full_name ?? null,
      status: 'delivered',
      actual_cost: amount,
      estimated_cost: amount,
    }
  })

  const items = calcTechnicianCommissions([...serviceOrders, ...saleOrders], personnel)
  const summary = {
    from,
    to,
    total_commission: items.reduce((s, r) => s + r.commission_amount, 0),
    total_revenue: items.reduce((s, r) => s + r.revenue, 0),
    delivered_count: items.reduce((s, r) => s + r.delivered_count, 0),
    technician_count: items.length,
  }

  return NextResponse.json({ ok: true, items, summary })
}
