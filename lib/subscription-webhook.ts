import { extendSubscriptionEnd } from '@/lib/subscription'
import type { SupabaseClient } from '@supabase/supabase-js'

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
    notes: opts.externalRef ? `${opts.provider}:${opts.externalRef}` : opts.provider,
  })

  if (payErr) {
    console.error('[subscription-webhook] tenant_payments insert failed:', payErr.message)
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
