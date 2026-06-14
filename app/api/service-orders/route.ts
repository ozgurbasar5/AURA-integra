export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ServiceOrderStatus, PaymentMethod } from '@/types/database'

// ─── GET /api/service-orders ───────────────────────────────────────────────────
// Lists service orders filtered by current user's tenant_id (via RLS).
// Supports optional query params: status, search, limit, offset
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

    // Fetch current user's profile to get tenant_id
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile) {
      return NextResponse.json({ error: 'Profil bulunamadı.' }, { status: 403 })
    }

    const searchParams = req.nextUrl.searchParams
    const status = searchParams.get('status') as ServiceOrderStatus | null
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

    // super_admin sees all; tenant users are already filtered by RLS,
    // but we apply explicit filter for clarity/safety
    if (profile.role !== 'super_admin' && profile.tenant_id) {
      query = query.eq('tenant_id', profile.tenant_id)
    }

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
// Creates a new service order for the current user's tenant
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

    // Fetch profile
    const { data: profile, error: profileErr } = await supabase
      .from('user_profiles')
      .select('tenant_id, role')
      .eq('id', user.id)
      .single()

    if (profileErr || !profile || !profile.tenant_id) {
      return NextResponse.json({ error: 'Geçerli bir tenant bulunamadı.' }, { status: 403 })
    }

    const body = await req.json() as {
      customer_id: string
      branch_id?: string
      device_brand: string
      device_model: string
      device_color?: string
      imei?: string
      serial_no?: string
      lock_code?: string
      fault_description: string
      technician_notes?: string
      status?: ServiceOrderStatus
      technician_id?: string
      estimated_cost?: number
      actual_cost?: number
      payment_method?: PaymentMethod
      estimated_delivery?: string
    }

    const {
      customer_id,
      device_brand,
      device_model,
      fault_description,
      ...rest
    } = body

    if (!customer_id || !device_brand || !device_model || !fault_description) {
      return NextResponse.json(
        { error: 'customer_id, device_brand, device_model ve fault_description zorunludur.' },
        { status: 400 }
      )
    }

    // Generate order number via DB function
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

    const { data: newOrder, error: insertErr } = await supabase
      .from('service_orders')
      .insert({
        tenant_id: profile.tenant_id,
        order_no: orderNoData as string,
        customer_id,
        device_brand,
        device_model,
        fault_description,
        status: rest.status ?? 'alindi',
        received_at: new Date().toISOString(),
        ...rest,
      })
      .select()
      .single()

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 500 })
    }

    // Insert initial status history record
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
