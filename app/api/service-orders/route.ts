export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { withApiHandler } from '@/lib/api-handler'
import { safeClientMessage } from '@/lib/api-error'
import { canWriteTenantData, roleGuardResponse } from '@/lib/api-role-guard'
import { mapStoreStatusToDb } from '@/lib/erp-features'
import type { ServiceOrderStatus, PaymentMethod } from '@/types/database'

async function resolveCustomerId(
  db: { from: (table: string) => any },
  tenantId: string,
  customerName?: string | null,
  customerPhone?: string | null,
): Promise<string | null> {
  const cleanPhone = customerPhone ? customerPhone.replace(/\D/g, '') : ''
  if (!cleanPhone && !customerName?.trim()) return null

  // 1. Telefon ile mevcut müşteriyi ara
  if (cleanPhone) {
    const { data: existing } = await db
      .from('customers')
      .select('id')
      .eq('tenant_id', tenantId)
      .or(`phone.eq.${cleanPhone},phone.eq.0${cleanPhone.replace(/^0/, '')}`)
      .limit(1)
      .maybeSingle()

    if (existing?.id && isUuid(existing.id)) return existing.id
  }

  // 2. Bulunamadıysa yeni müşteri kaydı oluştur
  const name = customerName?.trim() || (cleanPhone ? `Müşteri (${cleanPhone.slice(-4)})` : 'İsimsiz Müşteri')
  const phone = cleanPhone || '05000000000'

  const { data: created, error } = await db
    .from('customers')
    .insert({
      tenant_id: tenantId,
      full_name: name,
      phone,
      customer_type: 'bireysel',
      segment: 'regular',
    })
    .select('id')
    .single()

  if (error || !created?.id) {
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

    let body: Record<string, any>
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Geçersiz JSON verisi.' }, { status: 400 })
    }

    const {
      customer_id: rawCustomerId,
      customer_name,
      customer_phone,
      device_brand,
      device_model,
      fault_description,
    } = body

    if (!device_brand || typeof device_brand !== 'string' || !device_brand.trim() || !device_model || typeof device_model !== 'string' || !device_model.trim()) {
      return NextResponse.json(
        { error: 'device_brand ve device_model zorunludur.' },
        { status: 400 },
      )
    }

    // 1. Opsiyonel UUID Alanları Doğrulama (technician_id, branch_id)
    let technicianId: string | null = null
    if (body.technician_id !== undefined && body.technician_id !== null && body.technician_id !== '') {
      if (!isUuid(body.technician_id)) {
        return NextResponse.json({ error: 'Geçersiz technician_id UUID formatı.' }, { status: 400 })
      }
      technicianId = body.technician_id
    }

    let branchId: string | null = null
    if (body.branch_id !== undefined && body.branch_id !== null && body.branch_id !== '') {
      if (!isUuid(body.branch_id)) {
        return NextResponse.json({ error: 'Geçersiz branch_id UUID formatı.' }, { status: 400 })
      }
      branchId = body.branch_id
    }

    // 2. Customer ID Çözümleme & Doğrulama
    let customerId: string | null = isUuid(rawCustomerId) ? rawCustomerId : null
    if (!customerId) {
      if (typeof rawCustomerId === 'string' && rawCustomerId.trim() !== '' && !isUuid(rawCustomerId)) {
        return NextResponse.json(
          { error: 'Geçersiz customer_id UUID formatı.' },
          { status: 400 },
        )
      }

      if (!customer_name?.trim() || !customer_phone?.trim()) {
        return NextResponse.json(
          { error: 'customer_id veya customer_name + customer_phone gerekli.' },
          { status: 400 },
        )
      }

      customerId = await resolveCustomerId(
        db,
        tenantId,
        customer_name,
        customer_phone,
      )

      if (!customerId) {
        return NextResponse.json(
          { error: 'Müşteri kaydı oluşturulamadı.' },
          { status: 500 },
        )
      }
    }

    const cleanBrand = device_brand.trim()
    const cleanModel = device_model.trim()

    const faultDesc = (typeof fault_description === 'string' && fault_description.trim())
      ? fault_description.trim()
      : 'Arıza bildirimi'

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

    const dbStatus = normalizeStatus(body.status)

    const insertPayload = {
      tenant_id: tenantId,
      order_no: orderNo,
      customer_id: customerId,
      customer_name: (typeof customer_name === 'string' && customer_name.trim()) ? customer_name.trim() : 'Müşteri',
      customer_phone: typeof customer_phone === 'string' ? customer_phone.replace(/\s/g, '') : '',
      device_brand: cleanBrand,
      device_model: cleanModel,
      fault_description: faultDesc,
      status: dbStatus,
      received_at: new Date().toISOString(),
      imei: (typeof body.imei === 'string' && body.imei.trim()) ? body.imei.trim() : null,
      serial_no: (typeof body.serial_no === 'string' && body.serial_no.trim()) ? body.serial_no.trim() : null,
      device_color: (typeof body.device_color === 'string' && body.device_color.trim()) ? body.device_color.trim() : null,
      lock_code: (typeof body.lock_code === 'string' && body.lock_code.trim()) ? body.lock_code.trim() : null,
      technician_notes: (typeof body.technician_notes === 'string' && body.technician_notes.trim()) ? body.technician_notes.trim() : null,
      technician_id: technicianId,
      branch_id: branchId,
      estimated_cost: Number(body.estimated_cost) || 0,
      actual_cost: body.actual_cost != null && body.actual_cost !== '' ? Number(body.actual_cost) : null,
      payment_method: body.payment_method || null,
      estimated_delivery: body.estimated_delivery || null,
    }

    const { data: newOrder, error: insertErr } = await db
      .from('service_orders')
      .insert(insertPayload)
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
      if (insertErr.code === '22P02') {
        return NextResponse.json({ error: 'Geçersiz veri formatı (UUID veya sayısal alan hatası).' }, { status: 400 })
      }
      if (insertErr.code === '23502') {
        return NextResponse.json({ error: 'Zorunlu alan eksik: ' + (insertErr.message || 'Lütfen tüm alanları doldurun.') }, { status: 400 })
      }
      if (insertErr.code === '23505') {
        return NextResponse.json({ error: 'Bu sipariş numarası veya kayıt zaten mevcut.' }, { status: 409 })
      }
      if (insertErr.code === '42501') {
        return NextResponse.json({ error: 'Veritabanı yazma yetkisi bulunamadı.' }, { status: 403 })
      }
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
