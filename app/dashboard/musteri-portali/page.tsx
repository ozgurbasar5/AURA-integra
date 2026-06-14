'use client'

import { useState, useEffect } from 'react'
import { Users, MessageSquare, Shield, Copy, ExternalLink, Search, Plus, Send, X, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { getStore, getCustomers, onStoreChange, type StoreCustomer, type NotificationLog } from '@/lib/store'
import { getBusinessBranding } from '@/lib/business-branding'

const SMS_TEMPLATES = [
  { id:'1', name:'Cihaz Teslim Alındı',      text:'Cihazınız teslim alındı. Takip kodu: {job_no}. Servis takip portali: {portal_link}' },
  { id:'2', name:'Tamir Tamamlandı',         text:'Cihazınız tamiri tamamlandı. Teslim almak için servisimizi arayabilirsiniz.' },
  { id:'3', name:'Cihaz Teslime Hazır',      text:'Cihazınız teslime hazır. Çalışma saatlerimiz: Hafta içi 09:00-18:00' },
  { id:'4', name:'Parça Bekleniyor',         text:'Cihazınızda kullanılacak parça temin edilmektedir. Süre: yaklaşık 3-5 iş günü.' },
  { id:'5', name:'Fiyat Onayı Gerekli',      text:'Arıza tespiti yapıldı. Tamir ücreti: ₺{price}. Onay için lütfen arayın.' },
  { id:'6', name:'Garanti Hatırlatma',       text:'Cihazınızın garantisi {date} tarihinde sona ermektedir. Garanti servis için arayın.' },
]

type Tab = 'customers' | 'sms' | 'kvkk'

export default function MusteriPortaliPage() {
  const [tab, setTab] = useState<Tab>('customers')
  const [search, setSearch] = useState('')
  const [showSMSModal, setShowSMSModal] = useState(false)
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState(SMS_TEMPLATES[0])
  const [customMsg, setCustomMsg] = useState('')
  const [smsSearch, setSmsSearch] = useState('')
  const [customers, setCustomers] = useState<StoreCustomer[]>([])
  const [smsLogs, setSmsLogs] = useState<NotificationLog[]>([])
  const [portalLink, setPortalLink] = useState('')

  useEffect(() => {
    const refresh = () => {
      setCustomers(getCustomers())
      setSmsLogs(getStore().notificationLogs.filter(l => l.channel === 'sms'))
      const brand = getBusinessBranding()
      const slug = getStore().notificationSettings.portal_slug
      setPortalLink(slug ? `${window.location.origin}/takip?slug=${slug}` : `${window.location.origin}/takip`)
    }
    refresh()
    return onStoreChange(refresh)
  }, [])

  const filteredCustomers = customers.filter(c =>
    !search || c.full_name.toLowerCase().includes(search.toLowerCase()) || c.phone.includes(search)
  )

  const kvkkCustomers = customers.filter(c => c.kvkk_consent_date)

  function toggleCustomer(id: string) {
    setSelectedCustomers(s => s.includes(id) ? s.filter(i => i !== id) : [...s, id])
  }

  async function sendSMS() {
    if (selectedCustomers.length === 0) { toast.error('Müşteri seçin'); return }
    const msg = customMsg || selectedTemplate.text.replace('{portal_link}', portalLink)
    for (const id of selectedCustomers) {
      const c = customers.find(x => x.id === id)
      if (c?.phone) await fetch('/api/notify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: c.phone, message: msg }) })
    }
    toast.success(`${selectedCustomers.length} müşteriye SMS gönderildi`)
    setShowSMSModal(false)
    setSelectedCustomers([])
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Müşteri Portali Yönetimi</h1>
          <p className="text-slate-500 text-sm mt-0.5">Müşteri self-servis takip, SMS bildirimi ve KVKK</p>
        </div>
      </div>

      {/* Portal Link Card */}
      <div className="card p-4 mb-5 border-sky-200 bg-sky-50/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-sky-100 rounded-xl flex items-center justify-center">
              <ExternalLink size={18} className="text-sky-600"/>
            </div>
            <div>
              <p className="text-xs font-semibold text-sky-600 uppercase tracking-wide mb-0.5">Müşteri Takip Portali</p>
              <p className="text-sm font-mono font-bold text-slate-900">{portalLink}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { navigator.clipboard?.writeText(portalLink); toast.success('Kopyalandı') }}
              className="btn-secondary text-sm flex items-center gap-1.5"><Copy size={14}/> Kopyala</button>
            <a href={portalLink} target="_blank" rel="noreferrer" className="btn-primary text-sm flex items-center gap-1.5">
              <ExternalLink size={14}/> Önizle
            </a>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4 mt-4 pt-4 border-t border-sky-200">
          {[
            { label:'Kayıtlı Müşteri', value: customers.length },
            { label:'SMS Log', value: smsLogs.length },
            { label:'KVKK Onaylı', value: kvkkCustomers.length },
            { label:'Aktif Servis', value: getStore().serviceOrders.filter(o => !['delivered','cancelled'].includes(o.status)).length },
          ].map(s => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-black text-sky-700">{s.value}</p>
              <p className="text-xs text-sky-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200 mb-5">
        {[['customers','👥 Müşteriler'],['sms','💬 SMS Bildirimleri'],['kvkk','🔒 KVKK Talepleri']].map(([id,label]) => (
          <button key={id} onClick={() => setTab(id as Tab)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${tab===id?'border-sky-600 text-sky-700':'border-transparent text-slate-500 hover:text-slate-700'}`}>
            {label}
          </button>
        ))}
      </div>

      {/* ── TAB 1: Müşteriler ──────────────────────────────────────────────────── */}
      {tab === 'customers' && (
        <div className="card overflow-hidden">
          <div className="flex items-center gap-3 p-4 border-b border-slate-100">
            <div className="flex-1 flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <Search size={13} className="text-slate-400"/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Ad, telefon ara..." className="bg-transparent text-sm outline-none flex-1"/>
            </div>
            <button onClick={() => setShowSMSModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
              <Send size={14}/> Toplu SMS
            </button>
          </div>
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {['','Müşteri','Telefon','E-posta','Servis Sayısı','Son Servis','Portal Girişi','İşlem'].map(h => (
                  <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredCustomers.map((c, i) => (
                <tr key={c.id} className={`hover:bg-blue-50 transition-colors ${i%2===0?'bg-white':'bg-slate-50/30'}`}>
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedCustomers.includes(c.id)} onChange={() => toggleCustomer(c.id)} className="rounded"/>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-xs font-bold text-sky-700 flex-shrink-0">
                        {c.full_name.split(' ').map(n=>n[0]).join('')}
                      </div>
                      <span className="text-sm font-medium text-slate-900">{c.full_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm font-mono text-slate-600">{c.phone}</td>
                  <td className="px-4 py-3 text-sm text-slate-500">{c.email ?? '—'}</td>
                  <td className="px-4 py-3"><span className="badge bg-sky-50 text-sky-700">{Math.round(c.total_spent / 100) || 0} servis</span></td>
                  <td className="px-4 py-3 text-sm text-slate-500">{c.updated_at?.slice(0, 10) ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`badge ${c.kvkk_consent_date ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
                      {c.kvkk_consent_date ? 'Onaylı' : 'Onaysız'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => { setSelectedCustomers([c.id]); setShowSMSModal(true) }}
                      className="text-xs text-sky-600 hover:underline flex items-center gap-1">
                      <Send size={11}/> SMS
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {selectedCustomers.length > 0 && (
            <div className="p-3 border-t border-slate-100 bg-sky-50 flex items-center justify-between">
              <span className="text-sm text-sky-700">{selectedCustomers.length} müşteri seçildi</span>
              <button onClick={() => setShowSMSModal(true)} className="btn-primary text-sm">SMS Gönder</button>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 2: SMS Bildirimleri ────────────────────────────────────────────── */}
      {tab === 'sms' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 flex-1 max-w-sm">
              <Search size={13} className="text-slate-400"/>
              <input value={smsSearch} onChange={e=>setSmsSearch(e.target.value)} placeholder="Müşteri veya mesaj ara..." className="bg-transparent text-sm outline-none flex-1"/>
            </div>
            <button onClick={() => setShowSMSModal(true)} className="btn-primary text-sm flex items-center gap-1.5">
              <Plus size={14}/> Yeni SMS
            </button>
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Tarih','Müşteri','Telefon','Mesaj','Durum'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {smsLogs.filter(s => !smsSearch || (s.customer_name ?? '').toLowerCase().includes(smsSearch.toLowerCase()) || s.content.toLowerCase().includes(smsSearch.toLowerCase())).map(s => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs text-slate-400 whitespace-nowrap">{s.created_at.slice(0, 16).replace('T', ' ')}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{s.customer_name ?? '—'}</td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">{s.recipient}</td>
                    <td className="px-4 py-3 text-sm text-slate-600 max-w-xs truncate">{s.content}</td>
                    <td className="px-4 py-3">
                      {['sent', 'delivered', 'mock_sent'].includes(s.status)
                        ? <span className="badge bg-green-50 text-green-700 flex items-center gap-1 w-fit"><CheckCircle size={11}/>Gönderildi</span>
                        : <span className="badge bg-red-50 text-red-700 flex items-center gap-1 w-fit"><AlertTriangle size={11}/>Hata</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 3: KVKK Talepleri ──────────────────────────────────────────────── */}
      {tab === 'kvkk' && (
        <div className="space-y-4">
          <div className="card p-4 bg-amber-50 border-amber-200">
            <div className="flex items-start gap-3">
              <Shield size={18} className="text-amber-600 flex-shrink-0 mt-0.5"/>
              <div>
                <p className="text-sm font-semibold text-amber-800">KVKK Uyumu</p>
                <p className="text-xs text-amber-600 mt-0.5">Müşterilerden gelen kişisel veri dışa aktarma ve silme talepleri 30 gün içinde yanıtlanmalıdır.</p>
              </div>
            </div>
          </div>

          <div className="card overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">KVKK Talepleri</h3>
              <span className="badge bg-orange-50 text-orange-700">
                <Clock size={11} className="inline mr-1"/>
                {kvkkCustomers.length} onaylı müşteri
              </span>
            </div>
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Tarih','Müşteri','Telefon','Durum'].map(h => (
                    <th key={h} className="text-left text-xs font-semibold text-slate-500 uppercase px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {kvkkCustomers.map(k => (
                  <tr key={k.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-sm text-slate-500">{k.kvkk_consent_date}</td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{k.full_name}</td>
                    <td className="px-4 py-3 text-sm font-mono text-slate-500">{k.phone}</td>
                    <td className="px-4 py-3">
                      <span className="badge bg-green-50 text-green-700"><CheckCircle size={11} className="inline mr-1"/>Onaylı</span>
                    </td>
                  </tr>
                ))}
                {kvkkCustomers.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">KVKK onaylı müşteri yok</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SMS Modal */}
      {showSMSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="font-bold text-slate-900">SMS Gönder</h3>
              <button onClick={() => setShowSMSModal(false)}><X size={18} className="text-slate-400"/></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="label">Şablon Seç</label>
                <select className="select" onChange={e => {
                  const t = SMS_TEMPLATES.find(t => t.id === e.target.value)
                  if (t) { setSelectedTemplate(t); setCustomMsg(t.text) }
                }}>
                  {SMS_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Mesaj ({customMsg.length}/160)</label>
                <textarea className="input min-h-[100px] resize-none"
                  value={customMsg || selectedTemplate.text}
                  onChange={e => setCustomMsg(e.target.value)}/>
              </div>
              <div>
                <label className="label">Alıcılar ({selectedCustomers.length} seçili)</label>
                <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-50">
                  {customers.map(c => (
                    <label key={c.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-slate-50">
                      <input type="checkbox" checked={selectedCustomers.includes(c.id)} onChange={() => toggleCustomer(c.id)} className="rounded"/>
                      <span className="text-sm">{c.full_name}</span>
                      <span className="text-xs text-slate-400 ml-auto">{c.phone}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 p-5 border-t border-slate-100">
              <button onClick={() => setShowSMSModal(false)} className="btn-secondary flex-1">İptal</button>
              <button onClick={sendSMS} disabled={selectedCustomers.length===0} className="btn-primary flex-1 disabled:opacity-50">
                <Send size={14} className="inline mr-1.5"/>
                {selectedCustomers.length > 0 ? `${selectedCustomers.length} Kişiye Gönder` : 'Müşteri Seç'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
