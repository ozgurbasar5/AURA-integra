'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, CheckCircle2, AlertCircle, Clock, Paperclip, User, Lock, MoreVertical } from 'lucide-react'
import { toast } from 'sonner'
import { PageShell, PageHeader, PageCard, LoadingCenter } from '@/components/ui/PageShell'
import type { SupportTicket, TicketMessage } from '@/lib/store'

const STATUS_INFO: Record<string, { label: string; bg: string; text: string }> = {
  open: { label: 'Açık', bg: 'bg-amber-100', text: 'text-amber-700' },
  in_progress: { label: 'İşlemde', bg: 'bg-blue-100', text: 'text-blue-700' },
  waiting_customer: { label: 'Müşteri Yanıtı', bg: 'bg-purple-100', text: 'text-purple-700' },
  resolved: { label: 'Çözüldü', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  closed: { label: 'Kapatıldı', bg: 'bg-slate-100', text: 'text-slate-500' },
}

export default function TicketDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter()
  const [ticket, setTicket] = useState<SupportTicket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [msgText, setMsgText] = useState('')
  const [isInternal, setIsInternal] = useState(false)
  const [sending, setSending] = useState(false)
  
  const bottomRef = useRef<HTMLDivElement>(null)

  const fetchTicketAndMessages = useCallback(async () => {
    try {
      const [tRes, mRes] = await Promise.all([
        fetch(`/api/tenant/support/${params.id}`),
        fetch(`/api/tenant/support/${params.id}/messages`)
      ])
      
      const tJson = await tRes.json()
      const mJson = await mRes.json()

      if (tJson.ok) setTicket(tJson.item)
      if (mJson.ok) setMessages(mJson.items || [])
    } catch {
      toast.error('Veriler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => {
    fetchTicketAndMessages()
  }, [fetchTicketAndMessages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!msgText.trim()) return

    setSending(true)
    try {
      const res = await fetch(`/api/tenant/support/${params.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: msgText,
          is_internal: isInternal,
          sender_type: 'agent'
        })
      })
      const json = await res.json()
      if (json.ok) {
        setMessages(prev => [...prev, json.item])
        setMsgText('')
        
        // Eğer statü 'open' ise 'in_progress' yapalım otomatik (iç not değilse)
        if (!isInternal && ticket?.status === 'open') {
          handleStatusChange('in_progress')
        }
      } else {
        toast.error(json.error)
      }
    } catch {
      toast.error('Gönderilemedi')
    } finally {
      setSending(false)
    }
  }

  async function handleStatusChange(newStatus: string) {
    try {
      const res = await fetch(`/api/tenant/support/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      })
      const json = await res.json()
      if (json.ok) {
        setTicket(json.item)
        toast.success('Durum güncellendi')
      }
    } catch {
      toast.error('Hata oluştu')
    }
  }

  if (loading) return <PageShell><LoadingCenter /></PageShell>
  if (!ticket) return <PageShell>Bilet bulunamadı.</PageShell>

  const isResolved = ticket.status === 'resolved' || ticket.status === 'closed'
  const isSlaBreached = ticket.sla_deadline && new Date() > new Date(ticket.sla_deadline) && !isResolved
  const st = STATUS_INFO[ticket.status] || STATUS_INFO.open

  return (
    <PageShell className="max-w-5xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={() => router.push('/dashboard/destek')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
          <ArrowLeft size={20} className="text-slate-500" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-slate-900">{ticket.subject}</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${st.bg} ${st.text}`}>
              {st.label}
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm text-slate-500 mt-1">
            <span className="font-mono font-semibold">{ticket.ticket_no}</span>
            <span>•</span>
            <span>{ticket.category}</span>
            {ticket.sla_deadline && (
              <>
                <span>•</span>
                <span className={`flex items-center gap-1 ${isSlaBreached ? 'text-red-600 font-bold' : ''}`}>
                  <Clock size={14} /> SLA Bitiş: {new Date(ticket.sla_deadline).toLocaleString('tr-TR')}
                </span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {!isResolved && (
            <>
              <select 
                className="input py-2 text-sm max-w-[150px]"
                value={ticket.status}
                onChange={e => handleStatusChange(e.target.value)}
              >
                <option value="open">Açık</option>
                <option value="in_progress">İşlemde</option>
                <option value="waiting_customer">Müşteri Yanıtı Bekleniyor</option>
              </select>
              <button 
                onClick={() => handleStatusChange('resolved')}
                className="btn-primary py-2 px-4 bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle2 size={16} /> Çözüldü İşaretle
              </button>
            </>
          )}
        </div>
      </div>

      <div className="flex-1 flex gap-6 overflow-hidden">
        {/* Sol: Mesajlaşma */}
        <div className="flex-1 flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-700">İlk Açıklama:</h3>
            <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => {
              const isMine = m.sender_type === 'agent'
              return (
                <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[75%] rounded-2xl p-4 shadow-sm relative ${
                    m.is_internal ? 'bg-amber-50 border border-amber-200 text-amber-900' :
                    isMine ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-800'
                  }`}>
                    {m.is_internal && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 uppercase mb-1">
                        <Lock size={10} /> İç Not
                      </div>
                    )}
                    {!m.is_internal && !isMine && (
                      <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase mb-1">
                        <User size={10} /> Müşteri
                      </div>
                    )}
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{m.content}</p>
                    <time className={`text-[10px] mt-2 block text-right opacity-70`}>
                      {new Date(m.created_at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </time>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </div>

          {/* Mesaj Yazma Alanı */}
          {!isResolved && (
            <div className="p-3 border-t border-slate-200 bg-slate-50">
              <form onSubmit={handleSend} className="relative">
                <textarea 
                  rows={2}
                  className={`w-full rounded-xl border pl-3 pr-24 py-3 text-sm focus:ring-2 focus:outline-none resize-none
                    ${isInternal ? 'bg-amber-50 border-amber-300 focus:ring-amber-500 placeholder-amber-400' : 'bg-white border-slate-300 focus:ring-slate-900 placeholder-slate-400'}
                  `}
                  placeholder={isInternal ? "Müşterinin görmeyeceği iç not yazın..." : "Müşteriye yanıt yazın..."}
                  value={msgText}
                  onChange={e => setMsgText(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSend(e)
                    }
                  }}
                />
                
                <div className="absolute right-2 bottom-2 flex items-center gap-1">
                  <button 
                    type="button"
                    onClick={() => setIsInternal(!isInternal)}
                    className={`p-2 rounded-lg transition-colors ${isInternal ? 'bg-amber-200 text-amber-800' : 'text-slate-400 hover:bg-slate-100'}`}
                    title="İç Not Olarak Kaydet"
                  >
                    <Lock size={16} />
                  </button>
                  <button 
                    type="submit"
                    disabled={sending || !msgText.trim()}
                    className={`p-2 rounded-lg text-white transition-colors disabled:opacity-50
                      ${isInternal ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-900 hover:bg-slate-800'}`}
                  >
                    <Send size={16} className={sending ? 'animate-pulse' : ''} />
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Sağ: Bilgi Paneli */}
        <div className="w-80 flex flex-col gap-4">
          <PageCard title="Bilet Detayları">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Kanal</span>
                <span className="text-sm font-medium capitalize">{ticket.channel}</span>
              </div>
              {ticket.order_id && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">İlişkili Sipariş</span>
                  <button 
                    onClick={() => router.push(`/dashboard/atolye/${ticket.order_id}`)}
                    className="text-sm font-bold text-sky-600 hover:underline"
                  >
                    Servis Kaydına Git
                  </button>
                </div>
              )}
              {ticket.first_response_at && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">İlk Yanıt Zamanı</span>
                  <span className="text-sm font-medium">
                    {new Date(ticket.first_response_at).toLocaleString('tr-TR')}
                  </span>
                </div>
              )}
              {ticket.resolved_at && (
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Çözüm Zamanı</span>
                  <span className="text-sm font-medium text-emerald-600">
                    {new Date(ticket.resolved_at).toLocaleString('tr-TR')}
                  </span>
                </div>
              )}
            </div>
          </PageCard>
        </div>
      </div>
    </PageShell>
  )
}
