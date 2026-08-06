'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Building2, Search, Plus, Mail, Phone, Loader2, CheckCircle, Clock, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { PageShell, PageHeader, PageCard, LoadingCenter } from '@/components/ui/PageShell'
import type { Dealer } from '@/lib/store'

const STATUS_INFO: Record<string, { label: string; text: string; bg: string; icon: any }> = {
  active: { label: 'Aktif', text: 'text-emerald-700', bg: 'bg-emerald-100', icon: CheckCircle },
  pending: { label: 'Onay Bekliyor', text: 'text-amber-700', bg: 'bg-amber-100', icon: Clock },
  suspended: { label: 'Askıya Alındı', text: 'text-red-700', bg: 'bg-red-100', icon: AlertCircle },
}

export default function DealersPage() {
  const router = useRouter()
  const [dealers, setDealers] = useState<Dealer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ company_name: '', contact_name: '', email: '', phone: '', status: 'pending' })

  const fetchDealers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tenant/dealers')
      const json = await res.json()
      if (json.ok) setDealers(json.items || [])
    } catch {
      toast.error('Bayiler yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDealers()
  }, [fetchDealers])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!form.company_name) return

    setSaving(true)
    try {
      const res = await fetch('/api/tenant/dealers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form)
      })
      const json = await res.json()
      if (json.ok) {
        toast.success('Bayi oluşturuldu')
        setShowModal(false)
        setForm({ company_name: '', contact_name: '', email: '', phone: '', status: 'pending' })
        fetchDealers()
      } else {
        toast.error(json.error || 'Oluşturulamadı')
      }
    } catch {
      toast.error('Bağlantı hatası')
    } finally {
      setSaving(false)
    }
  }

  const filtered = dealers.filter(d => 
    d.company_name.toLowerCase().includes(search.toLowerCase()) || 
    (d.contact_name && d.contact_name.toLowerCase().includes(search.toLowerCase())) ||
    (d.email && d.email.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <PageShell className="max-w-6xl mx-auto">
      <PageHeader
        title="Bayi Yönetimi (B2B)"
        description="Kurumsal müşterilerinizi, toptan satışlarınızı ve bayi siparişlerini yönetin."
        icon={Building2}
        actions={
          <button onClick={() => setShowModal(true)} className="btn-primary">
            <Plus size={16} /> Yeni Bayi Ekle
          </button>
        }
      />

      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          className="input pl-10 max-w-md"
          placeholder="Firma adı, yetkili veya e-posta ara..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <PageCard className="p-0 overflow-hidden">
        {loading ? (
          <div className="py-12"><LoadingCenter /></div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-slate-500">
            <Building2 size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-semibold text-slate-700">Bayi bulunamadı</p>
            <p className="text-sm mt-1">Sisteme henüz bir bayi kaydedilmemiş veya aramanızla eşleşen sonuç yok.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                <tr>
                  <th className="px-6 py-4">Firma / Yetkili</th>
                  <th className="px-6 py-4">İletişim</th>
                  <th className="px-6 py-4">Durum</th>
                  <th className="px-6 py-4">İskonto / Kredi</th>
                  <th className="px-6 py-4 text-right">Kayıt Tarihi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map(d => {
                  const st = STATUS_INFO[d.status] || STATUS_INFO.pending
                  const Icon = st.icon
                  return (
                    <tr 
                      key={d.id} 
                      onClick={() => router.push(`/dashboard/bayiler/${d.id}`)}
                      className="hover:bg-slate-50 cursor-pointer transition-colors group"
                    >
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900 group-hover:text-sky-600 transition-colors">{d.company_name}</div>
                        {d.contact_name && <div className="text-xs text-slate-500 mt-0.5">{d.contact_name}</div>}
                      </td>
                      <td className="px-6 py-4 space-y-1">
                        {d.email && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Mail size={12} className="text-slate-400" /> {d.email}
                          </div>
                        )}
                        {d.phone && (
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Phone size={12} className="text-slate-400" /> {d.phone}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${st.bg} ${st.text}`}>
                          <Icon size={12} /> {st.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-xs font-semibold text-slate-700">İskonto: %{d.discount_rate}</div>
                        <div className="text-xs text-slate-500 mt-0.5">Limit: {new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(d.credit_limit)}</div>
                      </td>
                      <td className="px-6 py-4 text-right text-xs text-slate-500 whitespace-nowrap">
                        {new Date(d.created_at).toLocaleDateString('tr-TR')}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </PageCard>

      {/* YENİ BAYİ MODALI */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
            <div className="modal-header border-b border-slate-100 p-4">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Building2 size={20} className="text-slate-600" />
                Yeni Bayi Ekle
              </h3>
            </div>
            <form onSubmit={handleCreate} className="p-4 space-y-4">
              <div>
                <label className="label">Firma Adı *</label>
                <input required className="input" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} />
              </div>
              <div>
                <label className="label">Yetkili Kişi</label>
                <input className="input" value={form.contact_name} onChange={e => setForm({...form, contact_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">E-Posta</label>
                  <input type="email" className="input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                </div>
                <div>
                  <label className="label">Telefon</label>
                  <input type="tel" className="input" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="label">Başlangıç Durumu</label>
                <select className="input" value={form.status} onChange={e => setForm({...form, status: e.target.value})}>
                  <option value="pending">Onay Bekliyor (Taslak)</option>
                  <option value="active">Aktif</option>
                </select>
              </div>
              <div className="flex gap-2 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary flex-1">İptal</button>
                <button type="submit" disabled={saving} className="btn-primary flex-1">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : 'Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  )
}
