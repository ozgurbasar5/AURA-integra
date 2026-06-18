export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getEfaturaProviderLabel } from '@/lib/efatura/provider'

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  return NextResponse.json({
    provider: getEfaturaProviderLabel(),
    configured: getEfaturaProviderLabel() !== 'Stub (test modu)',
  })
}
