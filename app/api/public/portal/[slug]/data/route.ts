export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { resolveTenantByPortalSlug } from '@/lib/portal-tenant'
import { enforcePublicRateLimit } from '@/lib/public-rate-limit'
import { verifyPortalSessionToken } from '@/lib/portal-session'
import { maskPhone } from '@/lib/pii-crypto'
import {
  mapDbOrderToCustomerSafeOrder,
  mapDbWarrantyToCustomerSafeWarranty,
  type CustomerPortalDataResponse,
} from '@/lib/portal-dto'

type RouteParams = { params: { slug: string } }

export async function GET(req: NextRequest, { params }: RouteParams) {
  const limited = await enforcePublicRateLimit(req, 'portal-data', 60, 15 * 60 * 1000)
  if (limited) return limited

  const authHeader = req.headers.get('Authorization')
  const queryToken = req.nextUrl.searchParams.get('token')
  const sessionToken = authHeader?.replace(/^Bearer\s+/i, '') || queryToken

  if (!sessionToken) {
    return NextResponse.json({ error: 'Oturum tokenı gereklidir' }, { status: 401 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Servis kullanılamıyor' }, { status: 503 })

  const tenant = await resolveTenantByPortalSlug(admin, params.slug)
  if (!tenant) return NextResponse.json({ error: 'Bayi bulunamadı' }, { status: 404 })

  const flags = tenant.feature_flags ?? {}
  if (flags.portal === false) {
    return NextResponse.json({ error: 'Portal kapalı' }, { status: 403 })
  }

  // 1. Verify session token
  const verified = verifyPortalSessionToken(sessionToken, tenant.id)
  if (!verified.ok || !verified.payload) {
    return NextResponse.json({ error: verified.error || 'Geçersiz veya süresi dolmuş oturum' }, { status: 401 })
  }

  const customerPhone = verified.payload.customerPhone

  // 2. Fetch customer's orders for this tenant
  const { data: orderRows, error: orderErr } = await admin
    .from('service_orders')
    .select(`
      id, order_no, status, device_brand, device_model, device_color, imei,
      estimated_cost, actual_cost, approval_amount, approval_desc, approval_status,
      approval_token, approval_expires_at,
      created_at, estimated_delivery, fault_description, description,
      customer_name, customer_phone,
      customers ( full_name, phone, email, address, kvkk_consent_date )
    `)
    .eq('tenant_id', tenant.id)
    .ilike('customer_phone', `%${customerPhone}%`)
    .order('created_at', { ascending: false })

  if (orderErr) {
    return NextResponse.json({ error: 'Siparişler yüklenemedi' }, { status: 500 })
  }

  // Fetch status history for each order to build timelines
  const orderIds = (orderRows ?? []).map(o => o.id)
  let historyMap: Record<string, Array<{ status: string; note?: string | null; created_at: string }>> = {}

  if (orderIds.length > 0) {
    const { data: historyData } = await admin
      .from('service_status_history')
      .select('order_id, status, note, created_at')
      .in('order_id', orderIds)
      .order('created_at', { ascending: true })

    if (historyData) {
      for (const h of historyData) {
        if (!historyMap[h.order_id]) historyMap[h.order_id] = []
        historyMap[h.order_id].push({
          status: String(h.status),
          note: h.note,
          created_at: String(h.created_at),
        })
      }
    }
  }

  // Map to customer-safe order DTOs
  const orders = (orderRows ?? []).map(r =>
    mapDbOrderToCustomerSafeOrder(r as Record<string, unknown>, historyMap[String(r.id)]),
  )

  // 3. Fetch customer's warranties for this tenant
  const { data: warrantyRows } = await admin
    .from('warranties')
    .select(`
      id, device_brand, device_model, imei,
      start_date, end_date, warranty_months, status,
      covered_parts, exclusion_reasons, claim_status, claimed_at, qr_token
    `)
    .eq('tenant_id', tenant.id)
    .ilike('customer_phone', `%${customerPhone}%`)
    .order('start_date', { ascending: false })

  const warranties = (warrantyRows ?? []).map(w =>
    mapDbWarrantyToCustomerSafeWarranty(w as Record<string, unknown>),
  )

  // Active order is the most recent non-delivered/non-cancelled order, or the latest order
  const activeOrder =
    orders.find(o => !['teslim', 'iptal'].includes(o.public_status)) ?? orders[0] ?? null

  // 4. Resolve customer profile from records
  const firstCustomer = (orderRows?.[0]?.customers as {
    full_name?: string
    phone?: string
    email?: string
    address?: string
    kvkk_consent_date?: string
  }) || null

  const customerProfile = {
    name: verified.payload.customerName || firstCustomer?.full_name || 'Değerli Müşterimiz',
    phone_masked: maskPhone(customerPhone),
    email: firstCustomer?.email || null,
    address: firstCustomer?.address || null,
    kvkk_consented: Boolean(firstCustomer?.kvkk_consent_date),
    kvkk_consent_date: firstCustomer?.kvkk_consent_date || null,
  }

  // 5. Generate notifications derived from current states
  const notifications: CustomerPortalDataResponse['notifications'] = []

  for (const o of orders) {
    if (o.approval_status === 'pending') {
      notifications.push({
        id: `notif-quote-${o.id}`,
        title: 'Teklifiniz Hazır!',
        message: `${o.device_brand} ${o.device_model} cihazınız için onarım teklifi onayınızı bekliyor.`,
        type: 'quote',
        created_at: o.created_at,
        read: false,
        target_tab: 'services',
        target_id: o.id,
      })
    } else if (o.public_status === 'teslime_hazir') {
      notifications.push({
        id: `notif-ready-${o.id}`,
        title: 'Cihazınız Teslime Hazır!',
        message: `${o.device_brand} ${o.device_model} onarımı tamamlandı ve kalite kontrolden geçti.`,
        type: 'status',
        created_at: o.created_at,
        read: false,
        target_tab: 'services',
        target_id: o.id,
      })
    } else if (o.public_status === 'tamir') {
      notifications.push({
        id: `notif-repair-${o.id}`,
        title: 'Cihazınız Onarımda',
        message: `${o.device_brand} ${o.device_model} cihazınız teknisyenimiz tarafından onarılıyor.`,
        type: 'status',
        created_at: o.created_at,
        read: true,
        target_tab: 'services',
        target_id: o.id,
      })
    }
  }

  for (const w of warranties) {
    if (w.claim_status === 'beklemede') {
      notifications.push({
        id: `notif-claim-${w.id}`,
        title: 'Garanti Talebiniz Alındı',
        message: `${w.device_brand} ${w.device_model} garanti talebiniz mağazamız tarafından inceleniyor.`,
        type: 'warranty',
        created_at: w.claimed_at || w.start_date,
        read: false,
        target_tab: 'warranty',
        target_id: w.id,
      })
    }
  }

  const responsePayload: CustomerPortalDataResponse = {
    tenant: {
      name: tenant.company_name,
      phone: tenant.phone || '',
      address: null,
      logo: null,
      slug: params.slug,
    },
    customer: customerProfile,
    active_order: activeOrder,
    orders,
    warranties,
    notifications,
  }

  return NextResponse.json(responsePayload)
}
