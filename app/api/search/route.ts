export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'

function sanitizeSearch(q: string): string {
  return q.replace(/[%_\\]/g, '\\$&')
}

type SearchResult = {
  type: 'service' | 'customer' | 'stock' | 'invoice'
  id: string
  title: string
  subtitle: string
  href: string
}

export async function GET(request: NextRequest) {
  try {
    const auth = await requireTenantAuth()
    if (!auth.ok) {
      return NextResponse.json({ error: auth.message }, { status: auth.status })
    }

    const q = request.nextUrl.searchParams.get('q')?.trim()
    if (!q || q.length < 1) {
      return NextResponse.json({ results: [] })
    }

    const safe = sanitizeSearch(q)
    const { supabase, tenantId } = auth
    const pattern = `%${safe}%`

    const [ordersRes, customersRes, partsRes, invoicesRes] = await Promise.all([
      supabase
        .from('service_orders')
        .select('id, order_no, device_brand, device_model, status, customers(full_name, phone)')
        .eq('tenant_id', tenantId)
        .or(`order_no.ilike.${pattern},device_brand.ilike.${pattern},device_model.ilike.${pattern}`)
        .order('created_at', { ascending: false })
        .limit(8),
      supabase
        .from('customers')
        .select('id, full_name, phone, email')
        .eq('tenant_id', tenantId)
        .or(`full_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`)
        .limit(6),
      supabase
        .from('parts')
        .select('id, name, sku, barcode')
        .eq('tenant_id', tenantId)
        .or(`name.ilike.${pattern},sku.ilike.${pattern},barcode.ilike.${pattern}`)
        .limit(6),
      supabase
        .from('invoices')
        .select('id, invoice_no, customer_name, total')
        .eq('tenant_id', tenantId)
        .or(`invoice_no.ilike.${pattern},customer_name.ilike.${pattern}`)
        .limit(6),
    ])

    const results: SearchResult[] = []

    for (const row of ordersRes.data ?? []) {
      const cust = row.customers as { full_name?: string; phone?: string } | null
      results.push({
        type: 'service',
        id: String(row.id),
        title: `${row.order_no} — ${row.device_brand ?? ''} ${row.device_model ?? ''}`.trim(),
        subtitle: cust?.full_name ?? String(row.status ?? ''),
        href: `/dashboard/atolye/${row.id}`,
      })
    }

    for (const row of customersRes.data ?? []) {
      results.push({
        type: 'customer',
        id: String(row.id),
        title: String(row.full_name ?? 'Müşteri'),
        subtitle: String(row.phone ?? row.email ?? ''),
        href: '/dashboard/musteriler',
      })
    }

    for (const row of partsRes.data ?? []) {
      results.push({
        type: 'stock',
        id: String(row.id),
        title: String(row.name ?? 'Parça'),
        subtitle: String(row.sku ?? row.barcode ?? ''),
        href: '/dashboard/stok',
      })
    }

    for (const row of invoicesRes.data ?? []) {
      results.push({
        type: 'invoice',
        id: String(row.id),
        title: String(row.invoice_no ?? 'Fatura'),
        subtitle: `${row.customer_name ?? ''} · ₺${Number(row.total ?? 0).toLocaleString('tr-TR')}`,
        href: '/dashboard/fatura',
      })
    }

    return NextResponse.json({ results: results.slice(0, 20) })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ results: [] })
  }
}
