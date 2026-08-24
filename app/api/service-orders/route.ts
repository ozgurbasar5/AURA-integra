export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { withApiHandler } from '@/lib/api-handler'
import { safeClientMessage } from '@/lib/api-error'
import { canWriteTenantData, roleGuardResponse } from '@/lib/api-role-guard'
import { mapStoreStatusToDb } from '@/lib/erp-features'
import type { ServiceOrderStatus, PaymentMethod } from '@/types/database'

async function resolveCustomerId(
  db: { from: (table: string) => { select: Function; insert: Function } },
  tenantId: string,
  customerName: string,
  customerPhone: string
): Promise<string | null> {
  const phone = customerPhone.replace(/\s/g, '')
  const { data: existing } = await db
    .from('customers')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('phone', phone)
    .maybeSingle()

  if (existing?.id) return existing.id

  const { data: created, error } = await db
    .from('customers')
    .insert({
      tenant_id: tenantId,
      full_name: customerName.trim(),
      phone,
    })
    .select('id')
    .single()

  if (error || !created) {
    console.error('[ServiceOrders resolveCustomerId]', { code: error?.code, message: error?.message })
    return null
  }
  return created.id
}

function normalizeStatus(raw?: string): ServiceOrderStatus {
  if (!raw) return 'alindi'
  const mapped = mapStoreStatusToDb(raw) as ServiceOrderStatus
  const allowed: ServiceOrderStatus[] = [
    'alindi', 'teshis', 'onay_bekleniyor', 'tamir', 'kalite_kontrol', 'teslim', 'iptal',
  ]
  return allowed.includes(mapped) ? mapped : 'alindi'
}

// ─── GET /api/service-orders ───────────────────────────────────────────────────
export const GET = withApiHandler(async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  const { tenantId } = auth

  const db = getServiceClient() || auth.supabase

  const searchParams = req.nextUrl.searchParams
  const statusParam = searchParams.get('status')
  const status = statusParam ? normalizeStatus(statusParam) : null
  const search = searchParams.get('search')
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200)
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)
  const cursor = searchParams.get('cursor')

  let query = db
    .from('service_orders')
    .select(
      `
        *,
        customers (
          id,
          full_name,
          phone,
          email
        ),
        technician:user_profiles!technician_id (
          id,
          full_name
        )
      `,
      { count: 'exact' },
    )
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (cursor) query = query.lt('created_at', cursor)
  if (status) query = query.eq('status', status)
  if (search) {
    query = query.or(
      `order_no.ilike.%${search}%,customer_name.ilike.%${search}%,customer_phone.ilike.%${search}%,imei.ilike.%${search}%`,
    )
  }

  const { data, error, count } = await query
  if (error) {
    console.error('[API /api/service-orders GET]', { code: error.code, message: error.message })
    return NextResponse.json({ error: safeClientMessage(error, 'Servis listesi sorgulanamadı.') }, { status: 500 })
  }
  const total = count ?? 0
  return NextResponse.json({
    data: data ?? [],
    pagination: { limit, offset, total, hasMore: offset + (data?.length ?? 0) < total },
  })
}, 'service-orders')

// ─── POST /api/service-orders ──────────────────────────────────────────────────
export const POST = withApiHandler(async function POST(req: NextRequest) {
    const auth = await requireTenantAuth()
    if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
    if (!canWriteTenantData(auth.role)) {
      const denied = roleGuardResponse()
      return NextResponse.json({ error: denied.message }, { status: denied.status })
    }
    const { tenantId, userId } = auth

    const db = getServiceClient() || auth.supabase

    const body = await req.json() as {
      customer_id?: string
      customer_name?: string
      customer_phone?: string
      branch_id?: string
      device_brand: string
      device_model: string
      device_color?: string
      imei?: string
      serial_no?: string
      lock_code?: string
      fault_description?: string
      technician_notes?: string
      status?: string
      technician_id?: string
      estimated_cost?: number
      actual_cost?: number
      payment_method?: PaymentMethod
      estimated_delivery?: string
    }

    const {
      customer_id: rawCustomerId,
      customer_name,
      customer_phone,
      device_brand,
      device_model,
      fault_description,
      ...rest
    } = body

    if (!device_brand?.trim() || !device_model?.trim()) {
      return NextResponse.json(
        { error: 'device_brand ve device_model zorunludur.' },
        { status: 400 },
      )
    }

    let customer_id = rawCustomerId
    if (!customer_id) {
      if (!customer_name?.trim() || !customer_phone?.trim()) {
        return NextResponse.json(
          { error: 'customer_id veya customer_name + customer_phone gerekli.' },
          { status: 400 },
        )
      }
      customer_id = (await resolveCustomerId(
        db,
        tenantId,
        customer_name,
        customer_phone,
      )) ?? undefined
      if (!customer_id) {
        return NextResponse.json({ error: 'Müşteri kaydı oluşturulamadı.' }, { status: 500 })
      }
    }

    const faultDesc = fault_description?.trim() || 'Arıza bildirimi'

    let orderNo: string | null = null
    const { data: orderNoData, error: orderNoErr } = await db.rpc(
      'generate_order_no',
      { p_tenant_id: tenantId },
    )

    if (!orderNoErr && orderNoData) {
      orderNo = String(orderNoData)
    } else {
      // Fallback order_no generation
      const { count } = await db
        .from('service_orders')
        .select('id', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
      const yy = new Date().getFullYear().toString().slice(-2)
      const mm = String(new Date().getMonth() + 1).padStart(2, '0')
      const num = String((count ?? 0) + 1).padStart(4, '0')
      orderNo = `SRV-${yy}${mm}-${num}`
    }

    const dbStatus = normalizeStatus(rest.status)

    const { data: newOrder, error: insertErr } = await db
      .from('service_orders')
      .insert({
        tenant_id: tenantId,
        order_no: orderNo,
        customer_id,
        customer_name: customer_name?.trim(),
        customer_phone: customer_phone?.replace(/\s/g, ''),
        device_brand: device_brand.trim(),
        device_model: device_model.trim(),
        fault_description: faultDesc,
        status: dbStatus,
        received_at: new Date().toISOString(),
        imei: rest.imei,
        serial_no: rest.serial_no,
        device_color: rest.device_color,
        lock_code: rest.lock_code,
        technician_notes: rest.technician_notes,
        technician_id: rest.technician_id,
        estimated_cost: rest.estimated_cost,
        actual_cost: rest.actual_cost,
        payment_method: rest.payment_method,
        estimated_delivery: rest.estimated_delivery,
        branch_id: rest.branch_id,
      })
      .select(
        `
        *,
        customers ( id, full_name, phone, email ),
        technician:user_profiles!technician_id ( id, full_name )
      `,
      )
      .single()

    if (insertErr) {
      console.error('[API /api/service-orders POST]', { code: insertErr.code, message: insertErr.message })
      return NextResponse.json({ error: safeClientMessage(insertErr, 'Kayıt oluşturulamadı') }, { status: 500 })
    }

    try {
      await db.from('service_status_history').insert({
        order_id: newOrder.id,
        tenant_id: tenantId,
        status: newOrder.status,
        note: 'Servis kaydı oluşturuldu.',
        created_by: userId,
      })
    } catch {
      // Non-blocking status history log
    }

    return NextResponse.json({ data: newOrder }, { status: 201 })
}, 'service-orders')
