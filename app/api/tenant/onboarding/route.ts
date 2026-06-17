import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'

export const dynamic = 'force-dynamic'

type OnboardingPayload = {
  onboarding_completed?: boolean
}

export async function PATCH(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  let body: OnboardingPayload
  try {
    body = (await req.json()) as OnboardingPayload
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (typeof body.onboarding_completed !== 'boolean') {
    return NextResponse.json(
      { error: 'onboarding_completed (boolean) gerekli' },
      { status: 400 },
    )
  }

  const { error } = await auth.supabase
    .from('user_profiles')
    .update({ onboarding_completed: body.onboarding_completed })
    .eq('id', auth.userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, onboarding_completed: body.onboarding_completed })
}
