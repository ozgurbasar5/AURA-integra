export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getEfaturaSandboxStatus } from '@/lib/efatura/provider'
import { getServiceClient } from '@/lib/supabase/service'

async function countByStatus(
  admin: NonNullable<ReturnType<typeof getServiceClient>>,
  tenantId: string,
  status: string,
) {
  const { count } = await admin
    .from('efatura_queue')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('status', status)
  return count ?? 0
}

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const status = getEfaturaSandboxStatus()

  let queue = {
    pending: 0,
    processing: 0,
    failed: 0,
    done: 0,
    recent: [] as Array<Record<string, unknown>>,
  }

  const admin = getServiceClient()
  if (admin) {
    const { data: rows } = await admin
      .from('efatura_queue')
      .select('id, status, invoice_id, gib_reference, last_error, attempts, updated_at, created_at')
      .eq('tenant_id', auth.tenantId)
      .order('updated_at', { ascending: false })
      .limit(20)

    const [pending, processing, failed, done, submitted, completed] = await Promise.all([
      countByStatus(admin, auth.tenantId, 'pending'),
      countByStatus(admin, auth.tenantId, 'processing'),
      countByStatus(admin, auth.tenantId, 'failed'),
      countByStatus(admin, auth.tenantId, 'done'),
      countByStatus(admin, auth.tenantId, 'submitted'),
      countByStatus(admin, auth.tenantId, 'completed'),
    ])

    queue = {
      pending,
      processing,
      failed,
      done: done + submitted + completed,
      recent: (rows ?? []) as Array<Record<string, unknown>>,
    }
  }

  return NextResponse.json({
    provider: status.label,
    providerId: status.provider,
    configured: status.configured,
    sandboxReady: status.sandboxReady,
    missing: status.missing,
    queue,
  })
}
