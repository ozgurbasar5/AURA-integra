export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { resolveTenantByPortalSlug } from '@/lib/portal-tenant'
import { enforcePublicRateLimit } from '@/lib/public-rate-limit'
import { createPortalSessionToken } from '@/lib/portal-session'
import { maskPhone } from '@/lib/pii-crypto'
import { filterOrdersByTrackingQuery } from '@/lib/tracking-search'
import { PUBLIC_ORDER_SELECT } from '@/lib/public-tracking'

type RouteParams = { params: { slug: string } }

export async function POST(req: NextRequest, { params }: RouteParams) {
  // Anti-bruteforce rate limit: 15 verification attempts per 15 minutes
  const limited = await enforcePublicRateLimit(req, 'portal-auth-verify', 20, 15 * 60 * 1000)
  if (limited) return limited

  let body: {
    query?: string
    phone?: string
    order_no?: string
    imei?: string
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON formatı' }, { status: 400 })
  }

  const q = (body.query || body.order_no || body.imei || body.phone || '').trim()
  if (!q) {
    return NextResponse.json({ error: 'Takip kodu, servis numarası veya telefon gereklidir' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Servis kullanılamıyor' }, { status: 503 })

  const tenant = await resolveTenantByPortalSlug(admin, params.slug)
  if (!tenant) {
    return NextResponse.json({ error: 'Bayi bulunamadı' }, { status: 404 })
  }

  const flags = tenant.feature_flags ?? {}
  if (flags.portal === false) {
    return NextResponse.json({ error: 'Müşteri portali kapalı' }, { status: 403 })
  }

  // 1. Search for matching orders within this tenant
  const { data: recentOrders } = await admin
    .from('service_orders')
    .select(PUBLIC_ORDER_SELECT)
    .eq('tenant_id', tenant.id)
    .order('created_at', { ascending: false })
    .limit(200)

  const matched = filterOrdersByTrackingQuery(recentOrders ?? [], q)

  if (!matched.length) {
    // Also check warranties directly by IMEI if no active service orders matched
    const qDigits = q.replace(/\D/g, '')
    if (qDigits.length >= 8) {
      const { data: warranty } = await admin
        .from('warranties')
        .select('id, tenant_id, customer_name, customer_phone, imei')
        .eq('tenant_id', tenant.id)
        .eq('imei', q.trim())
        .maybeSingle()

      if (warranty && warranty.customer_phone) {
        const phoneDigits = warranty.customer_phone.replace(/\D/g, '').slice(-10)
        const token = createPortalSessionToken({
          tenantId: tenant.id,
          customerPhone: phoneDigits,
          customerName: warranty.customer_name || 'Müşteri',
        })

        return NextResponse.json({
          ok: true,
          token,
          customer: {
            name: warranty.customer_name || 'Müşteri',
            phone_masked: maskPhone(warranty.customer_phone),
          },
        })
      }
    }

    return NextResponse.json(
      {
        error: 'Kayıt bulunamadı. Lütfen servis numaranızı (örn: SRV-2026-0001) veya IMEI bilginizi kontrol edin.',
      },
      { status: 404 },
    )
  }

  const firstOrder = matched[0] as Record<string, unknown>
  const rawCust = firstOrder.customers as { full_name?: string; phone?: string } | { full_name?: string; phone?: string }[] | null
  const cust = Array.isArray(rawCust) ? rawCust[0] : rawCust
  const phone = String(firstOrder.customer_phone ?? cust?.phone ?? '')
  const name = String(firstOrder.customer_name ?? cust?.full_name ?? 'Müşteri')

  if (!phone) {
    return NextResponse.json({ error: 'Kayıtta doğrulanabilir iletişim bilgisi bulunamadı' }, { status: 400 })
  }

  const phoneDigits = phone.replace(/\D/g, '').slice(-10)

  // Generate server-authoritative time-limited session token
  const token = createPortalSessionToken({
    tenantId: tenant.id,
    customerPhone: phoneDigits,
    customerName: name,
    orderId: String(firstOrder.id),
  })

  return NextResponse.json({
    ok: true,
    token,
    customer: {
      name,
      phone_masked: maskPhone(phone),
    },
  })
}
