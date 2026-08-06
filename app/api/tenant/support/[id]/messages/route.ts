export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { ticketMessageToStore, ticketMessageToDb } from '@/lib/db-mappers'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { data, error } = await auth.supabase
    .from('ticket_messages')
    .select('*')
    .eq('ticket_id', params.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, items: (data ?? []).map(ticketMessageToStore) })
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  if (!body.content?.trim()) {
    return NextResponse.json({ error: 'Mesaj içeriği boş olamaz' }, { status: 400 })
  }

  const newMessage = {
    id: crypto.randomUUID(),
    ticket_id: params.id,
    sender_type: body.sender_type || 'agent',
    sender_id: body.sender_id || null, // normalde auth.user.id
    content: body.content.trim(),
    attachments: body.attachments || null,
    is_internal: body.is_internal ?? false,
    created_at: new Date().toISOString()
  }

  const { data, error } = await auth.supabase
    .from('ticket_messages')
    .insert(ticketMessageToDb(newMessage as any))
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Eğer ilk yanıt ise ticket'ı güncelle
  if (newMessage.sender_type === 'agent' && !newMessage.is_internal) {
    const { data: ticket } = await auth.supabase
      .from('support_tickets')
      .select('first_response_at')
      .eq('id', params.id)
      .single()
      
    if (ticket && !ticket.first_response_at) {
      await auth.supabase
        .from('support_tickets')
        .update({ first_response_at: new Date().toISOString() })
        .eq('id', params.id)
    }
  }

  return NextResponse.json({ ok: true, item: ticketMessageToStore(data) }, { status: 201 })
}
