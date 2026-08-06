import { NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { shouldEscalate } from '@/lib/ticket-engine'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  // Cron doğrulaması (örneğin Vercel Cron Secret vb.) güvenlik amacıyla eklenebilir
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = getServiceClient()
  if (!supabase) {
    return NextResponse.json({ error: 'DB Client hatası' }, { status: 500 })
  }

  try {
    // Açık ve SLA'i geçmiş biletleri bul
    const { data: tickets, error } = await supabase
      .from('support_tickets')
      .select('*')
      .in('status', ['open', 'in_progress'])
      .not('sla_deadline', 'is', null)

    if (error) throw error

    let escalatedCount = 0

    for (const ticket of tickets) {
      if (shouldEscalate(ticket as any)) {
        // Zaten escalate edilmiş mi kontrol et
        const { data: existingEscalation } = await supabase
          .from('ticket_escalations')
          .select('id')
          .eq('ticket_id', ticket.id)
          .single()

        if (!existingEscalation) {
          // Escalate et
          await supabase.from('ticket_escalations').insert({
            ticket_id: ticket.id,
            reason: 'SLA Süresi Aşıldı',
          })

          // İç not ekle
          await supabase.from('ticket_messages').insert({
            ticket_id: ticket.id,
            sender_type: 'system',
            content: '⚠️ SLA süresi aşıldığı için bilet üst birime sevk edildi.',
            is_internal: true
          })

          escalatedCount++
        }
      }
    }

    return NextResponse.json({ ok: true, escalated: escalatedCount })
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }
}
