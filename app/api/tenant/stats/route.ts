export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { supabase, tenantId } = auth

  const { data, error } = await supabase.rpc('get_dashboard_stats', { p_tenant_id: tenantId })

  if (error) {
    const [ordersRes, stockRes, salesRes] = await Promise.all([
      supabase.from('service_orders').select('status').eq('tenant_id', tenantId),
      supabase.from('parts').select('stock_qty, min_stock_qty').eq('tenant_id', tenantId),
      supabase.from('sales').select('total, created_at').eq('tenant_id', tenantId).gte('created_at', new Date(Date.now() - 86400000).toISOString()),
    ])

    const orders = ordersRes.data ?? []
    const activeOrders = orders.filter(o => !['teslim', 'iptal'].includes(String(o.status))).length
    const readyOrders = orders.filter(o => o.status === 'kalite_kontrol' || o.status === 'teslim').length
    const lowStock = (stockRes.data ?? []).filter(p => Number(p.stock_qty) <= Number(p.min_stock_qty ?? 5)).length
    const todaySales = (salesRes.data ?? []).reduce((s, r) => s + Number(r.total), 0)
    const [{ data: openShifts }, { data: closedShifts }] = await Promise.all([
      supabase.from('cash_shifts').select('id').eq('tenant_id', tenantId).eq('status', 'open').limit(1),
      supabase.from('cash_shifts').select('difference, closed_at').eq('tenant_id', tenantId).eq('status', 'closed').order('closed_at', { ascending: false }).limit(1),
    ])
    const lastShift = closedShifts?.[0]

    return NextResponse.json({
      ok: true,
      stats: {
        active_orders: activeOrders,
        ready_orders: readyOrders,
        low_stock: lowStock,
        today_sales: todaySales,
        open_shift: (openShifts?.length ?? 0) > 0,
        last_shift_difference: lastShift?.difference != null ? Number(lastShift.difference) : null,
      },
    })
  }

  return NextResponse.json({ ok: true, stats: data })
}
