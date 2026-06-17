export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase/service'

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  const { data, error } = await admin
    .from('webhook_failures')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, items: data ?? [] })
}

export async function DELETE(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  const id = request.nextUrl.searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id gerekli' }, { status: 400 })

  const { error } = await admin.from('webhook_failures').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { writeAuditLog } = await import('@/lib/audit-log')
  await writeAuditLog({
    actorId: auth.userId,
    action: 'webhook_failure_resolved',
    targetType: 'webhook_failure',
    targetId: id,
  })

  return NextResponse.json({ ok: true })
}
