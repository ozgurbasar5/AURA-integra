export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { activateTenantSubscription } from '@/lib/subscription-webhook'
import { createHmac } from 'crypto'

function verifyIyzicoSignature(body: string, signature: string | null): boolean {
  const secret = process.env.IYZICO_SECRET
  if (!secret) {
    return process.env.NODE_ENV === 'development'
  }
  if (!signature) return false
  const expected = createHmac('sha256', secret).update(body).digest('hex')
  return expected === signature
}

/** iyzico ödeme webhook — abonelik aktivasyonu / yenileme */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === 'production' && !process.env.IYZICO_SECRET) {
    return NextResponse.json({ error: 'IYZICO_SECRET yapılandırılmamış' }, { status: 503 })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('x-iyz-signature')

  if (!verifyIyzicoSignature(rawBody, signature)) {
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

  const eventType = String(payload.eventType ?? payload.status ?? 'unknown')
  const metadata = payload.metadata as Record<string, unknown> | undefined
  const tenantId = payload.tenant_id ?? metadata?.tenant_id

  if (tenantId && (eventType.includes('SUCCESS') || eventType === 'payment.success')) {
    const amount = Number(payload.paidPrice ?? payload.price ?? 0)
    const planId = metadata?.plan_id ? String(metadata.plan_id) : null
    const result = await activateTenantSubscription(admin, String(tenantId), {
      amount: amount || undefined,
      planId,
      provider: 'iyzico',
      externalRef: String(payload.paymentId ?? eventType),
    })
    if (!result) {
      return NextResponse.json({ error: 'Tenant güncellenemedi', event: eventType }, { status: 500 })
    }
  }

  return NextResponse.json({ received: true, event: eventType })
}
