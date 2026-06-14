import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getPlanLevel, PLAN_TIERS, type PlanLevel } from '@/lib/plan-tiers'

export const dynamic = 'force-dynamic'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

interface DbPlan {
  id: string
  name: string
  price: number
  max_users: number
  max_branches: number
  features: string[]
  is_active: boolean
  created_at?: string
}

/**
 * Mükerrer paketleri seviyeye göre tekilleştirir ve kanonik 3 paket
 * (Stok & Satış / Teknik Servis / Finans & Analitik) olarak normalize eder.
 * Her seviyeden en eski kayıt "kanonik" sayılır (gerçek id korunur → FK güvenli).
 */
function dedupePlans(rows: DbPlan[]): DbPlan[] {
  const byLevel = new Map<PlanLevel, DbPlan>()

  for (const row of rows) {
    const level = getPlanLevel(row.name)
    const existing = byLevel.get(level)
    if (!existing) {
      byLevel.set(level, row)
    } else {
      // En eski kaydı kanonik tut
      const a = existing.created_at ? new Date(existing.created_at).getTime() : 0
      const b = row.created_at ? new Date(row.created_at).getTime() : 0
      if (b < a) byLevel.set(level, row)
    }
  }

  return PLAN_TIERS.map((tier) => {
    const db = byLevel.get(tier.level)
    if (db) {
      // Gerçek id'yi koru, ama isim/fiyat/limit/özellikleri kanonik tanıma hizala
      return {
        id: db.id,
        name: tier.name,
        price: tier.price,
        max_users: tier.max_users,
        max_branches: tier.max_branches,
        features: tier.features,
        is_active: db.is_active,
        created_at: db.created_at,
      }
    }
    // DB'de yoksa placeholder (SQL henüz çalıştırılmamış)
    return {
      id: `00000000-0000-0000-0000-00000000000${tier.level}`,
      name: tier.name,
      price: tier.price,
      max_users: tier.max_users,
      max_branches: tier.max_branches,
      features: tier.features,
      is_active: tier.level === 1,
    }
  })
}

/** VantaPhone tarzı 3 paket — yalnızca biri vitrin (is_active) olabilir */
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth.authorized) return auth.error

    const admin = getAdminClient()
    const body = await request.json()
    const { action, plan_id, updates } = body

    if (action === 'set_catalog') {
      if (!plan_id) return NextResponse.json({ error: 'plan_id gerekli' }, { status: 400 })

      await admin.from('subscription_plans').update({ is_active: false }).neq('id', plan_id)
      const { data, error } = await admin
        .from('subscription_plans')
        .update({ is_active: true })
        .eq('id', plan_id)
        .select()
        .single()

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data, message: 'Vitrin paketi güncellendi' })
    }

    if (action === 'upsert_all') {
      const { plans } = body as { plans: Array<Record<string, unknown>> }
      if (!plans?.length) return NextResponse.json({ error: 'plans gerekli' }, { status: 400 })

      for (const plan of plans) {
        const { error } = await admin.from('subscription_plans').upsert(plan, { onConflict: 'id' })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      }
      return NextResponse.json({ success: true })
    }

    if (plan_id && updates) {
      const { data, error } = await admin
        .from('subscription_plans')
        .update(updates)
        .eq('id', plan_id)
        .select()
        .single()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true, data })
    }

    return NextResponse.json({ error: 'Geçersiz istek' }, { status: 400 })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const admin = getAdminClient()
    const { data, error } = await admin
      .from('subscription_plans')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const plans = dedupePlans((data ?? []) as DbPlan[])
    return NextResponse.json({ data: plans })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
