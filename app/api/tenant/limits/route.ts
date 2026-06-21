export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getPlanLevel, PLAN_TIERS } from '@/lib/plan-tiers'
import { AI_QUOTA_BY_PLAN, monthKey } from '@/lib/ai-quota'
import { getServiceClient } from '@/lib/supabase/service'

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { supabase, tenantId } = auth

  const { data: tenant } = await supabase
    .from('tenants')
    .select('plan_id, subscription_plans(name, max_users, max_branches)')
    .eq('id', tenantId)
    .single()

  const plan = tenant?.subscription_plans as {
    name?: string
    max_users?: number
    max_branches?: number
  } | null

  const level = getPlanLevel(plan?.name)
  const tier = PLAN_TIERS.find(t => t.level === level)
  const aiQuota = AI_QUOTA_BY_PLAN[level]

  let aiMessagesUsed = 0
  let aiTokensUsed = 0
  const admin = getServiceClient()
  if (admin) {
    const { data: q } = await admin
      .from('tenant_ai_quotas')
      .select('messages_used, tokens_used')
      .eq('tenant_id', tenantId)
      .eq('month_key', monthKey())
      .maybeSingle()
    aiMessagesUsed = Number(q?.messages_used ?? 0)
    aiTokensUsed = Number(q?.tokens_used ?? 0)
  }

  return NextResponse.json({
    ok: true,
    limits: {
      max_users: plan?.max_users ?? tier?.max_users ?? 3,
      max_branches: plan?.max_branches ?? tier?.max_branches ?? 1,
      plan_level: level,
      plan_name: plan?.name ?? tier?.name ?? 'Stok & Satış',
      ai_messages_limit: aiQuota.messages,
      ai_messages_remaining: Math.max(0, aiQuota.messages - aiMessagesUsed),
      ai_tokens_limit: aiQuota.tokens,
      ai_tokens_remaining: Math.max(0, aiQuota.tokens - aiTokensUsed),
    },
  })
}
