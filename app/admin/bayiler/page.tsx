'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import { Plus, Search, Filter, MoreHorizontal, X, Loader2, Building2, Check, Bell, Pencil, Trash2, PauseCircle } from 'lucide-react'
import { toast } from 'sonner'
import { formatDate, formatCurrency, TENANT_STATUS_COLORS, TENANT_STATUS_LABELS } from '@/lib/utils'
import type { Tenant, SubscriptionPlan } from '@/types/database'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const newTenantSchema = z.object({
  company_name:  z.string().min(2, 'En az 2 karakter'),
  contact_name:  z.string().min(2, 'En az 2 karakter'),
  email:         z.string().email('Geçerli email girin'),
  phone:         z.string().min(10, 'Geçerli telefon girin'),
  city:          z.string().min(2, 'Şehir gerekli'),
  plan_id:       z.string().min(1, 'Paket seçin'),
  password:      z.string().min(8, 'En az 8 karakter'),
})

type NewTenantForm = z.infer<typeof newTenantSchema>

const STATUS_OPTIONS = ['', 'active', 'trial', 'passive', 'suspended']

// ─── Abonelik bitiş tarihi renk kodu ────────────────────────────────────────
function getExpiryStatus(endDate: string) {
  const end = new Date(endDate)
  const now = new Date()
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  if (diff < 0)  return { label: 'Süresi Dolmuş', color: 'text-red-400 bg-red-500/10 border-red-500/20' }
  if (diff <= 7) return { label: `${diff} gün kaldı`, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' }
  return { label: end.toLocaleDateString('tr-TR'), color: 'text-green-400 bg-green-500/10 border-green-500/20' }
}

export default function BayilerPage() {
  const [tenants, setTenants] = useState<(Tenant & { _user_count?: number })[]>([])
  const [plans,   setPlans]   = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [fetchError, setFetchError] = useState('')
  const [search,  setSearch]  = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [planFilter,   setPlanFilter]   = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savingSubscription, setSavingSubscription] = useState(false)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement | null>(null)

  // Drawer'daki abonelik form state'leri
  const [subStart, setSubStart] = useState('')
  const [subEnd,   setSubEnd]   = useState('')
  const [subPlanId, setSubPlanId] = useState('')
  const [subStatus, setSubStatus] = useState('')
  const [tenantHealth, setTenantHealth] = useState<{ active_users: number; orders_30d: number; revenue_30d: number; overdue_payments: number } | null>(null)
  const [resetPassword, setResetPassword] = useState('')
  const [featureFlags, setFeatureFlags] = useState({ sms: true, portal: true, whatsapp: false, efatura: false })

  const { register, handleSubmit, reset, formState: { errors } } = useForm<NewTenantForm>({
    resolver: zodResolver(newTenantSchema),
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    setFetchError('')
    try {
      const [tenantsRes, plansRes] = await Promise.all([
        fetch('/api/tenants', { credentials: 'same-origin' }),
        fetch('/api/admin/plans', { credentials: 'same-origin' }),
      ])

      const tenantsJson = await tenantsRes.json()
      const plansJson = await plansRes.json()

      if (!tenantsRes.ok) {
        throw new Error(tenantsJson.error || 'Bayiler yüklenemedi')
      }

      setTenants(tenantsJson.data || [])

      const planData =
        plansJson.data && plansJson.data.length > 0
          ? plansJson.data
          : [
              { id: '00000000-0000-0000-0000-000000000001', name: 'Stok & Satış', price: 450, max_users: 3, max_branches: 1, is_active: true, features: ['Stok', 'Satış & POS', 'Müşteriler', 'Fatura'] },
              { id: '00000000-0000-0000-0000-000000000002', name: 'Teknik Servis', price: 750, max_users: 6, max_branches: 2, is_active: false, features: ['Stok & Satış', 'Teknik Servis', 'Garanti', 'Randevu'] },
              { id: '00000000-0000-0000-0000-000000000003', name: 'Finans & Analitik', price: 1200, max_users: 12, max_branches: 5, is_active: false, features: ['Tüm Modüller', 'Finans', 'Raporlar', 'Analitik'] },
            ]
      setPlans(planData)
    } catch (e) {
      console.error('fetchData error:', e)
      const msg = e instanceof Error ? e.message : 'Veri yüklenemedi'
      setFetchError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  // Dropdown menüyü dışarı tıklayınca kapat
  useEffect(() => {
    if (!openMenuId) return
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [openMenuId])

  const handleEdit = (t: Tenant) => {
    setOpenMenuId(null)
    setSelectedTenant(t)
    setDrawerOpen(true)
  }

  const handleDelete = async (t: Tenant) => {
    setOpenMenuId(null)
    if (!confirm(`"${t.company_name}" bayisini ve tüm ödeme kayıtlarını kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.`)) {
      return
    }
    setDeletingId(t.id)
    try {
      const res = await fetch(`/api/admin/tenant?id=${encodeURIComponent(t.id)}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Silme başarısız')
      toast.success(`${t.company_name} silindi`)
      fetchData()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Silme başarısız')
    } finally {
      setDeletingId(null)
    }
  }

  // Drawer açıldığında state'leri doldur
  useEffect(() => {
    if (selectedTenant) {
      setSubStart(selectedTenant.subscription_start || '')
      setSubEnd(selectedTenant.subscription_end || '')
      setSubPlanId(selectedTenant.plan_id || '')
      setSubStatus(selectedTenant.status || '')
      fetch(`/api/admin/tenant-health?tenant_id=${selectedTenant.id}`, { credentials: 'same-origin' })
        .then(r => r.json())
        .then(json => {
          setTenantHealth(json.health ?? null)
          const flags = json.tenant?.feature_flags as typeof featureFlags | undefined
          if (flags) setFeatureFlags({ ...featureFlags, ...flags })
        })
        .catch(() => setTenantHealth(null))
    }
  }, [selectedTenant])

  const filteredTenants = tenants.filter(t => {
    const matchSearch = !search ||
      t.company_name.toLowerCase().includes(search.toLowerCase()) ||
      t.email.toLowerCase().includes(search.toLowerCase()) ||
      t.city?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = !statusFilter || t.status === statusFilter
    const matchPlan   = !planFilter   || t.plan_id === planFilter
    return matchSearch && matchStatus && matchPlan
  })

  const onSubmit = async (data: NewTenantForm) => {
    setSaving(true)
    try {
      // Tüm işlem server-side API'de yapılıyor (service role key gerektirir)
      const res = await fetch('/api/admin/tenant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error || 'Bayi oluşturulamadı')
      }

      toast.success(`${data.company_name} başarıyla eklendi!`)
      setShowModal(false)
      reset()
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Bir hata oluştu')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (tenantId: string, status: string) => {
    const actionMap: Record<string, string> = {
      active: 'activate',
      passive: 'deactivate',
      suspended: 'suspend',
      trial: 'renew_trial',
    }
    const action = actionMap[status]
    const body = action
      ? { id: tenantId, action }
      : { id: tenantId, status }

    const res = await fetch('/api/admin/tenant', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const result = await res.json()
    if (!res.ok) { toast.error(result.error || 'Güncelleme başarısız'); return }
    toast.success(
      status === 'active' ? 'Bayi aktifleştirildi — abonelik uzatıldı' :
      status === 'passive' ? 'Bayi pasife alındı — panel kapatıldı' :
      status === 'suspended' ? 'Bayi askıya alındı' :
      status === 'trial' ? '30 gün deneme başlatıldı' :
      'Durum güncellendi'
    )
    setSubStatus(status)
    setSelectedTenant(prev => prev ? { ...prev, status: status as Tenant['status'] } : prev)
    fetchData()
  }

  const saveSubscription = async () => {
    if (!selectedTenant) return
    setSavingSubscription(true)
    try {
      const res = await fetch('/api/admin/tenant', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedTenant.id,
          subscription_start: subStart || null,
          subscription_end:   subEnd || null,
          plan_id:            subPlanId || null,
          status:             subStatus,
        }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Kayıt başarısız')

      toast.success('Abonelik bilgileri kaydedildi')
      setSelectedTenant(prev => prev
        ? { ...prev, subscription_start: subStart, subscription_end: subEnd, plan_id: subPlanId, status: subStatus as any }
        : prev
      )
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Kayıt başarısız')
    } finally {
      setSavingSubscription(false)
    }
  }

  const sendPaymentReminder = async (tenantId: string) => {
    try {
      const res = await fetch('/api/admin/remind-payment', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenantId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Gönderilemedi')
      toast.success('Ödeme hatırlatıcısı e-posta ile gönderildi')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Hatırlatıcı gönderilemedi')
    }
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white text-2xl font-black">Bayi Yönetimi</h1>
          <p className="text-zinc-500 text-sm mt-1">{tenants.length} bayi kayıtlı</p>
        </div>
        <button onClick={() => { setShowModal(true); reset() }} className="btn-primary">
          <Plus size={16} /> Yeni Bayi Ekle
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-56">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Bayi, email, şehir ara..."
            className="input pl-8 h-9 text-sm"
          />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="select h-9 text-sm w-36">
          <option value="">Tüm Durumlar</option>
          <option value="active">Aktif</option>
          <option value="trial">Deneme</option>
          <option value="passive">Pasif</option>
          <option value="suspended">Askıda</option>
        </select>
        <select value={planFilter} onChange={e => setPlanFilter(e.target.value)} className="select h-9 text-sm w-36">
          <option value="">Tüm Paketler</option>
          {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin text-sky-400" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr>
                  <th>Bayi</th>
                  <th>Paket</th>
                  <th>Şehir</th>
                  <th>Durum</th>
                  <th>Başlangıç</th>
                  <th>Bitiş</th>
                  <th>Ödeme</th>
                  <th>Kayıt</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map(t => {
                  const plan = t.subscription_plans as any
                  const expiryStatus = t.subscription_end ? getExpiryStatus(t.subscription_end) : null
                  const isExpiringSoon = expiryStatus && (
                    expiryStatus.color.includes('red') || expiryStatus.color.includes('amber')
                  )
                  return (
                    <tr
                      key={t.id}
                      className="cursor-pointer"
                      onClick={() => { setSelectedTenant(t); setDrawerOpen(true) }}
                    >
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-sky-500/20 border border-sky-500/30 rounded-lg flex items-center justify-center">
                            <span className="text-sky-400 font-bold text-xs">
                              {t.company_name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-semibold text-white">{t.company_name}</p>
                            <p className="text-xs text-zinc-500">{t.email}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="badge border bg-sky-500/10 text-sky-400 border-sky-500/20">
                          {plan?.name ?? '—'}
                        </span>
                      </td>
                      <td className="text-zinc-400">{t.city || '—'}</td>
                      <td>
                        <span className={`badge border ${TENANT_STATUS_COLORS[t.status]}`}>
                          {TENANT_STATUS_LABELS[t.status]}
                        </span>
                      </td>
                      <td className="font-mono text-zinc-400 text-xs">
                        {t.subscription_start ? formatDate(t.subscription_start) : '—'}
                      </td>
                      <td>
                        {expiryStatus ? (
                          <span className={`badge border text-xs ${expiryStatus.color}`}>
                            {expiryStatus.label}
                          </span>
                        ) : (
                          <span className="text-zinc-600">—</span>
                        )}
                      </td>
                      <td onClick={e => e.stopPropagation()}>
                        {isExpiringSoon ? (
                          <button
                            onClick={() => sendPaymentReminder(t.id)}
                            className="btn-ghost btn-sm p-1.5 text-amber-400 hover:text-amber-300"
                            title="Ödeme Hatırlatıcı Gönder"
                          >
                            <Bell size={14} />
                          </button>
                        ) : (
                          <span className="text-zinc-700 text-xs px-2">—</span>
                        )}
                      </td>
                      <td className="font-mono text-zinc-500 text-xs">{formatDate(t.created_at)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <div className="relative">
                          <button
                            className="btn-ghost btn-sm p-1.5"
                            disabled={deletingId === t.id}
                            onClick={() => setOpenMenuId(openMenuId === t.id ? null : t.id)}
                          >
                            {deletingId === t.id
                              ? <Loader2 size={14} className="animate-spin" />
                              : <MoreHorizontal size={14} />}
                          </button>
                          {openMenuId === t.id && (
                            <div
                              ref={menuRef}
                              className="absolute right-0 top-full mt-1 w-44 bg-[#18181b] border border-[#27272a] rounded-lg shadow-xl z-30 py-1 animate-fade-in-up"
                            >
                              <button
                                onClick={() => handleEdit(t)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <Pencil size={14} className="text-sky-400" /> Düzenle
                              </button>
                              {t.status !== 'passive' && (
                                <button
                                  onClick={() => { setOpenMenuId(null); updateStatus(t.id, 'passive') }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                  <PauseCircle size={14} className="text-amber-400" /> Pasif Al
                                </button>
                              )}
                              {t.status === 'passive' && (
                                <button
                                  onClick={() => { setOpenMenuId(null); updateStatus(t.id, 'active') }}
                                  className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-zinc-300 hover:bg-white/5 hover:text-white transition-colors"
                                >
                                  <Check size={14} className="text-emerald-400" /> Aktif Yap
                                </button>
                              )}
                              <div className="h-px bg-[#27272a] my-1" />
                              <button
                                onClick={() => handleDelete(t)}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 size={14} /> Sil
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {fetchError ? (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-red-400">
                      {fetchError}
                      <button type="button" onClick={fetchData} className="block mx-auto mt-3 text-sky-400 text-sm hover:underline">
                        Tekrar dene
                      </button>
                    </td>
                  </tr>
                ) : filteredTenants.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-10 text-zinc-500">
                      <Building2 size={32} className="mx-auto mb-2 opacity-30" />
                      Bayi bulunamadı
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Yeni Bayi Modal ────────────────────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="text-white font-bold flex items-center gap-2">
                <Plus size={18} className="text-sky-400" /> Yeni Bayi Ekle
              </h2>
              <button onClick={() => setShowModal(false)} className="btn-ghost btn-sm p-1.5">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="modal-body space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { name: 'company_name',  label: 'Firma Adı',       placeholder: 'Teknik Servis A.Ş.' },
                    { name: 'contact_name',  label: 'Yetkili Adı',     placeholder: 'Mehmet Yılmaz' },
                    { name: 'email',         label: 'E-posta',         placeholder: 'info@firma.com' },
                    { name: 'phone',         label: 'Telefon',         placeholder: '05xx xxx xx xx' },
                    { name: 'city',          label: 'Şehir',           placeholder: 'İstanbul' },
                    { name: 'password',      label: 'Başlangıç Şifresi', placeholder: '••••••••' },
                  ].map(f => (
                    <div key={f.name}>
                      <label className="label">{f.label}</label>
                      <input
                        {...register(f.name as keyof NewTenantForm)}
                        placeholder={f.placeholder}
                        type={f.name === 'password' ? 'password' : f.name === 'email' ? 'email' : 'text'}
                        className={`input ${errors[f.name as keyof NewTenantForm] ? 'input-error' : ''}`}
                      />
                      {errors[f.name as keyof NewTenantForm] && (
                        <p className="text-red-400 text-xs mt-1">{errors[f.name as keyof NewTenantForm]?.message}</p>
                      )}
                    </div>
                  ))}
                </div>

                <div>
                  <label className="label">Abonelik Paketi</label>
                  <select {...register('plan_id')} className={`select ${errors.plan_id ? 'input-error' : ''}`}>
                    <option value="">Paket Seçin...</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatCurrency(p.price)}/ay
                      </option>
                    ))}
                  </select>
                  {errors.plan_id && <p className="text-red-400 text-xs mt-1">{errors.plan_id.message}</p>}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn-secondary">İptal</button>
                <button type="submit" disabled={saving} className="btn-primary">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  {saving ? 'Kaydediliyor...' : 'Bayiyi Kaydet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Detay Drawer ──────────────────────────────────────────────────── */}
      {drawerOpen && selectedTenant && (
        <>
          <div className="drawer-overlay opacity-100" onClick={() => setDrawerOpen(false)} />
          <div className="drawer-panel animate-slide-in-right">
            <div className="sticky top-0 bg-[#111113] border-b border-[#27272a] p-5 flex items-center justify-between z-10">
              <div>
                <p className="text-white font-bold">{selectedTenant.company_name}</p>
                <p className="text-zinc-500 text-xs">{selectedTenant.email}</p>
              </div>
              <button onClick={() => setDrawerOpen(false)} className="btn-ghost btn-sm p-1.5">
                <X size={16} />
              </button>
            </div>

            <div className="p-5 space-y-5 overflow-y-auto">
              {/* Plan & Status bilgileri */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Durum', value: <span className={`badge border ${TENANT_STATUS_COLORS[selectedTenant.status]}`}>{TENANT_STATUS_LABELS[selectedTenant.status]}</span> },
                  { label: 'Paket', value: (selectedTenant.subscription_plans as any)?.name || '—' },
                  { label: 'Şehir', value: selectedTenant.city || '—' },
                  { label: 'Telefon', value: selectedTenant.phone || '—' },
                  { label: 'Abonelik Başlangıç', value: selectedTenant.subscription_start ? formatDate(selectedTenant.subscription_start) : '—' },
                  {
                    label: 'Abonelik Bitiş',
                    value: selectedTenant.subscription_end
                      ? (() => {
                          const exp = getExpiryStatus(selectedTenant.subscription_end)
                          return <span className={`badge border text-xs ${exp.color}`}>{exp.label}</span>
                        })()
                      : '—'
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="bg-[#18181b] border border-[#27272a] rounded-lg p-3">
                    <p className="text-zinc-500 text-xs mb-1">{label}</p>
                    <p className="text-white text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>

              {tenantHealth && (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Aktif Kullanıcı', value: tenantHealth.active_users },
                    { label: 'Servis (30g)', value: tenantHealth.orders_30d },
                    { label: 'Ciro (30g)', value: formatCurrency(tenantHealth.revenue_30d) },
                    { label: 'Gecikmiş Ödeme', value: tenantHealth.overdue_payments },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-sky-500/10 border border-sky-500/20 rounded-lg p-3">
                      <p className="text-sky-400/70 text-xs mb-1">{label}</p>
                      <p className="text-white text-sm font-bold">{value}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-3 space-y-2">
                <p className="text-zinc-500 text-xs">Modül bayrakları</p>
                {(['sms', 'portal', 'whatsapp', 'efatura'] as const).map(key => (
                  <label key={key} className="flex items-center justify-between text-sm text-zinc-300">
                    <span className="capitalize">{key}</span>
                    <input type="checkbox" checked={featureFlags[key]} onChange={e => setFeatureFlags(f => ({ ...f, [key]: e.target.checked }))} />
                  </label>
                ))}
                <button
                  type="button"
                  className="btn-secondary text-xs w-full mt-2"
                  onClick={async () => {
                    const res = await fetch('/api/admin/feature-flags', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ tenant_id: selectedTenant.id, feature_flags: featureFlags }),
                    })
                    if (res.ok) toast.success('Bayraklar kaydedildi')
                    else toast.error('Kayıt başarısız')
                  }}
                >
                  Bayrakları Kaydet
                </button>
                <Link href={`/admin/bayiler/preview/${selectedTenant.id}`} className="btn-ghost text-xs w-full block text-center mt-1">
                  Bayi Önizleme →
                </Link>
              </div>

              <div className="bg-[#18181b] border border-[#27272a] rounded-lg p-3 space-y-2">
                <p className="text-zinc-500 text-xs">Admin şifre sıfırlama</p>
                <div className="flex gap-2">
                  <input type="password" className="input flex-1" placeholder="Yeni şifre (min 8)" value={resetPassword} onChange={e => setResetPassword(e.target.value)} />
                  <button
                    type="button"
                    className="btn-secondary text-xs shrink-0"
                    onClick={async () => {
                      if (resetPassword.length < 8) { toast.error('Min 8 karakter'); return }
                      const res = await fetch('/api/admin/update-password', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ email: selectedTenant.email, password: resetPassword }),
                      })
                      const json = await res.json()
                      if (!res.ok) { toast.error(json.error || 'Başarısız'); return }
                      toast.success('Şifre güncellendi')
                      setResetPassword('')
                    }}
                  >
                    Sıfırla
                  </button>
                </div>
              </div>

              {/* ── Abonelik Yönetimi Kartı ─────────────────────────────────── */}
              <div className="bg-[#111113] border border-[#27272a] rounded-xl p-4 space-y-4">
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  📅 Abonelik Yönetimi
                </h4>

                {/* Tarih alanları */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label">Başlangıç Tarihi</label>
                    <input
                      type="date"
                      className="input"
                      value={subStart}
                      onChange={e => setSubStart(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="label">Bitiş Tarihi</label>
                    <input
                      type="date"
                      className="input"
                      value={subEnd}
                      onChange={e => setSubEnd(e.target.value)}
                    />
                  </div>
                </div>

                {/* Paket seçimi */}
                <div>
                  <label className="label">Paket</label>
                  <select
                    className="select"
                    value={subPlanId}
                    onChange={e => setSubPlanId(e.target.value)}
                  >
                    <option value="">Paket seçin...</option>
                    {plans.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} — {formatCurrency(p.price)}/ay
                      </option>
                    ))}
                  </select>
                </div>

                {/* Durum butonları */}
                <div className="space-y-2">
                  <label className="label">Durum</label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { val: 'active',    label: 'Aktif' },
                      { val: 'passive',   label: 'Pasif' },
                      { val: 'trial',     label: 'Deneme' },
                      { val: 'suspended', label: 'Askıya Alındı' },
                    ].map(s => (
                      <button
                        key={s.val}
                        onClick={() => setSubStatus(s.val)}
                        className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                          subStatus === s.val
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-transparent text-zinc-400 border-zinc-600 hover:border-sky-500 hover:text-sky-300'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Kaydet butonu */}
                <button
                  onClick={saveSubscription}
                  disabled={savingSubscription}
                  className="btn-primary w-full"
                >
                  {savingSubscription
                    ? <><Loader2 size={14} className="animate-spin" /> Kaydediliyor...</>
                    : <><Check size={14} /> Aboneliği Kaydet</>
                  }
                </button>

                {/* Ödeme hatırlatıcı */}
                <button
                  onClick={() => sendPaymentReminder(selectedTenant.id)}
                  className="btn-secondary w-full flex items-center justify-center gap-2"
                >
                  <Bell size={14} /> Ödeme Hatırlatıcı Gönder
                </button>
              </div>

              {/* Durum Değiştir (hızlı erişim) */}
              <div>
                <p className="label mb-3">Hızlı Durum Değiştir</p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { val: 'active',    label: 'Aktif Yap',      cls: 'btn-primary' },
                    { val: 'trial',     label: 'Denemeye Al',    cls: 'btn-secondary' },
                    { val: 'passive',   label: 'Pasife Al',      cls: 'btn-secondary' },
                    { val: 'suspended', label: 'Askıya Al',      cls: 'btn-danger' },
                  ].map(b => (
                    <button
                      key={b.val}
                      onClick={() => updateStatus(selectedTenant.id, b.val)}
                      disabled={selectedTenant.status === b.val}
                      className={`btn btn-sm ${b.cls} disabled:opacity-30`}
                    >
                      {b.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
