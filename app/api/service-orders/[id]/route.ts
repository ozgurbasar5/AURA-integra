export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth, isUuid } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { mapStoreStatusToDb } from '@/lib/erp-features'
import { buildStatusSmsMessage, sendSms, sendWhatsApp, logNotification } from '@/lib/notification-service'
import { notifyTenantPushOnStatus, shouldNotifyPush } from '@/lib/expo-push'
import { getTenantSmsCredentials, logSmsToDb } from '@/lib/tenant-sms'
import { withApiHandler } from '@/lib/api-handler'
import { safeClientMessage } from '@/lib/api-error'
import { canWriteTenantData, roleGuardResponse } from '@/lib/api-role-guard'
import type { ServiceOrderStatus } from '@/types/database'

type RouteContext = { params?: Record<string, string> }

function normalizeStatus(raw: string): ServiceOrderStatus {
  const mapped = mapStoreStatusToDb(raw) as ServiceOrderStatus
  const allowed: ServiceOrderStatus[] = [
    'alindi', 'teshis', 'onay_bekleniyor', 'tamir', 'kalite_kontrol', 'teslime_hazir', 'teslim', 'iptal',
  ]
  return allowed.includes(mapped) ? mapped : 'alindi'
}

const ORDER_SELECT = `
  *,
  customers ( id, full_name, phone, email ),
  technician:user_profiles!technician_id ( id, full_name ),
  tenants ( shop_name, company_name, feature_flags )
`

export const GET = withApiHandler(async function GET(_req: NextRequest, ctx: RouteContext) {
  const id = ctx.params?.id ?? ''
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'Geçersiz kayıt kimliği.' }, { status: 400 })
  }

  const { data, error } = await auth.supabase
    .from('service_orders')
    .select(ORDER_SELECT)
    .eq('id', id)
    .eq('tenant_id', auth.tenantId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Kayıt bulunamadı.' }, { status: 404 })
  }

  return NextResponse.json({ data })
}, 'service-orders/[id]')

export const PATCH = withApiHandler(async function PATCH(req: NextRequest, ctx: RouteContext) {
  const id = ctx.params?.id ?? ''
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })
  if (!canWriteTenantData(auth.role)) {
    const denied = roleGuardResponse()
    return NextResponse.json({ error: denied.message }, { status: denied.status })
  }
  if (!isUuid(id)) {
    return NextResponse.json({ error: 'Geçersiz kayıt kimliği.' }, { status: 400 })
  }

  const { supabase, tenantId, userId } = auth

  const body = await req.json() as {
    status?: string
    actual_cost?: number
    estimated_cost?: number
    technician_notes?: string
    fault_description?: string
    closed_at?: string | null
    device_images?: string[]
    used_parts?: unknown[]
    approval_status?: string
    delivered_at?: string | null
    technician_id?: string | null
    technician_name?: string | null
    private_note?: string | null
    final_checks?: string[]
    expenses?: Array<{ description: string; amount: number }>
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (body.status != null) patch.status = normalizeStatus(body.status)
  if (body.actual_cost != null) patch.actual_cost = body.actual_cost
  if (body.estimated_cost != null) patch.estimated_cost = body.estimated_cost
  if (body.technician_notes != null) patch.technician_notes = body.technician_notes
  if (body.fault_description != null) patch.fault_description = body.fault_description

  if (body.technician_id !== undefined) {
    patch.technician_id = body.technician_id || null
  } else if (body.technician_name !== undefined) {
    const name = (body.technician_name || '').trim()
    if (!name) {
      patch.technician_id = null
    } else {
      const { data: tech } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('tenant_id', tenantId)
        .ilike('full_name', name)
        .limit(1)
        .maybeSingle()
      patch.technician_id = tech?.id ?? null
    }
  }

  if (body.device_images != null) {
    if (!Array.isArray(body.device_images) || body.device_images.some(i => typeof i !== 'string')) {
      return NextResponse.json({ error: 'device_images geçersiz.' }, { status: 400 })
    }
    if (body.device_images.length > 8) {
      return NextResponse.json({ error: 'En fazla 8 fotoğraf yüklenebilir.' }, { status: 400 })
    }
    patch.device_images = body.device_images
  }

  if (body.private_note !== undefined) patch.private_note = body.private_note

  const needsMeta =
    (body.used_parts != null && Array.isArray(body.used_parts)) ||
    body.final_checks != null ||
    body.expenses != null

  if (needsMeta) {
    const { data: existing } = await supabase
      .from('service_orders')
      .select('metadata')
      .eq('id', id)
      .eq('tenant_id', tenantId)
      .maybeSingle()

    const meta = (existing?.metadata as Record<string, unknown>) ?? {}
    const nextMeta = { ...meta }
    if (body.used_parts != null && Array.isArray(body.used_parts)) {
      nextMeta.used_parts = body.used_parts
    }
    if (body.final_checks != null && Array.isArray(body.final_checks)) {
      nextMeta.final_checks = body.final_checks.map(String)
    }
    if (body.expenses != null && Array.isArray(body.expenses)) {
      nextMeta.expenses = body.expenses
    }
    patch.metadata = nextMeta
  }

  if (body.approval_status != null) patch.approval_status = body.approval_status
  if (body.delivered_at !== undefined) patch.closed_at = body.delivered_at
  if (body.status === 'teslim' || body.status === 'delivered') {
    patch.closed_at = body.closed_at ?? new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('service_orders')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', tenantId)
    .select(ORDER_SELECT)
    .single()

  if (error || !data) {
    return NextResponse.json(
      { error: safeClientMessage(error, 'Güncelleme başarısız.') },
      { status: 500 },
    )
  }

  if (body.status != null) {
    await supabase.from('service_status_history').insert({
      order_id: id,
      tenant_id: tenantId,
      status: data.status,
      note: 'Durum güncellendi.',
      created_by: userId,
    })

    const orderRow = data as Record<string, unknown>
    const phone = String(orderRow.customer_phone ?? '')
    const orderNo = String(orderRow.order_no ?? '')
    const tenantRow = orderRow.tenants as {
      shop_name?: string
      company_name?: string
      feature_flags?: Record<string, boolean>
    } | null
    const shopName = String(tenantRow?.shop_name ?? tenantRow?.company_name ?? 'Servis')
    const dbStatus = String(data.status ?? '')
    const customerName = String(orderRow.customer_name ?? '')

    if (tenantId && dbStatus && shouldNotifyPush(dbStatus)) {
      await notifyTenantPushOnStatus({
        tenantId,
        status: dbStatus,
        orderNo,
        customerName,
          orderId: id,
      }).catch(() => {})
    }

    if (tenantId && phone && dbStatus) {
      const flags = tenantRow?.feature_flags ?? {}
      if (flags.sms !== false) {
        const msg = buildStatusSmsMessage(dbStatus, orderNo, shopName)
        if (msg) {
          const credentials = await getTenantSmsCredentials(tenantId)
          const waResult = await sendWhatsApp({ to: phone, message: msg, tenantId })
          const svc = getServiceClient()
          if (svc && waResult.ok) {
            await logNotification(svc, tenantId, {
              channel: 'whatsapp',
              recipient: phone,
              content: msg + (waResult.waMeUrl ? ` | ${waResult.waMeUrl}` : ''),
              status: waResult.status,
              order_no: orderNo,
              customer_name: customerName,
            })
          }

          const smsResult = await sendSms({
            to: phone,
            message: msg,
            orderNo,
            tenantId,
            customerName,
            credentials,
          })

          if (svc) {
            await logNotification(svc, tenantId, {
              channel: 'sms',
              recipient: phone,
              content: msg,
              status: smsResult.ok ? smsResult.status : 'failed',
              order_no: orderNo,
              customer_name: customerName,
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
            customerName,
          })
        }
      }
    }
  }

  return NextResponse.json({ data })
}, 'service-orders/[id]')
