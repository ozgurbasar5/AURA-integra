export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { supportTicketToStore } from '@/lib/db-mappers'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { data, error } = await auth.supabase
    .from('support_tickets')
    .select('*')
    .eq('id', params.id)
    .eq('tenant_id', auth.tenantId)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Bilet bulunamadı' }, { status: 404 })

  return NextResponse.json({ ok: true, item: supportTicketToStore(data) })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const updates: any = {}
  if (body.status) updates.status = body.status
  if (body.priority) {
    const p = body.priority
    updates.priority = p === 'Düşük' ? 'dusuk' : p === 'Normal' ? 'normal' : p === 'Yüksek' ? 'yuksek' : 'acil'
  }
  if (body.assigned_to !== undefined) updates.assigned_to = body.assigned_to
  if (body.internal_notes !== undefined) updates.internal_notes = body.internal_notes
  if (body.tags !== undefined) updates.tags = body.tags

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Güncellenecek alan yok' }, { status: 400 })
  }

  // resolved_at
  if (updates.status === 'resolved' || updates.status === 'closed') {
    updates.resolved_at = new Date().toISOString()
  }

  const { data, error } = await auth.supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', params.id)
    .eq('tenant_id', auth.tenantId)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  
  return NextResponse.json({ ok: true, item: supportTicketToStore(data) })
}
