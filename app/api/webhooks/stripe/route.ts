export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { activateTenantSubscription, stripeAmountToMajor } from '@/lib/subscription-webhook'
import { logWebhookFailure } from '@/lib/webhook-failure-log'
import { captureException } from '@/lib/sentry'
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
    const amount = stripeAmountToMajor(obj)
    const planId = metadata?.plan_id ? String(metadata.plan_id) : null
    const result = await activateTenantSubscription(admin, String(tenantId), {
      amount: amount || undefined,
      planId,
      provider: 'stripe',
      externalRef: String(obj.id ?? eventType),
    })
    if (!result) {
      await logWebhookFailure(admin, {
        provider: 'stripe',
        eventType,
        externalRef: String(obj.id ?? eventType),
        tenantId: String(tenantId),
        errorMessage: 'Tenant güncellenemedi',
        payload,
      })
      return NextResponse.json({ error: 'Tenant güncellenemedi', event: eventType }, { status: 500 })
    }
  }

  if (eventType === 'invoice.payment_failed' && tenantId) {
    const { error: overdueErr } = await admin
      .from('tenants')
      .update({ status: 'payment_overdue', last_activity_at: new Date().toISOString() })
      .eq('id', String(tenantId))

    if (overdueErr) {
      await captureException(overdueErr, { eventType, tenantId })
      await logWebhookFailure(admin, {
        provider: 'stripe',
        eventType,
        tenantId: String(tenantId),
        errorMessage: overdueErr.message,
        payload,
      })
    }
  }

  return NextResponse.json({ received: true, event: eventType })
}
