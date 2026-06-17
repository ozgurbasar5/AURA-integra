export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { activateTenantSubscription } from '@/lib/subscription-webhook'
import { createHmac, timingSafeEqual } from 'crypto'

function verifyStripeSignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) return process.env.NODE_ENV === 'development'
  if (!signatureHeader) return false

  const parts = Object.fromEntries(
    signatureHeader.split(',').map(p => {
      const [k, v] = p.split('=')
      return [k, v]
    })
  ) as { t?: string; v1?: string }

  if (!parts.t || !parts.v1) return false

  const signed = `${parts.t}.${rawBody}`
  const expected = createHmac('sha256', secret).update(signed).digest('hex')

  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(parts.v1))
  } catch {
    return false
  }
}

/** Stripe ödeme webhook — abonelik aktivasyonu */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET yapılandırılmamış' }, { status: 503 })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!verifyStripeSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  const eventType = String(payload.type ?? 'unknown')
  const dataObj = payload.data as { object?: Record<string, unknown> } | undefined
  const obj = dataObj?.object ?? {}
  const metadata = obj.metadata as Record<string, unknown> | undefined
  const tenantId = metadata?.tenant_id

  if (
    tenantId &&
    (eventType === 'checkout.session.completed' || eventType === 'invoice.payment_succeeded')
  ) {
    const amount = Number(obj.amount_total ?? obj.amount_paid ?? 0) / (obj.amount_total ? 100 : 1)
    const planId = metadata?.plan_id ? String(metadata.plan_id) : null
    const result = await activateTenantSubscription(admin, String(tenantId), {
      amount: amount || undefined,
      planId,
      provider: 'stripe',
      externalRef: String(obj.id ?? eventType),
    })
    if (!result) {
      return NextResponse.json({ error: 'Tenant güncellenemedi', event: eventType }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true, event: eventType })
}
