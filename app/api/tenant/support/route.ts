export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { generateTicketNo, calculateTicketSla } from '@/lib/ticket-engine'
import { supportTicketToStore } from '@/lib/db-mappers'

/** Destek talebi oluştur — Supabase support_tickets */
export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.subject?.trim() || !body.description?.trim()) {
    return NextResponse.json({ error: 'Konu ve açıklama zorunlu' }, { status: 400 })
  }

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service unavailable' }, { status: 503 })

  // Basit sequence generator (gerçekte ayrı bir tabloda tutulmalıdır, bu MVP için)
  const countRes = await admin.from('support_tickets').select('id', { count: 'exact', head: true }).eq('tenant_id', auth.tenantId)
  const ticketNo = generateTicketNo((countRes.count || 0) + 1)
  
  const priority = body.priority || 'Normal'
  const channel = body.channel || 'portal'
  const slaDeadline = calculateTicketSla(priority, channel).toISOString()

  const { data, error } = await admin.from('support_tickets').insert({
    tenant_id: auth.tenantId,
    ticket_no: ticketNo,
    subject: body.subject.trim(),
    description: body.description.trim(),
    priority: priority,
    status: 'open',
    channel: channel,
    category: body.category || 'Genel',
    customer_id: body.customer_id || null,
    order_id: body.order_id || null,
    sla_deadline: slaDeadline,
    tags: body.tags || []
  }).select('*').single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, id: data.id, item: supportTicketToStore(data) }, { status: 201 })
}

export async function GET(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const url = new URL(req.url)
  const status = url.searchParams.get('status')
  const assigned_to = url.searchParams.get('assigned_to')

  let query = auth.supabase
    .from('support_tickets')
    .select('*')
    .eq('tenant_id', auth.tenantId)
    .order('created_at', { ascending: false })

  if (status) query = query.eq('status', status)
  if (assigned_to) query = query.eq('assigned_to', assigned_to)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, items: (data ?? []).map(supportTicketToStore) })
}
