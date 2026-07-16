export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canPushFinance } from '@/lib/api-role-guard'
import { invoiceToDb, invoiceToStore } from '@/lib/db-mappers'
import type { InvoiceRecord } from '@/lib/store'

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { data, error } = await auth.supabase
    .from('invoices')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, items: (data ?? []).map(invoiceToStore) })
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canPushFinance(auth.role)) {
    return NextResponse.json({ error: 'Fatura yetkisi yok' }, { status: 403 })
  }

  let body: Partial<InvoiceRecord>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.customer_name || !body.invoice_no) {
    return NextResponse.json({ error: 'Müşteri ve fatura no zorunlu' }, { status: 400 })
  }

  const inv: InvoiceRecord = {
    id: crypto.randomUUID(),
    invoice_type: body.invoice_type || 'earsiv',
    invoice_no: body.invoice_no,
    invoice_date: body.invoice_date || new Date().toISOString().split('T')[0],
    customer_name: body.customer_name,
    customer_vkn: body.customer_vkn,
    order_no: body.order_no,
    items: body.items || [],
    subtotal: body.subtotal || 0,
    kdv_amount: body.kdv_amount || 0,
    total: body.total || 0,
    status: body.status || 'taslak',
    gib_reference: body.gib_reference,
    created_at: new Date().toISOString(),
  }

  const row = invoiceToDb(inv, auth.tenantId)
  row.id = inv.id
  const { data, error } = await auth.supabase.from('invoices').insert(row).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, item: invoiceToStore(data) }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canPushFinance(auth.role)) {
    return NextResponse.json({ error: 'Fatura yetkisi yok' }, { status: 403 })
  }

  let body: { id: string; status?: InvoiceRecord['status']; gib_reference?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }
  if (!body.id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (body.status) patch.status = body.status
  if (body.gib_reference != null) patch.gib_reference = body.gib_reference

  const { data, error } = await auth.supabase
    .from('invoices')
    .update(patch)
    .eq('id', body.id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, item: invoiceToStore(data) })
}
