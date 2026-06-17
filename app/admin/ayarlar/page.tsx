'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  Package, Settings, Bell, Info, Plus, Save, Trash2,
  CheckCircle, XCircle, Edit2, Database, RotateCcw
} from 'lucide-react'
import { requestAdminTourRestart } from '@/lib/onboarding/use-admin-onboarding-tour'

const TABS = [
  { id: 'paketler',   label: 'Paket Yönetimi',     icon: Package },
  { id: 'genel',      label: 'Genel Ayarlar',       icon: Settings },
  { id: 'bildirim',   label: 'Bildirim Ayarları',   icon: Bell },
  { id: 'sistem',     label: 'Sistem Bilgisi',      icon: Info },
]

const DEFAULT_PLANS = [
  { id: '1', name: 'Stok & Satış', price: 450, price_yearly: 4320, max_users: 3, max_branches: 1, features: ['Stok & Envanter', 'Satış & POS', 'Müşteriler', 'Fatura', '3 Kullanıcı', '1 Şube'], is_active: true },
  { id: '2', name: 'Teknik Servis', price: 750, price_yearly: 7200, max_users: 6, max_branches: 2, features: ['Stok & Satış (dahil)', 'Teknik Servis', 'Garanti', 'Randevu', '6 Kullanıcı', '2 Şube'], is_active: false },
  { id: '3', name: 'Finans & Analitik', price: 1200, price_yearly: 11520, max_users: 12, max_branches: 5, features: ['Teknik Servis (dahil)', 'Finans', 'Raporlar', 'Analitik', '12 Kullanıcı', '5 Şube'], is_active: false },
]

interface Plan {
  id: string
  name: string
  price: number
  price_yearly: number
  max_users: number
  max_branches: number
  features: string[]
  is_active: boolean
}

export default function AyarlarPage() {
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState('paketler')
  const [plans, setPlans]         = useState<Plan[]>(DEFAULT_PLANS)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [showNewPlan, setShowNewPlan] = useState(false)
  const [toast, setToast]         = useState<{ type: 'success'|'error', msg: string } | null>(null)
  const [loading, setLoading]     = useState(false)
  const [stats, setStats]         = useState({ tenants: 0, users: 0, basvurular: 0 })
  const [auditLogs, setAuditLogs] = useState<Array<{ action: string; actor_email?: string; created_at: string; target_type?: string }>>([])

  // Genel Ayarlar state
  const [genelForm, setGenelForm] = useState({
    platform_adi: 'AURA İntegra',
    iletisim_email: 'destek@auraintegra.com',
    destek_tel: '0850 xxx xx xx',
    kdv_orani: '18',
    deneme_suresi: '30',
  })

  // Bildirim state
  const [bildirimForm, setBildirimForm] = useState({
    odeme_hatirlama: '7',
    abonelik_uyari: '30',
    email_bildirim: true,
    sms_bildirim: false,
  })

  // Yeni plan form
  const [newPlan, setNewPlan] = useState({
    name: '', price: '', price_yearly: '', max_users: '3', max_branches: '1', features: ''
  })

  function showToast(type: 'success'|'error', msg: string) {
    setToast({ type, msg })
    setTimeout(() => setToast(null), 3000)
  }

  useEffect(() => {
    fetchPlans()
    fetchStats()
    fetch('/api/admin/platform-settings', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(json => {
        const s = json.settings as Record<string, unknown> | undefined
        if (s?.platform_adi) setGenelForm(g => ({ ...g, platform_adi: String(s.platform_adi) }))
        if (s?.iletisim_email) setGenelForm(g => ({ ...g, iletisim_email: String(s.iletisim_email) }))
        if (s?.deneme_suresi) setGenelForm(g => ({ ...g, deneme_suresi: String(s.deneme_suresi) }))
        if (s?.odeme_hatirlama) setBildirimForm(b => ({ ...b, odeme_hatirlama: String(s.odeme_hatirlama) }))
        if (s?.email_bildirim != null) setBildirimForm(b => ({ ...b, email_bildirim: !!s.email_bildirim }))
      })
      .catch(() => {})
    fetch('/api/admin/audit-logs?limit=20', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(json => setAuditLogs(json.data ?? []))
      .catch(() => {})
  }, [])

  async function fetchPlans() {
    try {
      const res = await fetch('/api/admin/plans', { credentials: 'same-origin' })
      const json = await res.json()
      if (res.ok && json.data?.length > 0) {
        setPlans(json.data.map((p: Plan & { price_yearly?: number }) => ({
          ...p,
          price_yearly: p.price_yearly ?? p.price * 10,
          features: Array.isArray(p.features) ? p.features : [],
        })))
      }
    } catch { /* mock data kullan */ }
  }

  async function fetchStats() {
    try {
      const res = await fetch('/api/admin/stats', { credentials: 'same-origin' })
      const json = await res.json()
      if (res.ok) {
        setStats({ tenants: json.tenants ?? 0, users: json.users ?? 0, basvurular: json.basvurular ?? 0 })
      }
    } catch {}
  }

  async function savePlan(plan: Plan) {
    setLoading(true)
    try {
      const featArr = Array.isArray(plan.features)
        ? plan.features
        : String(plan.features).split(',').map((f: string) => f.trim()).filter(Boolean)

      const res = await fetch('/api/admin/plans', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: plan.id,
          updates: {
            name: plan.name,
            price: plan.price,
            max_users: plan.max_users,
            max_branches: plan.max_branches,
            features: featArr,
          },
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Kayıt hatası')
      showToast('success', `"${plan.name}" paketi kaydedildi — anasayfa güncellenecek`)
      setEditingPlan(null)
      fetchPlans()
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'Kayıt hatası')
    } finally { setLoading(false) }
  }

  async function createPlan() {
    setLoading(true)
    try {
      const payload = {
        name: newPlan.name,
        price: Number(newPlan.price),
        price_yearly: Number(newPlan.price_yearly) || Number(newPlan.price) * 10,
        max_users: Number(newPlan.max_users),
        max_branches: Number(newPlan.max_branches),
        features: newPlan.features.split(',').map(f => f.trim()).filter(Boolean),
        is_active: true,
      }
      const { error } = await (supabase.from('subscription_plans') as any).insert(payload)
      if (error) throw error
      showToast('success', 'Yeni paket oluşturuldu')
      setShowNewPlan(false)
      setNewPlan({ name: '', price: '', price_yearly: '', max_users: '3', max_branches: '1', features: '' })
      fetchPlans()
    } catch (e: any) {
      showToast('error', e.message || 'Oluşturma hatası')
    } finally { setLoading(false) }
  }

  async function togglePlanActive(plan: Plan) {
    if (plan.is_active) {
      showToast('error', 'En az bir vitrin paketi aktif kalmalı')
      return
    }
    try {
      const res = await fetch('/api/admin/plans', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_catalog', plan_id: plan.id }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error)
      setPlans(p => p.map(x => ({ ...x, is_active: x.id === plan.id })))
      showToast('success', `"${plan.name}" vitrin paketi olarak seçildi`)
    } catch (e: unknown) {
      showToast('error', e instanceof Error ? e.message : 'İşlem hatası')
    }
  }

  async function saveGenel() {
    const settings = {
      platform_adi: genelForm.platform_adi,
      iletisim_email: genelForm.iletisim_email,
      destek_tel: genelForm.destek_tel,
      kdv_orani: genelForm.kdv_orani,
      deneme_suresi: genelForm.deneme_suresi,
      odeme_hatirlama: bildirimForm.odeme_hatirlama,
      abonelik_uyari: bildirimForm.abonelik_uyari,
      email_bildirim: bildirimForm.email_bildirim,
      sms_bildirim: bildirimForm.sms_bildirim,
    }
    const res = await fetch('/api/admin/platform-settings', {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    })
    if (!res.ok) { showToast('error', 'Kayıt başarısız'); return }
    showToast('success', 'Platform ayarları kaydedildi')
  }

  async function saveBildirim() {
    await saveGenel()
  }

  async function testDb() {
    try {
      await (supabase.from('subscription_plans') as any).select('id').limit(1)
      showToast('success', '✅ Veritabanı bağlantısı başarılı')
    } catch { showToast('error', '❌ Veritabanı bağlantı hatası') }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Sistem Ayarları</h1>
        <p className="text-slate-500 text-sm mt-1">Paketler, bildirimler ve sistem yapılandırması</p>
      </div>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3 rounded-xl shadow-lg border animate-fade-in-up
          ${toast.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-red-50 border-red-200 text-red-800'}`}>
          {toast.type === 'success' ? <CheckCircle size={18} /> : <XCircle size={18} />}
          {toast.msg}
        </div>
      )}

      {/* Tab bar */}
      <div className="mobile-scroll-tabs border-b border-slate-200 mb-6 md:mb-8">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex-shrink-0 flex items-center gap-2 px-3 sm:px-4 py-3 text-sm font-medium border-b-2 transition-all -mb-px whitespace-nowrap
              ${activeTab === id
                ? 'border-sky-600 text-sky-700'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              }`}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </div>

      {/* ── PAKET YÖNETİMİ ─────────────────────────────────────────────────── */}
      {activeTab === 'paketler' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h2 className="font-semibold text-slate-800">Abonelik Paketleri</h2>
              <p className="text-xs text-slate-500">Anasayfa fiyat ve özellikleri buradan güncellenir — vitrin paketi öne çıkar</p>
            </div>
          </div>

          {/* Yeni paket formu */}
          {showNewPlan && (
            <div className="card p-5 border-dashed border-sky-300 bg-sky-50/50">
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Plus size={16} className="text-sky-600" /> Yeni Paket Oluştur
              </h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="label">Paket Adı *</label>
                  <input className="input" placeholder="Pro Plus" value={newPlan.name} onChange={e => setNewPlan(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Aylık Fiyat (₺) *</label>
                  <input className="input" type="number" placeholder="890" value={newPlan.price} onChange={e => setNewPlan(p => ({ ...p, price: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Yıllık Fiyat (₺)</label>
                  <input className="input" type="number" placeholder="8900" value={newPlan.price_yearly} onChange={e => setNewPlan(p => ({ ...p, price_yearly: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Max Kullanıcı (-1=sınırsız)</label>
                  <input className="input" type="number" value={newPlan.max_users} onChange={e => setNewPlan(p => ({ ...p, max_users: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Max Şube (-1=sınırsız)</label>
                  <input className="input" type="number" value={newPlan.max_branches} onChange={e => setNewPlan(p => ({ ...p, max_branches: e.target.value }))} />
                </div>
              </div>
              <div className="mb-4">
                <label className="label">Özellikler (virgülle ayır)</label>
                <textarea className="input h-20 resize-none" placeholder="Servis Yönetimi, Stok Takibi, ..." value={newPlan.features} onChange={e => setNewPlan(p => ({ ...p, features: e.target.value }))} />
              </div>
              <div className="flex gap-3">
                <button onClick={createPlan} disabled={loading || !newPlan.name || !newPlan.price} className="btn-primary btn-sm">
                  {loading ? 'Kaydediliyor...' : 'Oluştur'}
                </button>
                <button onClick={() => setShowNewPlan(false)} className="btn-secondary btn-sm">İptal</button>
              </div>
            </div>
          )}

          {/* Plan kartları */}
          {plans.map(plan => (
            <div key={plan.id} className="card p-5">
              {editingPlan?.id === plan.id ? (
                // Edit mode
                <div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <label className="label">Paket Adı</label>
                      <input className="input" value={editingPlan.name} onChange={e => setEditingPlan(p => p ? { ...p, name: e.target.value } : p)} />
                    </div>
                    <div>
                      <label className="label">Aylık Fiyat (₺)</label>
                      <input className="input" type="number" value={editingPlan.price} onChange={e => setEditingPlan(p => p ? { ...p, price: Number(e.target.value) } : p)} />
                    </div>
                    <div>
                      <label className="label">Yıllık Fiyat (₺)</label>
                      <input className="input" type="number" value={editingPlan.price_yearly} onChange={e => setEditingPlan(p => p ? { ...p, price_yearly: Number(e.target.value) } : p)} />
                    </div>
                    <div>
                      <label className="label">Max Kullanıcı (-1=sınırsız)</label>
                      <input className="input" type="number" value={editingPlan.max_users} onChange={e => setEditingPlan(p => p ? { ...p, max_users: Number(e.target.value) } : p)} />
                    </div>
                    <div>
                      <label className="label">Max Şube (-1=sınırsız)</label>
                      <input className="input" type="number" value={editingPlan.max_branches} onChange={e => setEditingPlan(p => p ? { ...p, max_branches: Number(e.target.value) } : p)} />
                    </div>
                  </div>
                  <div className="mb-4">
                    <label className="label">Özellikler (virgülle ayır)</label>
                    <textarea
                      className="input h-20 resize-none"
                      value={Array.isArray(editingPlan.features) ? editingPlan.features.join(', ') : editingPlan.features}
                      onChange={e => setEditingPlan(p => p ? { ...p, features: e.target.value.split(',').map(f => f.trim()) } : p)}
                    />
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => savePlan(editingPlan)} disabled={loading} className="btn-primary btn-sm flex items-center gap-2">
                      <Save size={14} /> {loading ? 'Kaydediliyor...' : 'Kaydet'}
                    </button>
                    <button onClick={() => setEditingPlan(null)} className="btn-secondary btn-sm">İptal</button>
                  </div>
                </div>
              ) : (
                // View mode
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-bold text-slate-900">{plan.name}</h3>
                      <span className={`badge border ${plan.is_active ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-100 text-slate-500 border-slate-300'}`}>
                        {plan.is_active ? 'Vitrin Paketi' : 'Pasif'}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-2">
                      <span className="font-semibold text-sky-600">₺{plan.price}/ay</span>
                      <span className="text-slate-400">•</span>
                      <span className="font-semibold text-purple-600">₺{plan.price_yearly}/yıl</span>
                      <span className="text-slate-400">•</span>
                      <span>{plan.max_users === -1 ? 'Sınırsız' : plan.max_users} kullanıcı</span>
                      <span className="text-slate-400">•</span>
                      <span>{plan.max_branches === -1 ? 'Sınırsız' : plan.max_branches} şube</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(Array.isArray(plan.features) ? plan.features : []).map((f, i) => (
                        <span key={i} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{f}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                    <button onClick={() => setEditingPlan({ ...plan })} className="btn-ghost btn-sm p-2" title="Düzenle">
                      <Edit2 size={15} />
                    </button>
                    <button
                      onClick={() => togglePlanActive(plan)}
                      disabled={plan.is_active}
                      className={`btn-sm px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                        plan.is_active
                          ? 'bg-green-50 text-green-600 border-green-200 opacity-60 cursor-default'
                          : 'bg-sky-50 text-sky-600 border-sky-200 hover:bg-sky-100'
                      }`}
                    >
                      {plan.is_active ? 'Vitrin' : 'Vitrin Yap'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── GENEL AYARLAR ──────────────────────────────────────────────────── */}
      {activeTab === 'genel' && (
        <div className="card p-6 space-y-5 max-w-2xl">
          <h2 className="font-semibold text-slate-800 mb-4">Genel Ayarlar</h2>
          {[
            { key: 'platform_adi',    label: 'Platform Adı',          placeholder: 'AURA İntegra' },
            { key: 'iletisim_email',  label: 'İletişim E-postası',    placeholder: 'destek@auraintegra.com' },
            { key: 'destek_tel',      label: 'Destek Telefonu',       placeholder: '0850 xxx xx xx' },
            { key: 'kdv_orani',       label: 'KDV Oranı (%)',         placeholder: '18' },
            { key: 'deneme_suresi',   label: 'Deneme Süresi (gün)',   placeholder: '30' },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <label className="label">{label}</label>
              <input
                className="input"
                placeholder={placeholder}
                value={(genelForm as any)[key]}
                onChange={e => setGenelForm(f => ({ ...f, [key]: e.target.value }))}
              />
            </div>
          ))}
          <button onClick={saveGenel} className="btn-primary flex items-center gap-2">
            <Save size={16} /> Kaydet
          </button>
        </div>
      )}

      {/* ── BİLDİRİM AYARLARI ──────────────────────────────────────────────── */}
      {activeTab === 'bildirim' && (
        <div className="card p-6 space-y-6 max-w-2xl">
          <h2 className="font-semibold text-slate-800 mb-4">Bildirim Ayarları</h2>

          <div>
            <label className="label">Ödeme Hatırlatma (kaç gün önce)</label>
            <select className="select" value={bildirimForm.odeme_hatirlama} onChange={e => setBildirimForm(f => ({ ...f, odeme_hatirlama: e.target.value }))}>
              {['3', '7', '14', '30'].map(d => <option key={d} value={d}>{d} gün önce</option>)}
            </select>
          </div>

          <div>
            <label className="label">Abonelik Bitiş Uyarısı (kaç gün önce)</label>
            <input type="number" className="input" value={bildirimForm.abonelik_uyari} onChange={e => setBildirimForm(f => ({ ...f, abonelik_uyari: e.target.value }))} />
          </div>

          {[
            { key: 'email_bildirim', label: 'E-posta Bildirimleri', desc: 'Ödeme ve abonelik e-postaları gönder' },
            { key: 'sms_bildirim',   label: 'SMS Bildirimleri',     desc: 'SMS ile uyarı gönder (ek ücretli)' },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-3 border-b border-slate-100">
              <div>
                <p className="text-sm font-semibold text-slate-800">{label}</p>
                <p className="text-xs text-slate-500">{desc}</p>
              </div>
              <button
                onClick={() => setBildirimForm(f => ({ ...f, [key]: !(f as any)[key] }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  (bildirimForm as any)[key] ? 'bg-sky-600' : 'bg-slate-300'
                }`}
              >
                <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  (bildirimForm as any)[key] ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
          ))}

          <button onClick={saveBildirim} className="btn-primary flex items-center gap-2">
            <Save size={16} /> Kaydet
          </button>
        </div>
      )}

      {/* ── SİSTEM BİLGİSİ ─────────────────────────────────────────────────── */}
      {activeTab === 'sistem' && (
        <div className="space-y-4 max-w-2xl">
          <div className="card p-6">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Database size={18} className="text-sky-600" /> Sistem Bilgisi
            </h2>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Versiyon',       value: 'v1.0.0' },
                { label: 'Platform',       value: 'AURA İntegra ERP' },
                { label: 'Supabase URL',   value: process.env.NEXT_PUBLIC_SUPABASE_URL || '—' },
                { label: 'Toplam Bayi',    value: String(stats.tenants) },
                { label: 'Toplam Başvuru', value: String(stats.basvurular) },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center justify-between py-2 border-b border-slate-100">
                  <span className="text-slate-500">{label}</span>
                  <span className="font-medium text-slate-800 font-mono text-xs">{value}</span>
                </div>
              ))}
            </div>
            <button onClick={testDb} className="btn-secondary mt-4 flex items-center gap-2">
              <Database size={15} /> Veritabanını Test Et
            </button>
          </div>
          <div className="card p-6">
            <h2 className="font-semibold text-slate-800 mb-4">Son Admin İşlemleri (Audit Log)</h2>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {auditLogs.length === 0 ? (
                <p className="text-sm text-slate-400">Kayıt yok — migration 20260615 çalıştırın</p>
              ) : auditLogs.map(log => (
                <div key={log.created_at + log.action} className="text-xs border-b border-slate-100 py-2 flex justify-between gap-2">
                  <span className="font-mono text-slate-700">{log.action}</span>
                  <span className="text-slate-400 shrink-0">{new Date(log.created_at).toLocaleString('tr-TR')}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="card p-6" data-tour="admin-tour-restart">
            <h2 className="font-semibold text-slate-800 mb-2">Admin Turu</h2>
            <p className="text-sm text-slate-500 mb-4">Komuta merkezi ve bayi yönetimi turunu yeniden başlatır.</p>
            <button
              type="button"
              onClick={() => {
                requestAdminTourRestart()
                showToast('success', 'Admin turu yeniden başlatılıyor...')
              }}
              className="btn-secondary flex items-center gap-2"
            >
              <RotateCcw size={15} /> Turu Tekrar Başlat
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
