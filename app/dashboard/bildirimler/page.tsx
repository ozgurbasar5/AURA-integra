'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  Bell, Search, CheckCheck, Trash2, Filter,
  MessageCircle, Mail, Smartphone, Send,
  AlertTriangle, CheckCircle, Info, XCircle, Clock,
  Settings, Plus, X
} from 'lucide-react'
import PageHeader from '@/components/dashboard/PageHeader'
import { useStoreSlice } from '@/hooks/useStoreSlice'
import { getNotificationLogs, setNotificationLogs, addNotificationLog, type NotificationLog } from '@/lib/store'
import { formatRelativeTime } from '@/lib/validators'
import { SMS_TEMPLATES } from '@/lib/constants'

const CHANNEL_CONFIG: Record<string, { label: string; icon: typeof Mail; color: string; bg: string }> = {
  sms:      { label: 'SMS',      icon: Smartphone,     color: 'text-blue-600',    bg: 'bg-blue-50' },
  email:    { label: 'E-posta',  icon: Mail,           color: 'text-purple-600',  bg: 'bg-purple-50' },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle,  color: 'text-green-600',   bg: 'bg-green-50' },
  push:     { label: 'Push',     icon: Bell,           color: 'text-sky-600',  bg: 'bg-sky-50' },
}

const STATUS_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  pending:   { label: 'Bekliyor',    icon: Clock,        color: 'text-amber-500' },
  sent:      { label: 'Gönderildi',  icon: Send,         color: 'text-blue-500' },
  delivered: { label: 'İletildi',    icon: CheckCircle,  color: 'text-emerald-500' },
  failed:    { label: 'Başarısız',   icon: XCircle,      color: 'text-red-500' },
}

const TRIGGER_LABELS: Record<string, string> = {
  order_created: 'İş Emri Açıldığında',
  diagnosis_done: 'Teşhis Tamamlandığında',
  approval_request: 'Onay Talep Edildiğinde',
  repair_done: 'Onarım Tamamlandığında',
  ready_pickup: 'Teslime Hazır Olduğunda',
  delivered: 'Teslim Edildiğinde',
}

export default function BildirimlerPage() {
  const { items: logs, saveAll, mounted } = useStoreSlice(getNotificationLogs, setNotificationLogs, 'notifications')
  const [channelFilter, setChannelFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [tab, setTab] = useState<'logs' | 'templates' | 'settings'>('logs')
  const [showSendModal, setShowSendModal] = useState(false)
  const [sendForm, setSendForm] = useState<{ channel: NotificationLog['channel']; recipient: string; content: string; customer_name: string }>({ channel: 'sms', recipient: '', content: '', customer_name: '' })
  const [triggers, setTriggers] = useState<Record<string, boolean>>({})

  useEffect(() => {
    fetch('/api/tenant/notification-config', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(json => {
        if (json.triggers) setTriggers(json.triggers)
        else {
          const defaults: Record<string, boolean> = {}
          Object.keys(TRIGGER_LABELS).forEach(k => { defaults[k] = true })
          setTriggers(defaults)
        }
      })
      .catch(() => {})
  }, [])

  async function toggleTrigger(key: string) {
    const next = { ...triggers, [key]: !triggers[key] }
    setTriggers(next)
    await fetch('/api/tenant/notification-config', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ triggers: next }),
    })
  }

  if (!mounted) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full" /></div>

  const filtered = logs.filter(l => {
    if (channelFilter && l.channel !== channelFilter) return false
    if (statusFilter && l.status !== statusFilter) return false
    return true
  })

  const stats = {
    total: logs.length,
    delivered: logs.filter(l => l.status === 'delivered').length,
    failed: logs.filter(l => l.status === 'failed').length,
    deliveryRate: logs.length > 0 ? Math.round(logs.filter(l => l.status === 'delivered').length / logs.length * 100) : 0,
  }

  function handleSend() {
    if (!sendForm.recipient || !sendForm.content) { toast.error('Alıcı ve mesaj zorunlu'); return }
    void (async () => {
      try {
        const payload =
          sendForm.channel === 'email'
            ? { to: sendForm.recipient, subject: 'AURA İntegra Bildirimi', type: 'hazir', data: { customerName: sendForm.customer_name || 'Müşteri', device: '-', price: '0', islem: sendForm.content } }
            : { to: sendForm.recipient, message: sendForm.content }

        const res = await fetch('/api/notify', {
          method: 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        const json = await res.json()
        const ok = json.success !== false && res.ok

        addNotificationLog({
          ...sendForm,
          status: ok ? 'delivered' : 'failed',
        })

        if (ok) {
          toast.success('Bildirim gönderildi')
          setSendForm({ channel: 'sms', recipient: '', content: '', customer_name: '' })
          setShowSendModal(false)
        } else {
          toast.error(json.error || 'Gönderilemedi')
        }
      } catch {
        addNotificationLog({ ...sendForm, status: 'failed' })
        toast.error('Bağlantı hatası')
      }
    })()
  }

  return (
    <div className="space-y-6 pb-8">
      <PageHeader
        data-tour="bildirim-baslik"
        icon={Bell}
        title="Bildirim Merkezi"
        description="SMS, e-posta, WhatsApp ve push bildirim yönetimi"
        actions={<button data-tour="bildirim-gonder-btn" onClick={() => setShowSendModal(true)} className="btn-primary text-sm flex items-center gap-1.5"><Plus size={14} /> Bildirim Gönder</button>}
      />

      {/* Metrikler */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Toplam Gönderim', val: stats.total, bg: 'bg-sky-50', color: 'text-sky-600', icon: Send },
          { label: 'İletilen', val: stats.delivered, bg: 'bg-emerald-50', color: 'text-emerald-600', icon: CheckCircle },
          { label: 'Başarısız', val: stats.failed, bg: 'bg-red-50', color: 'text-red-500', icon: XCircle },
          { label: 'İletim Oranı', val: `%${stats.deliveryRate}`, bg: 'bg-blue-50', color: 'text-blue-600', icon: CheckCheck },
        ].map(m => (
          <div key={m.label} className="card p-4 hover:shadow-md transition-all">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.bg} mb-2`}>
              <m.icon size={14} className={m.color} />
            </div>
            <p className="text-xl font-black text-slate-900">{m.val}</p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Sekmeler */}
      <div data-tour="bildirim-sekmeler" className="flex gap-1 bg-slate-100 rounded-xl p-1">
        {([
          { key: 'logs' as const, label: 'Gönderim Geçmişi', icon: Send },
          { key: 'templates' as const, label: 'SMS Şablonları', icon: MessageCircle },
          { key: 'settings' as const, label: 'Tetikleyiciler', icon: Settings },
        ]).map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all
              ${tab === t.key ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}>
            <t.icon size={13} /> {t.label}
          </button>
        ))}
      </div>

      {/* TAB: Gönderim Geçmişi */}
      {tab === 'logs' && (
        <>
          <div className="card p-3 flex flex-wrap items-center gap-3">
            <select value={channelFilter} onChange={e => setChannelFilter(e.target.value)} className="select text-xs py-2">
              <option value="">Tüm Kanallar</option>
              {Object.entries(CHANNEL_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select text-xs py-2">
              <option value="">Tüm Durumlar</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <span className="text-xs text-slate-400 ml-auto">{filtered.length} kayıt</span>
          </div>

          <div data-tour="bildirim-log-listesi" className="card overflow-hidden">
            <div className="divide-y divide-slate-50">
              {filtered.map(l => {
                const ch = CHANNEL_CONFIG[l.channel]
                const st = STATUS_CONFIG[l.status]
                return (
                  <div key={l.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50/80 transition-colors">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${ch.bg}`}>
                      <ch.icon size={16} className={ch.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-slate-900">{l.customer_name || l.recipient}</span>
                        {l.order_no && <span className="text-[10px] text-sky-500 font-mono">{l.order_no}</span>}
                      </div>
                      <p className="text-xs text-slate-500 truncate">{l.content}</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">{l.recipient} · {formatRelativeTime(l.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <st.icon size={12} className={st.color} />
                      <span className={`text-[10px] font-bold ${st.color}`}>{st.label}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* TAB: SMS Şablonları */}
      {tab === 'templates' && (
        <div className="grid md:grid-cols-2 gap-4">
          {Object.entries(SMS_TEMPLATES).map(([key, tpl]) => (
            <div key={key} className="card p-4 hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-bold text-slate-900">{tpl.name}</h4>
                <span className="text-[10px] font-mono text-sky-500 bg-sky-50 px-1.5 py-0.5 rounded">{key}</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3 font-mono">{tpl.text}</p>
              <p className="text-[10px] text-slate-400 mt-2">{tpl.text.length}/160 karakter</p>
            </div>
          ))}
        </div>
      )}

      {/* TAB: Tetikleyiciler */}
      {tab === 'settings' && (
        <div className="card overflow-hidden">
          <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
            <p className="text-xs font-bold text-slate-700">Otomatik Tetikleyiciler</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Duruma göre otomatik SMS/bildirim gönderim ayarları</p>
          </div>
          <div className="divide-y divide-slate-50">
            {Object.entries(TRIGGER_LABELS).map(([key, label]) => {
              const tpl = SMS_TEMPLATES[key]
              return (
                <div key={key} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50/80 transition-colors">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">{label}</p>
                    {tpl && <p className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[400px]">{tpl.text}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="w-5 h-5 rounded bg-blue-50 flex items-center justify-center"><Smartphone size={10} className="text-blue-600" /></span>
                      <span className="w-5 h-5 rounded bg-green-50 flex items-center justify-center"><MessageCircle size={10} className="text-green-600" /></span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={triggers[key] !== false}
                        onChange={() => void toggleTrigger(key)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:bg-sky-600 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:after:translate-x-4"></div>
                    </label>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {showSendModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">Bildirim Gönder</h3>
              <button onClick={() => setShowSendModal(false)}><X size={18} className="text-slate-400" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="label">Kanal</label>
                <select className="select" value={sendForm.channel} onChange={e => setSendForm(f => ({ ...f, channel: e.target.value as NotificationLog['channel'] }))}>
                  {Object.entries(CHANNEL_CONFIG).filter(([k]) => k === 'sms' || k === 'email').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div><label className="label">Alıcı *</label><input className="input" value={sendForm.recipient} onChange={e => setSendForm(f => ({ ...f, recipient: e.target.value }))} /></div>
              <div><label className="label">Müşteri Adı</label><input className="input" value={sendForm.customer_name} onChange={e => setSendForm(f => ({ ...f, customer_name: e.target.value }))} /></div>
              <div><label className="label">Mesaj *</label><textarea className="input min-h-[80px] resize-none" value={sendForm.content} onChange={e => setSendForm(f => ({ ...f, content: e.target.value }))} /></div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowSendModal(false)} className="btn-secondary flex-1">İptal</button>
              <button onClick={handleSend} className="btn-primary flex-1">Gönder</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
