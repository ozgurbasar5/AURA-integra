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
  score?: number
}

const IMEI_RE = /^\d{15}$/

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
    const digits = q.replace(/\D/g, '')
    const isImeiQuery = IMEI_RE.test(digits)
    const { supabase, tenantId } = auth
    const pattern = `%${safe}%`

    const orderSelect =
      'id, order_no, device_brand, device_model, imei, serial_no, status, customers(full_name, phone)'

    const orderQueries = [
      supabase
        .from('service_orders')
        .select(orderSelect)
        .eq('tenant_id', tenantId)
        .or(`order_no.ilike.${pattern},device_brand.ilike.${pattern},device_model.ilike.${pattern},imei.ilike.${pattern},serial_no.ilike.${pattern}`)
        .order('created_at', { ascending: false })
        .limit(10),
    ]

    if (isImeiQuery) {
      orderQueries.unshift(
        supabase
          .from('service_orders')
          .select(orderSelect)
          .eq('tenant_id', tenantId)
          .eq('imei', digits)
          .limit(3),
      )
    }

    const [ordersResList, customersRes, partsRes, invoicesRes] = await Promise.all([
      Promise.all(orderQueries),
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
        .or(`name.ilike.${pattern},sku.ilike.${pattern},barcode.ilike.${pattern},barcode.eq.${safe}`)
        .limit(6),
      supabase
        .from('invoices')
        .select('id, invoice_no, customer_name, total')
        .eq('tenant_id', tenantId)
        .or(`invoice_no.ilike.${pattern},customer_name.ilike.${pattern}`)
        .limit(6),
    ])

    const orderMap = new Map<string, Record<string, unknown>>()
    for (const res of ordersResList) {
      for (const row of res.data ?? []) {
        orderMap.set(String(row.id), row as Record<string, unknown>)
      }
    }

    const results: SearchResult[] = []

    for (const row of orderMap.values()) {
      const cust = row.customers as { full_name?: string; phone?: string } | null
      const imei = String(row.imei ?? '')
      const serial = String(row.serial_no ?? '')
      let score = 0
      if (isImeiQuery && imei.replace(/\D/g, '') === digits) score = 100
      else if (serial && serial.toLowerCase().includes(q.toLowerCase())) score = 80
      else if (imei && imei.includes(q)) score = 70
      else score = 10

      results.push({
        type: 'service',
        id: String(row.id),
        title: `${row.order_no} — ${row.device_brand ?? ''} ${row.device_model ?? ''}`.trim(),
        subtitle: [cust?.full_name, imei ? `IMEI: ${imei}` : serial ? `SN: ${serial}` : ''].filter(Boolean).join(' · ') || String(row.status ?? ''),
        href: `/dashboard/atolye/${row.id}`,
        score,
      })
    }

    for (const row of customersRes.data ?? []) {
      results.push({
        type: 'customer',
        id: String(row.id),
        title: String(row.full_name ?? 'Müşteri'),
        subtitle: String(row.phone ?? row.email ?? ''),
        href: '/dashboard/musteriler',
        score: 5,
      })
    }

    for (const row of partsRes.data ?? []) {
      const barcode = String(row.barcode ?? '')
      results.push({
        type: 'stock',
        id: String(row.id),
        title: String(row.name ?? 'Parça'),
        subtitle: String(row.sku ?? barcode ?? ''),
        href: '/dashboard/stok',
        score: barcode && (barcode === q || barcode.includes(q)) ? 90 : 5,
      })
    }

    for (const row of invoicesRes.data ?? []) {
      results.push({
        type: 'invoice',
        id: String(row.id),
        title: String(row.invoice_no ?? 'Fatura'),
        subtitle: `${row.customer_name ?? ''} · ₺${Number(row.total ?? 0).toLocaleString('tr-TR')}`,
        href: '/dashboard/fatura',
        score: 5,
      })
    }

    results.sort((a, b) => (b.score ?? 0) - (a.score ?? 0))

    return NextResponse.json({ results: results.slice(0, 20).map(({ score: _s, ...rest }) => rest) })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ results: [] })
  }
}
