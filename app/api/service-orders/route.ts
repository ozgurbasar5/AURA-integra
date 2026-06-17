export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mapStoreStatusToDb } from '@/lib/erp-features'
import type { ServiceOrderStatus, PaymentMethod } from '@/types/database'

async function resolveCustomerId(
  supabase: ReturnType<typeof createClient>,
  tenantId: string,
  customerName: string,
  customerPhone: string
): Promise<string | null> {
  const phone = customerPhone.replace(/\s/g, '')
  const { data: existing } = await supabase
    .from('customers')
    .select('id')
    .eq('tenant_id', tenantId)
    .eq('phone', phone)
    .maybeSingle()

  if (existing?.id) return existing.id

  const { data: created, error } = await supabase
    .from('customers')
    .insert({
      tenant_id: tenantId,
      full_name: customerName.trim(),
      phone,
    })
    .select('id')
    .single()

  if (error || !created) return null
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
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Profil bulunamadı.' }, { status: 403 })
    }

    if (profile.role === 'super_admin') {
      return NextResponse.json({ error: 'Süper admin tenant API kullanamaz' }, { status: 403 })
    }

    if (!profile.tenant_id) {
      return NextResponse.json({ error: 'Geçerli bir tenant bulunamadı.' }, { status: 403 })
    }

    const searchParams = req.nextUrl.searchParams
    const statusParam = searchParams.get('status')
    const status = statusParam ? normalizeStatus(statusParam) : null
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') ?? '50', 10)
    const offset = parseInt(searchParams.get('offset') ?? '0', 10)

    let query = supabase
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
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)
      .eq('tenant_id', profile.tenant_id)

    if (status) {
      query = query.eq('status', status)
    }

    if (search) {
      const safe = search.replace(/[%_\\]/g, '\\$&')
      query = query.or(
        `order_no.ilike.%${safe}%,device_brand.ilike.%${safe}%,device_model.ilike.%${safe}%`
      )
    }

    const { data, error, count } = await query

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data, count, limit, offset })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── POST /api/service-orders ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser()

    if (authErr || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile || !profile.tenant_id) {
      return NextResponse.json({ error: 'Geçerli bir tenant bulunamadı.' }, { status: 403 })
    }

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
        { status: 400 }
      )
    }

    let customer_id = rawCustomerId
    if (!customer_id) {
      if (!customer_name?.trim() || !customer_phone?.trim()) {
        return NextResponse.json(
          { error: 'customer_id veya customer_name + customer_phone gerekli.' },
          { status: 400 }
        )
      }
      customer_id = (await resolveCustomerId(
        supabase,
        profile.tenant_id,
        customer_name,
        customer_phone
      )) ?? undefined
      if (!customer_id) {
        return NextResponse.json({ error: 'Müşteri kaydı oluşturulamadı.' }, { status: 500 })
      }
    }

    const faultDesc = fault_description?.trim() || 'Arıza bildirimi'

    const { data: orderNoData, error: orderNoErr } = await supabase.rpc(
      'generate_order_no',
      { p_tenant_id: profile.tenant_id }
    )

    if (orderNoErr) {
      return NextResponse.json(
        { error: `Sipariş numarası üretilemedi: ${orderNoErr.message}` },
        { status: 500 }
      )
    }

    const dbStatus = normalizeStatus(rest.status)

    const { data: newOrder, error: insertErr } = await supabase
      .from('service_orders')
      .insert({
        tenant_id: profile.tenant_id,
        order_no: orderNoData as string,
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
      `
      )
      .single()

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    await supabase.from('service_status_history').insert({
      order_id: newOrder.id,
      status: newOrder.status,
      note: 'Servis kaydı oluşturuldu.',
      created_by: user.id,
    })

    return NextResponse.json({ data: newOrder }, { status: 201 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
