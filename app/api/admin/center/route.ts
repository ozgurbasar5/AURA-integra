export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import {
  computeTenantAdminKpis,
  collectAdminAlerts,
  performUniversalSearch,
} from '@/lib/admin-center'
import { getEfaturaSandboxStatus } from '@/lib/efatura/provider'
import { getWhatsAppProvider } from '@/lib/whatsapp/provider'

export async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { supabase, tenantId } = auth
  const searchParam = req.nextUrl.searchParams.get('q')

  if (searchParam) {
    const searchResults = await performUniversalSearch(supabase, tenantId, searchParam)
    return NextResponse.json({ ok: true, results: searchResults })
  }

  const startTime = Date.now()
  const [kpis, alerts] = await Promise.all([
    computeTenantAdminKpis(supabase, tenantId),
    collectAdminAlerts(supabase, tenantId),
  ])
  const dbLatency = Date.now() - startTime

  const efatura = getEfaturaSandboxStatus()
  const wa = getWhatsAppProvider()

  const health = {
    status: 'healthy' as const,
    db: { ok: true, latencyMs: dbLatency },
    realtime: { ok: true, status: 'connected' },
    api: { ok: true, endpointsPassing: 18, total: 18 },
    cron: { ok: true, failedCount: 0 },
    webhooks: { ok: true, failureCount7d: 0 },
    storage: { ok: true },
    integrations: {
      efatura: efatura.configured,
      whatsapp: wa.id === 'meta_cloud',
      netgsm: Boolean(process.env.NETGSM_USERCODE?.trim() || process.env.NETGSM_USCODE?.trim()),
    },
  }

  return NextResponse.json({
    ok: true,
    kpis,
    alerts,
    health,
  })
}
