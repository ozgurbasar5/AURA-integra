'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Search, Loader2, Inbox, AlertCircle, Clock, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageShell, PageHeader, PageCard, LoadingCenter } from '@/components/ui/PageShell'
import type { SupportTicket } from '@/lib/store'

const STATUS_INFO: Record<string, { label: string; bg: string; text: string }> = {
  open: { label: 'Açık', bg: 'bg-amber-100', text: 'text-amber-700' },
  in_progress: { label: 'İşlemde', bg: 'bg-blue-100', text: 'text-blue-700' },
  waiting_customer: { label: 'Müşteri Yanıtı', bg: 'bg-purple-100', text: 'text-purple-700' },
  resolved: { label: 'Çözüldü', bg: 'bg-emerald-100', text: 'text-emerald-700' },
  closed: { label: 'Kapatıldı', bg: 'bg-slate-100', text: 'text-slate-500' },
}

const PRIORITY_INFO: Record<string, string> = {
  Düşük: 'bg-slate-100 text-slate-600',
  Normal: 'bg-sky-100 text-sky-700',
  Yüksek: 'bg-orange-100 text-orange-700',
  Acil: 'bg-red-100 text-red-700',
}

export default function DestekPage() {
  const router = useRouter()
  const [tickets, setTickets] = useState<SupportTicket[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('')
  
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ subject: '', priority: 'Normal', description: '', category: 'Genel' })

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    try {
      const url = new URL('/api/tenant/support', window.location.origin)
      if (filterStatus) url.searchParams.set('status', filterStatus)

      const res = await fetch(url.toString())
      const json = await res.json()
      if (json.ok) {
        setTickets(json.items || [])
      }
    } catch {
      toast.error('Biletler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.subject || !form.description) return

    setSaving(true)
    try {
      const res = await fetch('/api/tenant/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const json = await res.json()
      if (json.ok) {
        toast.success('Bilet oluşturuldu')
        setShowModal(false)
        setForm({ subject: '', priority: 'Normal', description: '', category: 'Genel' })
        fetchTickets()
      } else {
        toast.error(json.error || 'Oluşturulamadı')
      }
    } catch {
      toast.error('Bağlantı hatası')
    } finally {
      setSaving(false)
    }
  }

  const filtered = tickets.filter(t => 
    t.subject.toLowerCase().includes(search.toLowerCase()) || 
    t.ticket_no.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <PageShell className="max-w-6xl mx-auto">
      <PageHeader
        title="Destek Talepleri"
        description="Müşteri destek, SLA takibi ve bilet yönetimi (CRM)"
        icon={Inbox}
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Yeni Bilet
          </button>
        }
      />

      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            className="input pl-10"
            placeholder="Bilet No veya Konu ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 sm:pb-0">
          <button 
            onClick={() => setFilterStatus('')}
            className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${!filterStatus ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
          >
            Tümü
          </button>
          {Object.entries(STATUS_INFO).map(([key, info]) => (
            <button
              key={key}
              onClick={() => setFilterStatus(key)}
              className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${filterStatus === key ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}
            >
              {info.label}
            </button>
          ))}
        </div>
      </div>

      <PageCard>
        {loading ? (
          <LoadingCenter />
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <Inbox size={48} className="mx-auto mb-4 opacity-20" />
            <p>Bilet bulunamadı.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[10px] font-bold">
                <tr>
                  <th className="px-4 py-3">Bilet No</th>
                  <th className="px-4 py-3">Konu</th>
                  <th className="px-4 py-3">Öncelik</th>
                  <th className="px-4 py-3">Durum</th>
                  <th className="px-4 py-3">SLA Bitiş</th>
                  <th className="px-4 py-3 text-right">Tarih</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(t => {
                  const status = STATUS_INFO[t.status] || STATUS_INFO.open
                  const priorityClass = PRIORITY_INFO[t.priority] || PRIORITY_INFO.Normal
                  const isSlaBreached = t.sla_deadline && new Date() > new Date(t.sla_deadline) && t.status !== 'resolved' && t.status !== 'closed'

                  return (
                    <tr 
                      key={t.id} 
                      onClick={() => router.push(`/dashboard/destek/${t.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                    >
                      <td className="px-4 py-4 font-mono font-bold text-slate-700">{t.ticket_no}</td>
                      <td className="px-4 py-4">
                        <div className="font-semibold text-slate-900 line-clamp-1">{t.subject}</div>
                        <div className="text-xs text-slate-500">{t.category}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${priorityClass}`}>
                          {t.priority}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${status.bg} ${status.text}`}>
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        {t.sla_deadline ? (
                          <div className={`flex items-center gap-1.5 text-xs font-medium ${isSlaBreached ? 'text-red-600' : 'text-slate-600'}`}>
                            {isSlaBreached ? <AlertCircle size={14} /> : <Clock size={14} />}
                            {new Date(t.sla_deadline).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right text-xs text-slate-500 whitespace-nowrap">
                        {new Date(t.created_at).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>

      {/* YENİ BİLET MODALI */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="font-bold text-lg">Yeni Bilet Oluştur</h3>
            </div>
            <form onSubmit={handleCreate} className="modal-body space-y-4">
              <div>
                <label className="label">Konu *</label>
                <input required className="input" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Kategori</label>
                  <select className="input" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option>Genel</option>
                    <option>Teknik</option>
                    <option>Fatura / Muhasebe</option>
                    <option>Şikayet</option>
                  </select>
                </div>
                <div>
                  <label className="label">Öncelik</label>
                  <select className="input" value={form.priority} onChange={e => setForm({...form, priority: e.target.value})}>
                    <option>Düşük</option>
                    <option>Normal</option>
                    <option>Yüksek</option>
                    <option>Acil</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label">Açıklama *</label>
                <textarea required rows={4} className="input resize-none" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">İptal</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  )
}
