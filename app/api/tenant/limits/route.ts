export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getPlanLevel, PLAN_TIERS } from '@/lib/plan-tiers'

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

  return NextResponse.json({
    ok: true,
    limits: {
      max_users: plan?.max_users ?? tier?.max_users ?? 3,
      max_branches: plan?.max_branches ?? tier?.max_branches ?? 1,
      plan_level: level,
      plan_name: plan?.name ?? tier?.name ?? 'Stok & Satış',
    },
  })
}
