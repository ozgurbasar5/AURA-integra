export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { supabase, tenantId } = auth
  const { data } = await supabase
    .from('tenants')
    .select('feature_flags')
    .eq('id', tenantId)
    .single()

  const flags = (data?.feature_flags as Record<string, boolean>) ?? {}
  return NextResponse.json({
    ok: true,
    flags: {
      sms: flags.sms !== false,
      portal: flags.portal !== false,
      whatsapp: flags.whatsapp !== false,
      efatura: flags.efatura === true,
    },
  })
}
