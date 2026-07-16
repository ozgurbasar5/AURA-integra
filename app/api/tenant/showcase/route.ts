export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { canWriteTenantData } from '@/lib/api-role-guard'
import { getServiceClient } from '@/lib/supabase/service'
import { showcaseToSecondHand } from '@/lib/db-mappers'

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { data, error } = await auth.supabase
    .from('showcase_devices')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  const items = (data ?? []).map(r => showcaseToSecondHand(r as Record<string, unknown>))
  return NextResponse.json({ ok: true, items })
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Vitrin yetkisi yok' }, { status: 403 })
  }

  let body: {
    brand?: string
    model?: string
    imei?: string
    barcode?: string
    condition?: string
    cosmetic_score?: number
    battery_health?: number
    color?: string
    storage?: string
    buy_price?: number
    sell_price?: number
    showcase?: boolean
    notes?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.brand?.trim() || !body.model?.trim()) {
    return NextResponse.json({ error: 'brand ve model gerekli' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const id = crypto.randomUUID()
  const row = {
    id,
    tenant_id: auth.tenantId,
    brand: body.brand.trim(),
    model: body.model.trim(),
    imei: body.imei || null,
    barcode: body.barcode || id.slice(0, 8),
    condition: body.condition || 'iyi',
    cosmetic_score: Number(body.cosmetic_score) || 8,
    battery_health: body.battery_health != null ? Number(body.battery_health) : null,
    color: body.color || null,
    storage: body.storage || null,
    buy_price: Number(body.buy_price) || 0,
    sell_price: Number(body.sell_price) || 0,
    status: 'satilik',
    showcase: body.showcase !== false,
    notes: body.notes || null,
    created_at: new Date().toISOString(),
  }

  const { data, error } = await admin.from('showcase_devices').insert(row).select('*').single()
  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Oluşturulamadı' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    item: showcaseToSecondHand(data as Record<string, unknown>),
  }, { status: 201 })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Vitrin yetkisi yok' }, { status: 403 })
  }

  let body: Record<string, unknown> & { id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.id || !isUuid(String(body.id))) {
    return NextResponse.json({ error: 'id gerekli' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  const patch: Record<string, unknown> = {}
  const keys = [
    'brand', 'model', 'imei', 'barcode', 'condition', 'cosmetic_score',
    'battery_health', 'color', 'storage', 'buy_price', 'sell_price',
    'showcase', 'notes', 'status', 'sold_at',
  ] as const
  for (const k of keys) {
    if (body[k] !== undefined) patch[k] = body[k]
  }
  if (body.status === 'satildi' && !patch.sold_at) {
    patch.sold_at = new Date().toISOString()
  }
  if (body.status === 'stokta' || body.status === 'satilik') {
    patch.status = 'satilik'
  }

  const { data, error } = await admin
    .from('showcase_devices')
    .update(patch)
    .eq('tenant_id', auth.tenantId)
    .eq('id', body.id)
    .select('*')
    .single()

  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'Güncellenemedi' }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    item: showcaseToSecondHand(data as Record<string, unknown>),
  })
}
