import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'

export const dynamic = 'force-dynamic'

type OnboardingPayload = {
  onboarding_completed?: boolean
  setup_wizard_completed?: boolean
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

  const patch: Record<string, boolean> = {}
  if (typeof body.onboarding_completed === 'boolean') {
    patch.onboarding_completed = body.onboarding_completed
  }
  if (typeof body.setup_wizard_completed === 'boolean') {
    patch.setup_wizard_completed = body.setup_wizard_completed
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json(
      { error: 'onboarding_completed veya setup_wizard_completed (boolean) gerekli' },
      { status: 400 },
    )
  }

  const admin = getServiceClient()
  const client = admin ?? auth.supabase

  let { error } = await client
    .from('user_profiles')
    .update(patch)
    .eq('id', auth.userId)

  if (error?.message?.includes('setup_wizard_completed') && patch.setup_wizard_completed != null) {
    const fallback = { ...patch }
    delete fallback.setup_wizard_completed
    if (Object.keys(fallback).length > 0) {
      ;({ error } = await client.from('user_profiles').update(fallback).eq('id', auth.userId))
    } else {
      error = null
    }
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, ...patch })
}
