'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import {
  Users, Search, Plus, X, Loader2, Phone, Mail, MapPin,
  Star, ShieldAlert, Tag, Upload, Download, MessageCircle,
  ChevronDown, Filter, Eye, Edit3, Trash2, UserPlus,
  Building2, User, Crown, CheckCircle, AlertTriangle
} from 'lucide-react'
import {
  formatPhoneDisplay, formatCurrency, formatDate, validateTCKN, validatePhoneNumber
} from '@/lib/validators'
import {
  getCustomers, addCustomer, updateCustomer, removeCustomer, onStoreChange, type StoreCustomer
} from '@/lib/store'

// ─── Tipler ──────────────────────────────────────────────────────────────────

interface Customer {
  id: string
  tenant_id: string
  full_name: string
  phone: string
  email?: string
  address?: string
  tc_no?: string
  vkn?: string
  customer_type: 'bireysel' | 'kurumsal' | 'bayi'
  segment: 'vip' | 'regular' | 'oneshot'
  company_name?: string
  extra_phones?: string[]
  birthday?: string
  kvkk_consent_date?: string
  sms_allowed: boolean
  email_allowed: boolean
  blacklisted: boolean
  blacklist_reason?: string
  total_spent: number
  satisfaction_avg: number
  notes?: string
  created_at: string
  updated_at: string
  // joined
  _order_count?: number
}

// ─── Sabitler ────────────────────────────────────────────────────────────────

const SEGMENT_CONFIG = {
  vip:     { label: 'VIP', icon: Crown, bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' },
  regular: { label: 'Düzenli', icon: Users, bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' },
  oneshot: { label: 'Tek Seferlik', icon: User, bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' },
}

const TYPE_CONFIG = {
  bireysel: { label: 'Bireysel', icon: User, color: 'text-blue-600' },
  kurumsal: { label: 'Kurumsal', icon: Building2, color: 'text-purple-600' },
  bayi:     { label: 'Bayi', icon: Tag, color: 'text-emerald-600' },
}

interface CustomerForm {
  full_name: string; phone: string; email: string; address: string
  tc_no: string; vkn: string; customer_type: 'bireysel' | 'kurumsal' | 'bayi'
  segment: 'vip' | 'regular' | 'oneshot'; company_name: string
  sms_allowed: boolean; email_allowed: boolean; notes: string
}

const EMPTY_FORM: CustomerForm = {
  full_name: '', phone: '', email: '', address: '', tc_no: '', vkn: '',
  customer_type: 'bireysel', segment: 'regular',
  company_name: '', sms_allowed: false, email_allowed: false, notes: '',
}

function mapStoreCustomers(): Customer[] {
  return getCustomers().map(c => mapApiCustomer(c, 'local'))
}

function mapApiCustomer(c: StoreCustomer & { tenant_id?: string }, tenantId = 'local'): Customer {
  return {
    id: c.id,
    tenant_id: c.tenant_id ?? tenantId,
    full_name: c.full_name,
    phone: c.phone,
    email: c.email,
    address: c.address,
    tc_no: c.tc_no,
    vkn: c.vkn,
    customer_type: c.customer_type,
    segment: c.segment === 'regular' ? 'regular' : c.segment,
    company_name: c.company_name,
    sms_allowed: c.sms_allowed,
    email_allowed: c.email_allowed,
    blacklisted: c.blacklisted,
    blacklist_reason: c.blacklist_reason,
    total_spent: c.total_spent,
    satisfaction_avg: c.satisfaction_avg,
    notes: c.notes,
    kvkk_consent_date: c.kvkk_consent_date,
    created_at: c.created_at,
    updated_at: c.updated_at,
  }
}

// ─── Ana Bileşen ────────────────────────────────────────────────────────────

export default function MusterilerPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [segmentFilter, setSegmentFilter] = useState('')
  const [showBlacklisted, setShowBlacklisted] = useState(false)

  // Modal
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Detail drawer
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)

  // ─── Veri Çekme ─────────────────────────────────────────────────────────

  const fetchCustomers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/tenant/customers', { credentials: 'same-origin' })
      const json = await res.json()
      if (res.ok && json.ok) {
        setCustomers((json.items as StoreCustomer[]).map(c => mapApiCustomer(c)))
        return
      }
      throw new Error(json.error || 'API hatası')
    } catch {
      toast.warning('Bulut verisi alınamadı — yerel kayıtlar gösteriliyor')
      setCustomers(mapStoreCustomers())
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchCustomers() }, [fetchCustomers])
  useEffect(() => onStoreChange((m) => { if (!m || m === 'customers' || m === 'seed') fetchCustomers() }), [fetchCustomers])

  // ─── Filtre ─────────────────────────────────────────────────────────────

  const filtered = customers.filter(c => {
    if (search) {
      const q = search.toLowerCase()
      const match = c.full_name.toLowerCase().includes(q)
        || c.phone.includes(q)
        || c.tc_no?.includes(q)
        || c.email?.toLowerCase().includes(q)
        || c.company_name?.toLowerCase().includes(q)
      if (!match) return false
    }
    if (typeFilter && c.customer_type !== typeFilter) return false
    if (segmentFilter && c.segment !== segmentFilter) return false
    if (!showBlacklisted && c.blacklisted) return false
    return true
  })

  // ─── Form Validasyon ────────────────────────────────────────────────────

  function validateForm(): boolean {
    const errors: Record<string, string> = {}
    if (!form.full_name.trim()) errors.full_name = 'Ad soyad gerekli'
    if (!form.phone.trim()) errors.phone = 'Telefon gerekli'
    else if (!validatePhoneNumber(form.phone)) errors.phone = 'Geçersiz telefon'
    if (form.tc_no && !validateTCKN(form.tc_no)) errors.tc_no = 'Geçersiz TC'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errors.email = 'Geçersiz e-posta'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  // ─── Kaydet ─────────────────────────────────────────────────────────────

  async function handleSave() {
    if (!validateForm()) return
    setSaving(true)
    try {
      const payload = {
        full_name: form.full_name.trim(),
        phone: form.phone.trim(),
        email: form.email || undefined,
        address: form.address || undefined,
        tc_no: form.tc_no || undefined,
        vkn: form.vkn || undefined,
        customer_type: form.customer_type,
        segment: form.segment,
        company_name: form.company_name || undefined,
        sms_allowed: form.sms_allowed,
        email_allowed: form.email_allowed,
        notes: form.notes || undefined,
        kvkk_consent_date: (form.sms_allowed || form.email_allowed) ? new Date().toISOString() : undefined,
        blacklisted: false,
        total_spent: 0,
        satisfaction_avg: 0,
      }

      let apiOk = false
      try {
        const url = '/api/tenant/customers'
        const res = await fetch(url, {
          method: editingId ? 'PATCH' : 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
        })
        const json = await res.json()
        if (res.ok && json.ok) apiOk = true
      } catch { /* offline */ }

      if (!apiOk) {
        if (editingId) {
          updateCustomer(editingId, payload)
        } else {
          addCustomer(payload as Omit<StoreCustomer, 'id' | 'created_at' | 'updated_at'>)
        }
      }

      toast.success(editingId ? 'Müşteri güncellendi' : 'Müşteri eklendi')
      setShowModal(false)
      setEditingId(null)
      setForm(EMPTY_FORM)
      fetchCustomers()
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Kayıt hatası')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Bu müşteriyi silmek istediğinize emin misiniz?')) return
    try {
      const res = await fetch(`/api/tenant/customers?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      if (!res.ok) throw new Error('Silinemedi')
    } catch {
      removeCustomer(id)
    }
    toast.success('Müşteri silindi')
    fetchCustomers()
  }

  async function toggleBlacklist(customer: Customer) {
    const reason = customer.blacklisted ? null : prompt('Kara liste sebebi:')
    if (!customer.blacklisted && !reason) return

    try {
      const res = await fetch('/api/tenant/customers', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: customer.id,
          blacklisted: !customer.blacklisted,
          blacklist_reason: reason,
        }),
      })
      if (!res.ok) throw new Error('Güncellenemedi')
    } catch {
      updateCustomer(customer.id, {
        blacklisted: !customer.blacklisted,
        blacklist_reason: reason || undefined,
      })
    }
    toast.success(customer.blacklisted ? 'Kara listeden çıkarıldı' : 'Kara listeye eklendi')
    fetchCustomers()
  }

  // ─── Düzenleme Modal Aç ─────────────────────────────────────────────────

  function openEdit(c: Customer) {
    setEditingId(c.id)
    setForm({
      full_name: c.full_name, phone: c.phone, email: c.email || '',
      address: c.address || '', tc_no: c.tc_no || '', vkn: c.vkn || '',
      customer_type: c.customer_type, segment: c.segment,
      company_name: c.company_name || '', sms_allowed: c.sms_allowed,
      email_allowed: c.email_allowed, notes: c.notes || '',
    })
    setFormErrors({})
    setShowModal(true)
  }

  // ─── WhatsApp ───────────────────────────────────────────────────────────

  function openWhatsApp(c: Customer) {
    const phone = c.phone.replace(/\D/g, '')
    const num = phone.startsWith('90') ? phone : phone.startsWith('0') ? '90' + phone.slice(1) : '90' + phone
    const msg = encodeURIComponent(`Sayın ${c.full_name}, servisimizle ilgili bilgi almak için yanıtlayabilirsiniz.`)
    window.open(`https://wa.me/${num}?text=${msg}`, '_blank')
  }

  // ─── İstatistikler ──────────────────────────────────────────────────────

  const stats = {
    total: customers.length,
    bireysel: customers.filter(c => c.customer_type === 'bireysel').length,
    kurumsal: customers.filter(c => c.customer_type === 'kurumsal').length,
    vip: customers.filter(c => c.segment === 'vip').length,
    blacklisted: customers.filter(c => c.blacklisted).length,
    totalRevenue: customers.reduce((s, c) => s + (c.total_spent || 0), 0),
  }

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 pb-8">

      {/* Header */}
      <div data-tour="musteri-baslik" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Users size={20} className="text-sky-600" /> Müşteri Yönetimi
          </h1>
          <p className="text-slate-400 text-sm mt-0.5">CRM — Müşteri kartları, segmentasyon ve iletişim</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-secondary text-xs flex items-center gap-1.5">
            <Download size={13} /> Dışa Aktar
          </button>
          <button className="btn-secondary text-xs flex items-center gap-1.5">
            <Upload size={13} /> İçe Aktar
          </button>
          <button data-tour="musteri-yeni-btn" onClick={() => { setEditingId(null); setForm(EMPTY_FORM); setFormErrors({}); setShowModal(true) }}
            className="btn-primary text-sm flex items-center gap-1.5">
            <UserPlus size={14} /> Yeni Müşteri
          </button>
        </div>
      </div>

      {/* Metrik Kartlar */}
      <div data-tour="musteri-metrikler" className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: 'Toplam', val: stats.total, icon: Users, bg: 'bg-slate-50', color: 'text-slate-600' },
          { label: 'Bireysel', val: stats.bireysel, icon: User, bg: 'bg-blue-50', color: 'text-blue-600' },
          { label: 'Kurumsal', val: stats.kurumsal, icon: Building2, bg: 'bg-purple-50', color: 'text-purple-600' },
          { label: 'VIP', val: stats.vip, icon: Crown, bg: 'bg-amber-50', color: 'text-amber-600' },
          { label: 'Kara Liste', val: stats.blacklisted, icon: ShieldAlert, bg: 'bg-red-50', color: 'text-red-500' },
          { label: 'Toplam Ciro', val: formatCurrency(stats.totalRevenue), icon: Star, bg: 'bg-emerald-50', color: 'text-emerald-600', isText: true },
        ].map(m => (
          <div key={m.label} className="card p-4 hover:shadow-md transition-all">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${m.bg} mb-2`}>
              <m.icon size={14} className={m.color} />
            </div>
            <p className="text-lg font-black text-slate-900 tabular-nums">{m.val}</p>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{m.label}</p>
          </div>
        ))}
      </div>

      {/* Filtre Bar */}
      <div data-tour="musteri-arama" className="card p-3 mobile-toolbar">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Ad, telefon, TC, e-posta ile ara..."
            className="input pl-9 text-sm" />
        </div>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="select text-xs py-2">
          <option value="">Tüm Tipler</option>
          <option value="bireysel">Bireysel</option>
          <option value="kurumsal">Kurumsal</option>
          <option value="bayi">Bayi</option>
        </select>
        <select value={segmentFilter} onChange={e => setSegmentFilter(e.target.value)} className="select text-xs py-2">
          <option value="">Tüm Segmentler</option>
          <option value="vip">VIP</option>
          <option value="regular">Düzenli</option>
          <option value="oneshot">Tek Seferlik</option>
        </select>
        <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
          <input type="checkbox" checked={showBlacklisted} onChange={e => setShowBlacklisted(e.target.checked)}
            className="rounded border-slate-300" />
          Kara Liste
        </label>
        <span className="text-xs text-slate-400 ml-auto">{filtered.length} müşteri</span>
      </div>

      {/* Müşteri Tablosu */}
      <div data-tour="musteri-tablo" className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={24} className="animate-spin text-sky-500" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-400">
            <Users size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-semibold">Müşteri bulunamadı</p>
            <p className="text-xs mt-1">Arama kriterlerini değiştirin veya yeni müşteri ekleyin</p>
          </div>
        ) : (
          <>
            {/* Mobil kart görünümü */}
            <div className="mobile-data-card-list p-3">
              {filtered.map(c => {
                const typeConf = TYPE_CONFIG[c.customer_type]
                const segConf = SEGMENT_CONFIG[c.segment]
                return (
                  <div key={c.id} className="mobile-data-card">
                    <div className="flex items-start gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0
                        ${c.blacklisted ? 'bg-red-100 text-red-600' : 'bg-sky-50 text-sky-600'}`}>
                        {c.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 flex items-center gap-1.5 truncate">
                          {c.full_name}
                          {c.blacklisted && <ShieldAlert size={12} className="text-red-500 shrink-0" />}
                        </p>
                        {c.company_name && <p className="text-[10px] text-slate-400 truncate">{c.company_name}</p>}
                        <p className="text-xs text-slate-600 flex items-center gap-1 mt-1">
                          <Phone size={10} /> {formatPhoneDisplay(c.phone)}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className={`text-[10px] font-semibold ${typeConf.color}`}>{typeConf.label}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${segConf.bg} ${segConf.text}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${segConf.dot}`} />
                            {segConf.label}
                          </span>
                          <span className="text-xs font-black text-slate-900 tabular-nums ml-auto">
                            {formatCurrency(c.total_spent || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-100">
                      <button onClick={() => openWhatsApp(c)} className="flex-1 py-2 rounded-lg bg-green-50 text-green-600 text-xs font-bold flex items-center justify-center gap-1">
                        <MessageCircle size={13} /> WhatsApp
                      </button>
                      <button onClick={() => setSelectedCustomer(c)} className="p-2 rounded-lg bg-blue-50 text-blue-600"><Eye size={14} /></button>
                      <button onClick={() => openEdit(c)} className="p-2 rounded-lg bg-amber-50 text-amber-600"><Edit3 size={14} /></button>
                      <button onClick={() => toggleBlacklist(c)} className="p-2 rounded-lg bg-red-50 text-red-500"><ShieldAlert size={14} /></button>
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Masaüstü tablo */}
            <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">MÜŞTERİ</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">İLETİŞİM</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">TİP</th>
                  <th className="text-left py-3 px-4 font-semibold text-slate-500 text-xs">SEGMENT</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-500 text-xs">CİRO</th>
                  <th className="text-center py-3 px-4 font-semibold text-slate-500 text-xs">PUAN</th>
                  <th className="text-right py-3 px-4 font-semibold text-slate-500 text-xs">İŞLEM</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(c => {
                  const typeConf = TYPE_CONFIG[c.customer_type]
                  const segConf = SEGMENT_CONFIG[c.segment]
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors group">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm
                            ${c.blacklisted ? 'bg-red-100 text-red-600' : 'bg-sky-50 text-sky-600'}`}>
                            {c.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                              {c.full_name}
                              {c.blacklisted && <ShieldAlert size={12} className="text-red-500" />}
                            </p>
                            {c.company_name && <p className="text-[10px] text-slate-400">{c.company_name}</p>}
                            {c.tc_no && <p className="text-[10px] text-slate-400 font-mono">TC: {c.tc_no}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-xs text-slate-700 flex items-center gap-1">
                          <Phone size={10} /> {formatPhoneDisplay(c.phone)}
                        </p>
                        {c.email && (
                          <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                            <Mail size={9} /> {c.email}
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`text-xs font-semibold ${typeConf.color}`}>
                          {typeConf.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${segConf.bg} ${segConf.text}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${segConf.dot}`} />
                          {segConf.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-xs font-black text-slate-900 tabular-nums">
                          {formatCurrency(c.total_spent || 0)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {(c.satisfaction_avg || 0) > 0 ? (
                          <span className="inline-flex items-center gap-0.5 text-xs font-bold text-amber-600">
                            <Star size={10} fill="currentColor" /> {Number(c.satisfaction_avg).toFixed(1)}
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-300">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => openWhatsApp(c)} title="WhatsApp"
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-600"><MessageCircle size={13} /></button>
                          <button onClick={() => setSelectedCustomer(c)} title="Detay"
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600"><Eye size={13} /></button>
                          <button onClick={() => openEdit(c)} title="Düzenle"
                            className="p-1.5 rounded-lg hover:bg-amber-50 text-amber-600"><Edit3 size={13} /></button>
                          <button onClick={() => toggleBlacklist(c)} title={c.blacklisted ? 'Kara Listeden Çıkar' : 'Kara Listeye Al'}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-500"><ShieldAlert size={13} /></button>
                          <button onClick={() => handleDelete(c.id)} title="Sil"
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400"><Trash2 size={13} /></button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            </div>
          </>
        )}
      </div>

      {/* ─── Müşteri Ekle/Düzenle Modal ────────────────────────────────────── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-fade-in-up">
            <div className="flex items-center justify-between p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-slate-900">{editingId ? 'Müşteri Düzenle' : 'Yeni Müşteri'}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Tip Seçimi */}
              <div>
                <label className="label">Müşteri Tipi</label>
                <div className="flex gap-2">
                  {(['bireysel', 'kurumsal', 'bayi'] as const).map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, customer_type: t }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all
                        ${form.customer_type === t ? 'bg-sky-600 text-white border-sky-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                      {TYPE_CONFIG[t].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Ad Soyad */}
              <div>
                <label className="label">Ad Soyad *</label>
                <input className={`input ${formErrors.full_name ? 'border-red-400' : ''}`}
                  value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))}
                  placeholder="Ad Soyad" />
                {formErrors.full_name && <p className="text-red-500 text-[10px] mt-1">{formErrors.full_name}</p>}
              </div>

              {/* Kurumsal: Firma Adı */}
              {form.customer_type !== 'bireysel' && (
                <div>
                  <label className="label">Firma Adı</label>
                  <input className="input" value={form.company_name}
                    onChange={e => setForm(f => ({ ...f, company_name: e.target.value }))}
                    placeholder="Firma adı..." />
                </div>
              )}

              {/* Telefon + Email */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Telefon *</label>
                  <input className={`input ${formErrors.phone ? 'border-red-400' : ''}`}
                    value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="0532 123 4567" />
                  {formErrors.phone && <p className="text-red-500 text-[10px] mt-1">{formErrors.phone}</p>}
                </div>
                <div>
                  <label className="label">E-posta</label>
                  <input className={`input ${formErrors.email ? 'border-red-400' : ''}`}
                    value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="ornek@email.com" />
                  {formErrors.email && <p className="text-red-500 text-[10px] mt-1">{formErrors.email}</p>}
                </div>
              </div>

              {/* TC + VKN */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">TC Kimlik No</label>
                  <input className={`input font-mono ${formErrors.tc_no ? 'border-red-400' : ''}`}
                    value={form.tc_no} onChange={e => setForm(f => ({ ...f, tc_no: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                    placeholder="12345678901" maxLength={11} />
                  {formErrors.tc_no && <p className="text-red-500 text-[10px] mt-1">{formErrors.tc_no}</p>}
                </div>
                <div>
                  <label className="label">{form.customer_type === 'bireysel' ? 'VKN (opsiyonel)' : 'VKN'}</label>
                  <input className="input font-mono" value={form.vkn}
                    onChange={e => setForm(f => ({ ...f, vkn: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                    placeholder="1234567890" maxLength={10} />
                </div>
              </div>

              {/* Adres */}
              <div>
                <label className="label">Adres</label>
                <textarea className="input min-h-[60px] resize-none" value={form.address}
                  onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
                  placeholder="Adres bilgisi..." />
              </div>

              {/* Segment */}
              <div>
                <label className="label">Segment</label>
                <div className="flex gap-2">
                  {(['vip', 'regular', 'oneshot'] as const).map(s => (
                    <button key={s} onClick={() => setForm(f => ({ ...f, segment: s }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all
                        ${form.segment === s
                          ? `${SEGMENT_CONFIG[s].bg} ${SEGMENT_CONFIG[s].text} border-current`
                          : 'bg-white text-slate-500 border-slate-200'}`}>
                      {SEGMENT_CONFIG[s].label}
                    </button>
                  ))}
                </div>
              </div>

              {/* KVKK Onaylar */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-2">
                <p className="text-xs font-bold text-slate-700">KVKK İzinleri</p>
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={form.sms_allowed}
                    onChange={e => setForm(f => ({ ...f, sms_allowed: e.target.checked }))}
                    className="rounded border-slate-300" />
                  SMS gönderimi için açık rıza
                </label>
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input type="checkbox" checked={form.email_allowed}
                    onChange={e => setForm(f => ({ ...f, email_allowed: e.target.checked }))}
                    className="rounded border-slate-300" />
                  E-posta gönderimi için açık rıza
                </label>
              </div>

              {/* Notlar */}
              <div>
                <label className="label">Notlar</label>
                <textarea className="input min-h-[50px] resize-none" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  placeholder="Müşteri hakkında notlar..." />
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-5 border-t border-slate-100 sticky bottom-0 bg-white">
              <button onClick={() => setShowModal(false)} className="btn-secondary flex-1">İptal</button>
              <button onClick={handleSave} disabled={saving}
                className="btn-primary flex-1 flex items-center justify-center gap-2">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle size={14} />}
                {saving ? 'Kaydediliyor...' : editingId ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Detay Drawer ──────────────────────────────────────────────────── */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedCustomer(null)} />
          <div data-tour="musteri-detay" className="w-full max-w-md bg-white shadow-2xl overflow-y-auto animate-slide-in-right">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <h3 className="font-bold text-slate-900">Müşteri Detayı</h3>
              <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-slate-600"><X size={18} /></button>
            </div>
            <div className="p-5 space-y-5">
              {/* Avatar + Ad */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-purple-600 flex items-center justify-center text-white font-black text-xl mx-auto mb-3">
                  {selectedCustomer.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <h4 className="font-bold text-lg text-slate-900">{selectedCustomer.full_name}</h4>
                {selectedCustomer.company_name && (
                  <p className="text-xs text-slate-400">{selectedCustomer.company_name}</p>
                )}
                <div className="flex items-center justify-center gap-2 mt-2">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${SEGMENT_CONFIG[selectedCustomer.segment].bg} ${SEGMENT_CONFIG[selectedCustomer.segment].text}`}>
                    {SEGMENT_CONFIG[selectedCustomer.segment].label}
                  </span>
                  <span className={`text-[10px] font-bold ${TYPE_CONFIG[selectedCustomer.customer_type].color}`}>
                    {TYPE_CONFIG[selectedCustomer.customer_type].label}
                  </span>
                </div>
              </div>

              {/* İletişim */}
              <div className="space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase">İletişim</p>
                <div className="flex items-center gap-2 text-sm text-slate-700">
                  <Phone size={13} className="text-slate-400" /> {formatPhoneDisplay(selectedCustomer.phone)}
                </div>
                {selectedCustomer.email && (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <Mail size={13} className="text-slate-400" /> {selectedCustomer.email}
                  </div>
                )}
                {selectedCustomer.address && (
                  <div className="flex items-center gap-2 text-sm text-slate-700">
                    <MapPin size={13} className="text-slate-400" /> {selectedCustomer.address}
                  </div>
                )}
              </div>

              {/* Özet */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-emerald-700">{formatCurrency(selectedCustomer.total_spent || 0)}</p>
                  <p className="text-[10px] font-semibold text-emerald-600">Toplam Harcama</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <p className="text-lg font-black text-amber-700 flex items-center justify-center gap-1">
                    <Star size={14} fill="currentColor" />
                    {(selectedCustomer.satisfaction_avg || 0) > 0 ? Number(selectedCustomer.satisfaction_avg).toFixed(1) : '—'}
                  </p>
                  <p className="text-[10px] font-semibold text-amber-600">Memnuniyet</p>
                </div>
              </div>

              {/* KVKK */}
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5">
                <p className="text-xs font-bold text-slate-500">KVKK</p>
                <div className="flex items-center gap-1.5 text-xs">
                  {selectedCustomer.sms_allowed
                    ? <><CheckCircle size={11} className="text-green-500" /> SMS izni var</>
                    : <><AlertTriangle size={11} className="text-red-400" /> SMS izni yok</>
                  }
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  {selectedCustomer.email_allowed
                    ? <><CheckCircle size={11} className="text-green-500" /> E-posta izni var</>
                    : <><AlertTriangle size={11} className="text-red-400" /> E-posta izni yok</>
                  }
                </div>
                {selectedCustomer.kvkk_consent_date && (
                  <p className="text-[10px] text-slate-400">Onay tarihi: {formatDate(selectedCustomer.kvkk_consent_date)}</p>
                )}
              </div>

              {/* Notlar */}
              {selectedCustomer.notes && (
                <div className="p-3 bg-slate-50 rounded-xl">
                  <p className="text-xs font-bold text-slate-500 mb-1">Notlar</p>
                  <p className="text-xs text-slate-600">{selectedCustomer.notes}</p>
                </div>
              )}

              {/* Kara Liste */}
              {selectedCustomer.blacklisted && (
                <div className="p-3 bg-red-50 rounded-xl border border-red-200">
                  <p className="text-xs font-bold text-red-700 flex items-center gap-1">
                    <ShieldAlert size={12} /> Kara Listede
                  </p>
                  {selectedCustomer.blacklist_reason && (
                    <p className="text-xs text-red-600 mt-1">{selectedCustomer.blacklist_reason}</p>
                  )}
                </div>
              )}

              {/* Aksiyonlar */}
              <div className="flex gap-2">
                <button onClick={() => openWhatsApp(selectedCustomer)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-1.5"
                  style={{ backgroundColor: '#25D366' }}>
                  <MessageCircle size={13} /> WhatsApp
                </button>
                <button onClick={() => { setSelectedCustomer(null); openEdit(selectedCustomer) }}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-sky-600 text-white flex items-center justify-center gap-1.5">
                  <Edit3 size={13} /> Düzenle
                </button>
              </div>

              {/* Kayıt Bilgisi */}
              <p className="text-[10px] text-slate-300 text-center">
                Kayıt: {formatDate(selectedCustomer.created_at)}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Demo Müşteriler (Supabase bağlanamadığında) ────────────────────────────

const DEMO_CUSTOMERS: Customer[] = [
  { id: '1', tenant_id: '1', full_name: 'Ahmet Yılmaz', phone: '05321234567', email: 'ahmet@email.com', address: 'Kadıköy, İstanbul', tc_no: '12345678901', customer_type: 'bireysel', segment: 'vip', sms_allowed: true, email_allowed: true, blacklisted: false, total_spent: 12450, satisfaction_avg: 4.8, created_at: '2025-01-15T10:00:00Z', updated_at: '2026-06-01T10:00:00Z', kvkk_consent_date: '2025-01-15T10:00:00Z' },
  { id: '2', tenant_id: '1', full_name: 'Zeynep Arslan', phone: '05061357924', email: 'zeynep@firma.com', address: 'Beşiktaş, İstanbul', customer_type: 'bireysel', segment: 'regular', sms_allowed: true, email_allowed: false, blacklisted: false, total_spent: 3800, satisfaction_avg: 4.2, created_at: '2025-03-20T10:00:00Z', updated_at: '2026-05-15T10:00:00Z' },
  { id: '3', tenant_id: '1', full_name: 'Teknoloji A.Ş.', phone: '05334567890', company_name: 'Mega Teknoloji A.Ş.', vkn: '1234567890', customer_type: 'kurumsal', segment: 'vip', sms_allowed: true, email_allowed: true, blacklisted: false, total_spent: 45200, satisfaction_avg: 4.5, created_at: '2024-11-10T10:00:00Z', updated_at: '2026-06-01T10:00:00Z' },
  { id: '4', tenant_id: '1', full_name: 'Hasan Çelik', phone: '05559876543', customer_type: 'bireysel', segment: 'oneshot', sms_allowed: false, email_allowed: false, blacklisted: false, total_spent: 850, satisfaction_avg: 3.5, created_at: '2026-04-01T10:00:00Z', updated_at: '2026-04-01T10:00:00Z' },
  { id: '5', tenant_id: '1', full_name: 'Mert Kaya', phone: '05441239876', email: 'mert@outlook.com', customer_type: 'bireysel', segment: 'regular', sms_allowed: true, email_allowed: true, blacklisted: true, blacklist_reason: 'Ödeme yapmadan cihaz almaya çalıştı', total_spent: 0, satisfaction_avg: 0, created_at: '2026-02-10T10:00:00Z', updated_at: '2026-02-10T10:00:00Z' },
  { id: '6', tenant_id: '1', full_name: 'Elif Demir', phone: '05367891234', email: 'elif.demir@gmail.com', address: 'Ümraniye, İstanbul', tc_no: '98765432101', customer_type: 'bireysel', segment: 'regular', sms_allowed: true, email_allowed: false, blacklisted: false, total_spent: 6200, satisfaction_avg: 4.9, created_at: '2025-06-01T10:00:00Z', updated_at: '2026-05-20T10:00:00Z' },
]
