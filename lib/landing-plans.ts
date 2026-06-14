import { createClient } from '@/lib/supabase/server'
import { getPlanLevel, PLAN_TIERS, type PlanLevel } from '@/lib/plan-tiers'

export type LandingPlanCard = {
  id: string
  name: string
  price: number
  features: string[]
  popular: boolean
  level: PlanLevel
  max_users: number
  max_branches: number
}

type DbPlan = {
  id: string
  name: string
  price: number
  max_users: number
  max_branches: number
  features: string[] | null
  is_active: boolean
  created_at?: string
}

function fmtPrice(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n)
}

/** Seviye başına tek kayıt — admin’de düzenlenen DB değerleri korunur */
export function normalizePlansByLevel(rows: DbPlan[]): DbPlan[] {
  const byLevel = new Map<PlanLevel, DbPlan>()

  for (const row of rows) {
    const level = getPlanLevel(row.name)
    const existing = byLevel.get(level)
    if (!existing) {
      byLevel.set(level, row)
      continue
    }
    const a = existing.created_at ? new Date(existing.created_at).getTime() : Infinity
    const b = row.created_at ? new Date(row.created_at).getTime() : Infinity
    if (b < a) byLevel.set(level, row)
  }

  return ([1, 2, 3] as PlanLevel[]).map((level) => {
    const db = byLevel.get(level)
    if (db) {
      return {
        ...db,
        features: Array.isArray(db.features) ? db.features : [],
      }
    }
    const tier = PLAN_TIERS.find((t) => t.level === level)!
    return {
      id: `00000000-0000-0000-0000-00000000000${level}`,
      name: tier.name,
      price: tier.price,
      max_users: tier.max_users,
      max_branches: tier.max_branches,
      features: tier.features,
      is_active: level === 2,
    }
  })
}

function toLandingCard(p: DbPlan): LandingPlanCard {
  const features = Array.isArray(p.features) ? [...p.features] : []
  const hasLimits = features.some((f) => /kullanıcı|şube/i.test(f))
  if (!hasLimits) {
    features.push(`${p.max_users} kullanıcı`, `${p.max_branches} şube`)
  }
  return {
    id: p.id,
    name: p.name,
    price: Number(p.price),
    features,
    popular: p.is_active,
    level: getPlanLevel(p.name),
    max_users: p.max_users,
    max_branches: p.max_branches,
  }
}

export function plansFromTiers(): LandingPlanCard[] {
  return PLAN_TIERS.map((t) =>
    toLandingCard({
      id: `fallback-${t.level}`,
      name: t.name,
      price: t.price,
      max_users: t.max_users,
      max_branches: t.max_branches,
      features: t.features,
      is_active: t.level === 2,
    })
  )
}

export async function getLandingPlans(): Promise<{
  trialDays: number
  plans: LandingPlanCard[]
}> {
  const fallback = { trialDays: 30, plans: plansFromTiers() }

  try {
    const supabase = createClient()
    const [{ data: planRows }, { data: settingsRow }] = await Promise.all([
      supabase.from('subscription_plans').select('*').order('price', { ascending: true }),
      supabase.from('platform_settings').select('settings').eq('id', 'default').maybeSingle(),
    ])

    const settings = settingsRow?.settings as Record<string, unknown> | undefined
    const trialDays = Number(settings?.deneme_suresi) || 30

    if (!planRows?.length) return { ...fallback, trialDays }

    const normalized = normalizePlansByLevel(planRows as DbPlan[])
    return {
      trialDays,
      plans: normalized.map(toLandingCard),
    }
  } catch {
    return fallback
  }
}

export { fmtPrice }
