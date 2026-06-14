import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { normalizePlansByLevel } from '@/lib/landing-plans'

export const dynamic = 'force-dynamic'

/** Anasayfa / başvuru — auth gerektirmez (subscription_plans public SELECT) */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.json({ data: [], trialDays: 30 })
  }

  try {
    const supabase = createClient(url, key)
    const [{ data: plans }, { data: settingsRow }] = await Promise.all([
      supabase.from('subscription_plans').select('*').order('price', { ascending: true }),
      supabase.from('platform_settings').select('settings').eq('id', 'default').maybeSingle(),
    ])

    const settings = settingsRow?.settings as Record<string, unknown> | undefined
    const trialDays = Number(settings?.deneme_suresi) || 30
    const normalized = normalizePlansByLevel((plans ?? []) as Parameters<typeof normalizePlansByLevel>[0])

    return NextResponse.json({
      trialDays,
      data: normalized.map((p) => ({
        id: p.id,
        name: p.name,
        price: Number(p.price),
        max_users: p.max_users,
        max_branches: p.max_branches,
        features: Array.isArray(p.features) ? p.features : [],
        is_active: p.is_active,
      })),
    })
  } catch {
    return NextResponse.json({ data: [], trialDays: 30 })
  }
}
