export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { fetchTcmbFxRates } from '@/lib/fx-rates'

/** TCMB canlı döviz kurları (1 saat cache) */
export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  try {
    const payload = await fetchTcmbFxRates()
    return NextResponse.json(payload)
  } catch (err) {
    console.error('[fx-rates]', err)
    return NextResponse.json({ error: 'Döviz kurları alınamadı' }, { status: 502 })
  }
}
