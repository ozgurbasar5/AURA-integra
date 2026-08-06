export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  // Bileti 'resolved' yap ve resolved_at tarihini ayarla
  const { data, error } = await auth.supabase
    .from('support_tickets')
    .update({ 
      status: 'resolved',
      resolved_at: new Date().toISOString()
    })
    .eq('id', params.id)
    .eq('tenant_id', auth.tenantId)
    .select('id, ticket_no, customer_id')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // (Opsiyonel) Burada müşteriye NPS (Net Promoter Score) anketi veya çözüm e-postası gönderilebilir
  
  return NextResponse.json({ ok: true, message: 'Bilet çözüldü olarak işaretlendi.' })
}
