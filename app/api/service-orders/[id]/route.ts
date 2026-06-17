export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getServiceClient } from '@/lib/supabase/service'
import { mapStoreStatusToDb } from '@/lib/erp-features'
import { buildStatusSmsMessage, sendSms, logNotification } from '@/lib/notification-service'
import { getTenantSmsCredentials, logSmsToDb } from '@/lib/tenant-sms'
import type { ServiceOrderStatus } from '@/types/database'

type RouteParams = { params: { id: string } }

function normalizeStatus(raw: string): ServiceOrderStatus {
  const mapped = mapStoreStatusToDb(raw) as ServiceOrderStatus
  const allowed: ServiceOrderStatus[] = [
    'alindi', 'teshis', 'onay_bekleniyor', 'tamir', 'kalite_kontrol', 'teslim', 'iptal',
  ]
  return allowed.includes(mapped) ? mapped : 'alindi'
}

async function getAuthContext() {
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) as NextResponse }
  }

  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single()

  if (profileErr || !profile) {
    return { error: NextResponse.json({ error: 'Profil bulunamadı.' }, { status: 403 }) as NextResponse }
  }

  if (profile.role === 'super_admin') {
    return { error: NextResponse.json({ error: 'Süper admin tenant API kullanamaz' }, { status: 403 }) as NextResponse }
  }

  if (!profile.tenant_id) {
    return { error: NextResponse.json({ error: 'Geçerli bir tenant bulunamadı.' }, { status: 403 }) as NextResponse }
  }

  return { supabase, user, profile }
}

const ORDER_SELECT = `
  *,
  customers ( id, full_name, phone, email ),
  technician:user_profiles!technician_id ( id, full_name ),
  tenants ( shop_name, company_name, feature_flags )
`

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getAuthContext()
    if ('error' in ctx) return ctx.error
    const { supabase, profile } = ctx

    const { data, error } = await supabase
      .from('service_orders')
      .select(ORDER_SELECT)
      .eq('id', params.id)
      .eq('tenant_id', profile.tenant_id)
      .single()
    if (error || !data) {
      return NextResponse.json({ error: 'Kayıt bulunamadı.' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const ctx = await getAuthContext()
    if ('error' in ctx) return ctx.error
    const { supabase, user, profile } = ctx

    const body = await req.json() as {
      status?: string
      actual_cost?: number
      estimated_cost?: number
      technician_notes?: string
      fault_description?: string
      closed_at?: string | null
    }

    const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (body.status != null) patch.status = normalizeStatus(body.status)
    if (body.actual_cost != null) patch.actual_cost = body.actual_cost
    if (body.estimated_cost != null) patch.estimated_cost = body.estimated_cost
    if (body.technician_notes != null) patch.technician_notes = body.technician_notes
    if (body.fault_description != null) patch.fault_description = body.fault_description
    if (body.status === 'teslim' || body.status === 'delivered') {
      patch.closed_at = body.closed_at ?? new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('service_orders')
      .update(patch)
      .eq('id', params.id)
      .eq('tenant_id', profile.tenant_id)
      .select(ORDER_SELECT)
      .single()
    if (error || !data) {
      return NextResponse.json({ error: error?.message ?? 'Güncelleme başarısız.' }, { status: 500 })
    }

    if (body.status != null) {
      await supabase.from('service_status_history').insert({
        order_id: params.id,
        status: data.status,
        note: 'Durum güncellendi.',
        created_by: user.id,
      })

      const orderRow = data as Record<string, unknown>
      const tenantId = String(orderRow.tenant_id ?? profile.tenant_id ?? '')
      const phone = String(orderRow.customer_phone ?? '')
      const orderNo = String(orderRow.order_no ?? '')
      const tenantRow = orderRow.tenants as { shop_name?: string; company_name?: string; feature_flags?: Record<string, boolean> } | null
      const shopName = String(tenantRow?.shop_name ?? tenantRow?.company_name ?? 'Servis')
      const dbStatus = String(data.status ?? '')

      if (tenantId && phone && dbStatus) {
        const flags = tenantRow?.feature_flags ?? {}
        if (flags.sms === false) {
          return NextResponse.json({ data })
        }

        const msg = buildStatusSmsMessage(dbStatus, orderNo, shopName)
        if (msg) {
          const credentials = await getTenantSmsCredentials(tenantId)
          const smsResult = await sendSms({
            to: phone,
            message: msg,
            orderNo,
            tenantId,
            customerName: String(orderRow.customer_name ?? ''),
            credentials,
          })

          const svc = getServiceClient()
          if (svc) {
            await logNotification(svc, tenantId, {
              channel: 'sms',
              recipient: phone,
              content: msg,
              status: smsResult.ok ? smsResult.status : 'failed',
              order_no: orderNo,
              customer_name: String(orderRow.customer_name ?? ''),
            })
          }

          await logSmsToDb({
            tenantId,
            recipient: phone,
            message: msg,
            status: smsResult.status,
            providerRef: smsResult.providerRef,
            errorMessage: smsResult.error,
            orderNo,
            customerName: String(orderRow.customer_name ?? ''),
          })
        }
      }
    }

    return NextResponse.json({ data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
