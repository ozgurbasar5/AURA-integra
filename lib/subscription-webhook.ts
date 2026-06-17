import type { SupabaseClient } from '@supabase/supabase-js'
import { extendSubscriptionEnd } from '@/lib/subscription'

export function stripeAmountToMajor(obj: Record<string, unknown>): number {
  if (obj.amount_total != null) return Number(obj.amount_total) / 100
  if (obj.amount_paid != null) return Number(obj.amount_paid) / 100
  return 0
}

export async function activateTenantSubscription(
  admin: SupabaseClient,
  tenantId: string,
  opts: {
    amount?: number
    planId?: string | null
    provider: 'stripe' | 'iyzico' | 'manual'
    externalRef?: string
    periodDays?: number
  },
): Promise<{ subscription_end: string } | null> {
  const periodDays = opts.periodDays ?? 30
  const externalRef = opts.externalRef?.trim()

  if (externalRef) {
    const { data: existingPayment } = await admin
      .from('tenant_payments')
      .select('id')
      .eq('tenant_id', tenantId)
      .eq('payment_method', opts.provider)
      .eq('external_ref', externalRef)
      .maybeSingle()

    if (existingPayment?.id) {
      const { data: tenant } = await admin
        .from('tenants')
        .select('subscription_end')
        .eq('id', tenantId)
        .single()
      if (tenant?.subscription_end) {
        return { subscription_end: tenant.subscription_end }
      }
    }
  }

  const { data: tenant } = await admin
    .from('tenants')
    .select('subscription_end, plan_id')
    .eq('id', tenantId)
    .single()

  const newEnd = extendSubscriptionEnd(tenant?.subscription_end, periodDays)

  const { error: payErr } = await admin.from('tenant_payments').insert({
    tenant_id: tenantId,
    plan_id: opts.planId ?? tenant?.plan_id ?? null,
    amount: opts.amount ?? 0,
    status: 'paid',
    due_date: new Date().toISOString().slice(0, 10),
    paid_at: new Date().toISOString(),
    payment_method: opts.provider,
    external_ref: externalRef ?? null,
    notes: externalRef ? `${opts.provider}:${externalRef}` : opts.provider,
  })

  if (payErr) {
    if (payErr.message.includes('idx_tenant_payments_external_ref') || payErr.code === '23505') {
      const { data: current } = await admin
        .from('tenants')
        .select('subscription_end')
        .eq('id', tenantId)
        .single()
      return current?.subscription_end ? { subscription_end: current.subscription_end } : null
    }
    console.error('[subscription-webhook] tenant_payments insert failed:', payErr.message)
    return null
  }

  const { error } = await admin
    .from('tenants')
    .update({
      status: 'active',
      subscription_end: newEnd,
      last_activity_at: new Date().toISOString(),
      ...(opts.planId ? { plan_id: opts.planId } : {}),
    })
    .eq('id', tenantId)

  if (error) return null
  return { subscription_end: newEnd }
}
