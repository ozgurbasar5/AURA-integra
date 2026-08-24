export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { tenantQuery } from '@/lib/supabase/query-helpers'
import { withApiHandler } from '@/lib/api-handler'

import { getServiceClient } from '@/lib/supabase/service'

export const GET = withApiHandler(async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const db = getServiceClient() || auth.supabase

  const searchParams = req.nextUrl.searchParams
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '100', 10), 500)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)
  const search = searchParams.get('search')?.trim()

  let query = tenantQuery(db.from('parts').select('*', { count: 'exact' }), auth.tenantId)
    .order('name')
    .range(offset, offset + limit - 1)

  if (search) {
    query = query.or(`name.ilike.%${search}%,barcode.ilike.%${search}%`)
  }

  const { data, error, count } = await query
  if (error) {
    console.error('[API /api/tenant/parts GET]', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'Parça listesi alınamadı.' }, { status: 500 })
  }

  const total = count ?? 0
  return NextResponse.json({
    ok: true,
    items: data ?? [],
    pagination: { limit, offset, total, hasMore: offset + (data?.length ?? 0) < total },
  })
}, 'tenant/parts')

export const POST = withApiHandler(async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  let body: Partial<import('@/lib/store').StockItem>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.name?.trim()) {
    return NextResponse.json({ error: 'name gerekli' }, { status: 400 })
  }

  const db = getServiceClient() || auth.supabase

  const { stockToPart } = await import('@/lib/db-mappers')
  const id = body.id && isUuid(body.id) ? body.id : crypto.randomUUID()
  const row = stockToPart(
    { ...body, id, stock_qty: body.stock_qty ?? 0, min_stock: body.min_stock ?? 0 } as import('@/lib/store').StockItem,
    auth.tenantId,
  )

  const { data, error } = await db
    .from('parts')
    .upsert(row)
    .select('*')
    .single()

  if (error) {
    console.error('[API /api/tenant/parts POST]', { code: error.code, message: error.message })
    return NextResponse.json({ error: 'Parça kaydedilemedi.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true, item: data })
}, 'tenant/parts')

export const PATCH = withApiHandler(async function PATCH(req: NextRequest) {
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

  const { getServiceClient } = await import('@/lib/supabase/service')
  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  if (body.delta != null) {
    const { data: part, error: fetchErr } = await tenantQuery(
      admin.from('parts').select('stock_qty'),
      auth.tenantId,
    )
      .eq('id', body.id)
      .single()

    if (fetchErr || !part) {
      return NextResponse.json({ error: 'Parça bulunamadı' }, { status: 404 })
    }

    const newQty = Number(part.stock_qty) + Number(body.delta)
    if (newQty < 0) {
      return NextResponse.json({ error: 'Stok negatif olamaz' }, { status: 409 })
    }

    const { data, error } = await tenantQuery(admin.from('parts').update({ stock_qty: newQty }), auth.tenantId)
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
    const { data, error } = await tenantQuery(
      admin.from('parts').update({ stock_qty: body.stock_qty }),
      auth.tenantId,
    )
      .eq('id', body.id)
      .select('*')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, item: data })
  }

  return NextResponse.json({ error: 'stock_qty veya delta gerekli' }, { status: 400 })
}, 'tenant/parts')

export const DELETE = withApiHandler(async function DELETE(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  let body: { id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.id || !isUuid(body.id)) {
    return NextResponse.json({ error: 'Geçerli part id gerekli' }, { status: 400 })
  }

  const { error } = await tenantQuery(auth.supabase.from('parts').delete(), auth.tenantId).eq('id', body.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}, 'tenant/parts')
