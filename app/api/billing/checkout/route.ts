export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canManageTenantSettings } from '@/lib/api-role-guard'
import { PLAN_TIERS, type PlanLevel } from '@/lib/plan-tiers'
import { getServerAppUrl } from '@/lib/app-url'

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }
  if (!canManageTenantSettings(auth.role)) {
    return NextResponse.json({ error: 'Ödeme başlatma yetkisi yok' }, { status: 403 })
  }

  let body: { plan_level?: PlanLevel }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const planLevel = body.plan_level ?? 2
  const tier = PLAN_TIERS.find(t => t.level === planLevel)
  if (!tier) {
    return NextResponse.json({ error: 'Geçersiz paket' }, { status: 400 })
  }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  const appUrl = getServerAppUrl(req.nextUrl.origin)

  if (!stripeKey) {
    return NextResponse.json({
      error: 'STRIPE_SECRET_KEY yapılandırılmamış. Admin ile iletişime geçin.',
      fallback: true,
      plan: tier.name,
      price: tier.price,
    }, { status: 503 })
  }

  if (process.env.NODE_ENV === 'production' && stripeKey.startsWith('sk_test_')) {
    console.warn('[billing] Production ortamında Stripe test key kullanılıyor — sk_live_ önerilir')
  }

  const { data: tenant } = await auth.supabase
    .from('tenants')
    .select('id, plan_id, company_name')
    .eq('id', auth.tenantId)
    .single()

  const params = new URLSearchParams()
  params.set('mode', 'payment')
  params.set('success_url', `${appUrl}/dashboard/plan-yukselt?paid=1`)
  params.set('cancel_url', `${appUrl}/dashboard/plan-yukselt?cancelled=1`)
  params.set('client_reference_id', auth.tenantId)
  params.append('line_items[0][price_data][currency]', 'try')
  params.append('line_items[0][price_data][product_data][name]', `AURA İntegra — ${tier.name}`)
  params.append('line_items[0][price_data][unit_amount]', String(tier.price * 100))
  params.append('line_items[0][quantity]', '1')
  params.append('metadata[tenant_id]', auth.tenantId)
  params.append('metadata[plan_id]', tenant?.plan_id ?? '')
  params.append('metadata[plan_level]', String(planLevel))

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${stripeKey}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  })

  const session = await res.json() as { url?: string; error?: { message?: string } }
  if (!res.ok) {
    return NextResponse.json({ error: session.error?.message ?? 'Stripe hatası' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, url: session.url })
}
