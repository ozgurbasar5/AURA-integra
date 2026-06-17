export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canWriteTenantData } from '@/lib/api-role-guard'
import { writeTenantAuditLog } from '@/lib/tenant-audit-log'

async function resolveBridgeTenantId(
  admin: NonNullable<ReturnType<typeof getServiceClient>>,
  body: Record<string, unknown>
): Promise<string | null> {
  if (body.tenant_id) return String(body.tenant_id)

  const slug = body.portal_slug ? String(body.portal_slug).trim() : ''
  if (!slug) return null

  const { data } = await admin
    .from('tenants')
    .select('id')
    .eq('portal_slug', slug)
    .maybeSingle()

  return data?.id ?? null
}

/** Aura Bilişim → AURA-integra cihaz talep köprüsü */
export async function POST(req: NextRequest) {
  const bridgeSecret = process.env.AURA_BRIDGE_SECRET
  const apiKey = req.headers.get('x-bridge-key')

  if (process.env.NODE_ENV === 'production' && !bridgeSecret) {
    return NextResponse.json({ error: 'AURA_BRIDGE_SECRET yapılandırılmamış' }, { status: 503 })
  }
  if (!bridgeSecret) {
    if (process.env.AURA_BRIDGE_ALLOW_DEV !== '1') {
      return NextResponse.json({ error: 'AURA_BRIDGE_SECRET gerekli' }, { status: 503 })
    }
  } else if (apiKey !== bridgeSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  const tenantId = await resolveBridgeTenantId(admin, body)
  if (!tenantId) {
    return NextResponse.json(
      { error: 'tenant_id veya geçerli portal_slug zorunlu' },
      { status: 400 }
    )
  }

  const { data, error } = await admin.from('device_requests').insert({
    tenant_id: tenantId,
    source: String(body.source ?? 'aura_bilisim'),
    external_id: body.external_id ? String(body.external_id) : null,
    customer_name: String(body.customer_name ?? '—'),
    customer_phone: body.customer_phone ? String(body.customer_phone) : null,
    device_brand: body.device_brand ? String(body.device_brand) : null,
    device_model: body.device_model ? String(body.device_model) : null,
    imei: body.imei ? String(body.imei) : null,
    fault_description: body.fault_description ? String(body.fault_description) : null,
    metadata: (body.metadata as Record<string, unknown>) ?? {},
  }).select('id').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id, tenant_id: tenantId }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const status = req.nextUrl.searchParams.get('status')
  let query = auth.supabase
    .from('device_requests')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })
    .limit(50)

  if (status) query = query.eq('status', status)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ requests: data })
}

/** Bayi — talep durumu güncelle / servis emrine bağla */
export async function PATCH(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  if (!canWriteTenantData(auth.role)) {
    return NextResponse.json({ error: 'Yetkiniz yok' }, { status: 403 })
  }

  let body: { id?: string; status?: string; service_order_id?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.id) {
    return NextResponse.json({ error: 'id zorunlu' }, { status: 400 })
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status) patch.status = body.status
  if (body.service_order_id) patch.service_order_id = body.service_order_id

  const { data, error } = await auth.supabase
    .from('device_requests')
    .update(patch)
    .eq('id', body.id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .maybeSingle()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Talep bulunamadı' }, { status: 404 })

  await writeTenantAuditLog({
    tenantId: auth.tenantId,
    userId: auth.userId,
    action: 'update',
    entityType: 'device_request',
    entityId: body.id,
    newData: patch,
  })

  return NextResponse.json({ ok: true, request: data })
}
