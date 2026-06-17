'use client'

import { useState, useEffect, useCallback } from 'react'
import { HelpCircle, MessageCircle, FileText, ExternalLink, ChevronDown, ChevronUp, Send, Activity, Phone, Mail, Clock, CheckCircle, AlertCircle, Book, Video, Code, Tag, Inbox } from 'lucide-react'
import { toast } from 'sonner'
import { getSupportTickets, addSupportTicket, onStoreChange } from '@/lib/store'

const PRIORITY_STYLE: Record<string, string> = {
  'Düşük':  'bg-slate-100 text-slate-600',
  'Normal': 'bg-blue-50 text-blue-700',
  'Yüksek': 'bg-amber-50 text-amber-700',
  'Acil':   'bg-red-50 text-red-700',
}
const STATUS_STYLE: Record<string, { label: string; cls: string }> = {
  open:        { label: 'Açık',        cls: 'bg-amber-50 text-amber-700' },
  in_progress: { label: 'İşlemde',     cls: 'bg-blue-50 text-blue-700' },
  resolved:    { label: 'Çözüldü',     cls: 'bg-emerald-50 text-emerald-700' },
  closed:      { label: 'Kapatıldı',   cls: 'bg-slate-100 text-slate-500' },
}

const FAQS = [
  { q: 'Servis kaydı nasıl oluştururum?', a: 'Atölye menüsüne gidin → "Yeni Servis Kaydı" butonuna tıklayın → Müşteri ve cihaz bilgilerini doldurun → Kaydet.' },
  { q: 'Müşteri portal linkini nasıl paylaşırım?', a: 'Atölye\'de ilgili servise tıklayın → Detay sayfasında "Portal Linki" bölümünden kopyalayın. Müşterileriniz bu link ile servislerini takip edebilir.' },
  { q: 'Stoktan parça nasıl eklerim?', a: 'Servis detay sayfasında "Kullanılan Parçalar" bölümüne gidin → Parça adını arayın → Miktarı belirleyin → Ekle butonuna tıklayın.' },
  { q: 'WhatsApp mesajı otomatik gönderilir mi?', a: 'Evet! Servis durumu değiştiğinde müşteriye otomatik WhatsApp bildirimi gönderilir. Ayarlar → Bildirimler\'den bu özelliği yapılandırabilirsiniz.' },
  { q: 'Fatura/PDF nasıl oluştururum?', a: 'Servis detay sayfasında "PDF Oluştur" butonuna tıklayın. Intake raporu, garanti belgesi ve makbuz formatlarını seçebilirsiniz.' },
  { q: 'Birden fazla şube yönetebilir miyim?', a: 'Kurumsal planda çok şube desteği mevcuttur. Admin panelinden şube ekleyebilir ve şubeler arası stok transferi yapabilirsiniz.' },
  { q: 'Verilerimi dışa aktarabilir miyim?', a: 'Raporlar menüsünden Excel ve PDF formatlarında dışa aktarım yapabilirsiniz. API erişimi için Ayarlar → Entegrasyonlar bölümünü inceleyin.' },
  { q: 'Şifre sıfırlama nasıl yapılır?', a: 'Ayarlar → Güvenlik → Şifre Değiştir bölümünden mevcut şifrenizle yeni şifre belirleyebilirsiniz. Şifrenizi unuttuysanız giriş sayfasındaki "Şifremi Unuttum" linkini kullanın.' },
]

const DOCS = [
  { icon: <Book size={20}/>, title: 'Başlangıç Rehberi', desc: 'İlk servis kaydından raporlamaya kapsamlı başlangıç kılavuzu', color: 'bg-blue-50 text-blue-600' },
  { icon: <Video size={20}/>, title: 'Video Eğitimler', desc: '15+ modül eğitim videosu, adım adım anlatım', color: 'bg-purple-50 text-purple-600' },
  { icon: <Code size={20}/>, title: 'API Dokümantasyon', desc: 'REST API referansı, webhook\'lar ve entegrasyon örnekleri', color: 'bg-slate-50 text-slate-700' },
  { icon: <Tag size={20}/>, title: 'Sürüm Notları', desc: 'En son güncellemeler ve özellik değişiklikleri', color: 'bg-green-50 text-green-700' },
]

export default function DestekPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [form, setForm] = useState({ konu: '', oncelik: 'Normal', aciklama: '' })
  const [submitting, setSubmitting] = useState(false)
  const [tickets, setTickets] = useState<ReturnType<typeof getSupportTickets>>([])

  const refresh = useCallback(() => setTickets(getSupportTickets()), [])
  useEffect(() => { refresh(); return onStoreChange(refresh) }, [refresh])

  async function handleSubmit() {
    if (!form.konu || !form.aciklama) {
      toast.error('Konu ve açıklama alanları zorunludur')
      return
    }
    setSubmitting(true)
    try {
      const res = await fetch('/api/tenant/support', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: form.konu,
          description: form.aciklama,
          priority: form.oncelik,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gönderilemedi')
      addSupportTicket({
        subject: form.konu,
        priority: form.oncelik as 'Düşük' | 'Normal' | 'Yüksek' | 'Acil',
        description: form.aciklama,
      })
      toast.success('Destek talebiniz alındı! En kısa sürede dönüş yapacağız.')
      setForm({ konu: '', oncelik: 'Normal', aciklama: '' })
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Gönderilemedi')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Destek Merkezi</h1>
          <p className="text-slate-500 text-sm mt-0.5">SSS, yardım dokümantasyonu ve destek talebi</p>
        </div>
        {/* Status indicator */}
        <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl">
          <Activity size={14} className="text-green-600"/>
          <span className="text-sm font-semibold text-green-700">Tüm Sistemler Aktif</span>
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"/>
        </div>
      </div>

      {/* Quick contact cards */}
      <div className="grid md:grid-cols-3 gap-4">
        <a href="tel:08501234567"
          className="card p-4 flex items-center gap-3 hover:border-slate-300 hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
            <Phone size={18} style={{ color: 'var(--accent)' }}/>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">0850 123 45 67</p>
            <p className="text-xs text-slate-400">Hafta içi 09-18</p>
          </div>
        </a>

        <a href="mailto:destek@aurabilisim.net"
          className="card p-4 flex items-center gap-3 hover:border-slate-300 hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--accent-light)' }}>
            <Mail size={18} style={{ color: 'var(--accent)' }}/>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">destek@aurabilisim.net</p>
            <p className="text-xs text-slate-400">1 iş günü içinde yanıt</p>
          </div>
        </a>

        <a href="https://wa.me/905321234567?text=Merhaba, AURA İntegra desteğe ihtiyacım var."
          target="_blank" rel="noreferrer"
          className="card p-4 flex items-center gap-3 hover:border-green-300 hover:shadow-md transition-all">
          <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center">
            <MessageCircle size={18} className="text-green-600"/>
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">WhatsApp Destek</p>
            <p className="text-xs text-slate-400">Canlı sohbet başlat</p>
          </div>
        </a>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* FAQ */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <HelpCircle size={16} style={{ color: 'var(--accent)' }}/>
            Sık Sorulan Sorular
          </h3>
          <div className="space-y-1">
            {FAQS.map((faq, i) => (
              <div key={i} className="border border-slate-100 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50 transition-colors">
                  <span className="text-sm font-medium text-slate-900 pr-3">{faq.q}</span>
                  {openFaq === i
                    ? <ChevronUp size={14} className="text-slate-400 flex-shrink-0"/>
                    : <ChevronDown size={14} className="text-slate-400 flex-shrink-0"/>
                  }
                </button>
                {openFaq === i && (
                  <div className="px-4 pb-4 text-sm text-slate-600 leading-relaxed border-t border-slate-50 pt-3 bg-slate-50">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Support ticket form */}
        <div className="card p-5">
          <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Send size={16} style={{ color: 'var(--accent)' }}/>
            Destek Talebi Oluştur
          </h3>
          <div className="space-y-4">
            <div>
              <label className="label">Konu</label>
              <input className="input" placeholder="Sorununuzu kısaca özetleyin"
                value={form.konu} onChange={e => setForm(f => ({...f, konu: e.target.value}))}/>
            </div>
            <div>
              <label className="label">Öncelik</label>
              <select className="input" value={form.oncelik} onChange={e => setForm(f => ({...f, oncelik: e.target.value}))}>
                <option>Düşük</option>
                <option>Normal</option>
                <option>Yüksek</option>
                <option>Acil</option>
              </select>
            </div>
            <div>
              <label className="label">Açıklama</label>
              <textarea className="input resize-none" rows={5}
                placeholder="Sorununuzu detaylı açıklayın. Hata mesajı varsa ekleyin."
                value={form.aciklama} onChange={e => setForm(f => ({...f, aciklama: e.target.value}))}/>
            </div>
            <button onClick={handleSubmit} disabled={submitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white transition-all disabled:opacity-60"
              style={{ backgroundColor: 'var(--accent)' }}>
              {submitting ? 'Gönderiliyor...' : <><Send size={14}/> Talebi Gönder</>}
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Clock size={12}/>
              <span>Ortalama yanıt süresi: Profesyonel plan 4 saat, Kurumsal plan 1 saat</span>
            </div>
          </div>
        </div>
      </div>

      {/* Taleplerim */}
      <div className="card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Inbox size={16} style={{ color: 'var(--accent)' }}/>
            Taleplerim
          </h3>
          <span className="text-xs text-slate-400">{tickets.length} talep</span>
        </div>
        {tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Inbox size={28} className="text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">Henüz destek talebiniz yok</p>
            <p className="text-xs text-slate-400">Yukarıdan yeni bir talep oluşturabilirsiniz</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((t: any) => {
              const st = STATUS_STYLE[t.status] || STATUS_STYLE.open
              const prio = PRIORITY_STYLE[t.priority] || PRIORITY_STYLE['Normal']
              return (
                <div key={t.id} className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-100 hover:border-slate-200 transition-all">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-900">{t.subject}</p>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${prio}`}>{t.priority}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">{t.description}</p>
                    <p className="text-[10px] text-slate-400 mt-1">
                      {new Date(t.created_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Documentation grid */}
      <div className="card p-5">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FileText size={16} style={{ color: 'var(--accent)' }}/>
          Dokümantasyon
        </h3>
        <div className="grid sm:grid-cols-2 gap-3">
          {DOCS.map(doc => (
            <button key={doc.title} onClick={() => toast.info('Dokümantasyon hazırlanıyor...')}
              className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-slate-200 hover:shadow-sm transition-all text-left">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${doc.color} flex-shrink-0`}>
                {doc.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-900">{doc.title}</p>
                <p className="text-xs text-slate-400 truncate">{doc.desc}</p>
              </div>
              <ExternalLink size={14} className="text-slate-300 flex-shrink-0"/>
            </button>
          ))}
        </div>
      </div>

      {/* Service hours */}
      <div className="card p-5">
        <h3 className="font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Clock size={16} style={{ color: 'var(--accent)' }}/>
          Çalışma Saatleri
        </h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {[
            { day: 'Pazartesi - Cuma', hours: '09:00 - 18:00', available: true },
            { day: 'Cumartesi', hours: '10:00 - 14:00', available: true },
            { day: 'Pazar', hours: 'Kapalı', available: false },
            { day: 'Resmi Tatiller', hours: 'Kapalı', available: false },
          ].map(h => (
            <div key={h.day} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
              <span className="text-sm text-slate-700">{h.day}</span>
              <div className="flex items-center gap-2">
                {h.available
                  ? <CheckCircle size={13} className="text-green-500"/>
                  : <AlertCircle size={13} className="text-slate-300"/>
                }
                <span className={`text-sm font-medium ${h.available ? 'text-slate-900' : 'text-slate-400'}`}>{h.hours}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl">
          <p className="text-xs text-amber-700 font-medium">⚡ Kurumsal plan müşterileri 7/24 acil destek hattına erişebilir.</p>
        </div>
      </div>
    </div>
  )
}
