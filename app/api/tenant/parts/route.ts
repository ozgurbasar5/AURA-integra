export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { stockToPart } from '@/lib/db-mappers'
import type { StockItem } from '@/lib/store'

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { data, error } = await auth.supabase
    .from('parts')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, items: data ?? [] })
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  let body: Partial<StockItem>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name gerekli' }, { status: 400 })
  }

  const id = body.id && isUuid(body.id) ? body.id : crypto.randomUUID()
  const row = stockToPart(
    { ...body, id, stock_qty: body.stock_qty ?? 0, min_stock: body.min_stock ?? 0 } as StockItem,
    auth.tenantId,
  )

  const { data, error } = await auth.supabase
    .from('parts')
    .upsert(row)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, item: data })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  let body: { id: string; stock_qty?: number; delta?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.id || !isUuid(body.id)) {
    return NextResponse.json({ error: 'Geçerli part id gerekli' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  if (body.delta != null) {
    const { data: part, error: fetchErr } = await admin
      .from('parts')
      .select('stock_qty')
      .eq('tenant_id', auth.tenantId)
      .eq('id', body.id)
      .single()

    if (fetchErr || !part) {
      return NextResponse.json({ error: 'Parça bulunamadı' }, { status: 404 })
    }

    const newQty = Number(part.stock_qty) + Number(body.delta)
    if (newQty < 0) {
      return NextResponse.json({ error: 'Stok negatif olamaz' }, { status: 409 })
    }

    const { data, error } = await admin
      .from('parts')
      .update({ stock_qty: newQty })
      .eq('tenant_id', auth.tenantId)
      .eq('id', body.id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, item: data })
  }

  if (body.stock_qty != null) {
    if (body.stock_qty < 0) {
      return NextResponse.json({ error: 'Stok negatif olamaz' }, { status: 409 })
    }
    const { data, error } = await admin
      .from('parts')
      .update({ stock_qty: body.stock_qty })
      .eq('tenant_id', auth.tenantId)
      .eq('id', body.id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, item: data })
  }

  return NextResponse.json({ error: 'stock_qty veya delta gerekli' }, { status: 400 })
}
