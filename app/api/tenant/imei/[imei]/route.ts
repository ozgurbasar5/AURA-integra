export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getImeiHistory, getImeiRiskScore, buildImeiTimeline } from '@/lib/imei-tracker'
import { imeiEventToStore } from '@/lib/db-mappers'

export async function GET(
  req: NextRequest,
  { params }: { params: { imei: string } }
) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const imei = params.imei
  if (!imei) {
    return NextResponse.json({ error: 'IMEI numarası gerekli' }, { status: 400 })
  }

  // 1. IMEI history getir (database model olarak)
  const history = await getImeiHistory(auth.tenantId, imei)

  // 3. Risk skorunu hesapla
  const risk = getImeiRiskScore(history)

  // 4. UI için timeline formatına dönüştür
  const timeline = buildImeiTimeline(history)

  return NextResponse.json({
    ok: true,
    imei,
    history,
    risk,
    timeline,
  })
}
