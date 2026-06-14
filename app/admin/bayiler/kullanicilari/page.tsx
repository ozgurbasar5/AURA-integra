'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, Trash2, Mail, Shield, Search, ChevronDown, Building2, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'

const ROLES = [
  { value: 'owner',      label: 'Sahip',      color: 'bg-purple-100 text-purple-700' },
  { value: 'manager',    label: 'Yönetici',   color: 'bg-blue-100 text-blue-700'   },
  { value: 'staff',      label: 'Personel',   color: 'bg-slate-100 text-slate-700'  },
  { value: 'technician', label: 'Teknisyen',  color: 'bg-green-100 text-green-700' },
  { value: 'cashier',    label: 'Kasiyer',    color: 'bg-amber-100 text-amber-700' },
]

interface Tenant { id: string; company_name: string; portal_slug: string | null }
interface TenantUser {
  id: string
  user_id: string
  role: string
  is_active: boolean
  full_name: string
  email: string
  created_at: string
}

export default function BayiKullanicilariPage() {
  const supabase = createClient()

  const [tenants, setTenants]           = useState<Tenant[]>([])
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [users, setUsers]               = useState<TenantUser[]>([])
  const [loadingTenants, setLoadingTenants] = useState(true)
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [searchEmail, setSearchEmail]   = useState('')
  const [newEmail, setNewEmail]         = useState('')
  const [newRole, setNewRole]           = useState('staff')
  const [adding, setAdding]             = useState(false)
  const [maxUsers, setMaxUsers]         = useState(99)

  // ── Load tenants ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function load() {
      setLoadingTenants(true)
      try {
        const res = await fetch('/api/tenants', { credentials: 'same-origin' })
        const json = await res.json()
        if (res.ok && json.data) {
          setTenants(
            json.data.map((t: { id: string; company_name: string; portal_slug?: string | null }) => ({
              id: t.id,
              company_name: t.company_name,
              portal_slug: t.portal_slug ?? null,
            }))
          )
        }
      } catch { /* ignore */ } finally {
        setLoadingTenants(false)
      }
    }
    load()
  }, [])

  // ── Load users for selected tenant ───────────────────────────────────────
  useEffect(() => {
    if (!selectedTenant) return
    async function loadUsers() {
      setLoadingUsers(true)
      try {
        const res = await fetch(
          `/api/admin/users?tenant_id=${encodeURIComponent(selectedTenant!.id)}`,
          { credentials: 'same-origin' }
        )
        const json = await res.json()
        if (res.ok && json.data) {
          setUsers(json.data)
          if (json.limits?.max_users) setMaxUsers(json.limits.max_users)
        }
      } catch (e) {
        console.error('loadUsers error:', e)
      } finally {
        setLoadingUsers(false)
      }
    }
    loadUsers()
  }, [selectedTenant])

  // ── Change role ───────────────────────────────────────────────────────────
  async function changeRole(userId: string, role: string) {
    try {
      await (supabase.from('user_profiles') as any)
        .update({ role })
        .eq('id', userId)
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, role } : u))
      toast.success('Rol güncellendi')
    } catch { toast.error('Güncellenemedi') }
  }

  // ── Toggle active ─────────────────────────────────────────────────────────
  async function toggleActive(userId: string, current: boolean) {
    try {
      await (supabase.from('user_profiles') as any)
        .update({ is_active: !current })
        .eq('id', userId)
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, is_active: !current } : u))
      toast.success(current ? 'Kullanıcı pasife alındı' : 'Kullanıcı aktif edildi')
    } catch { toast.error('Güncellenemedi') }
  }

  // ── Add user — /api/admin/find-user (service role → auth.users) ──────────
  async function addUser() {
    if (!newEmail.trim() || !selectedTenant) return
    setAdding(true)
    try {
      const res  = await fetch(`/api/admin/find-user?email=${encodeURIComponent(newEmail.trim().toLowerCase())}`)
      const json = await res.json()

      if (!res.ok) {
        toast.error(
          res.status === 404
            ? `"${newEmail}" sistemde kayıtlı değil. Supabase → Authentication → Users'dan kontrol edin.`
            : `Hata: ${json.error || 'Sunucu hatası'}`
        )
        return
      }

      const activeCount = users.filter(u => u.is_active).length
      if (activeCount >= maxUsers) {
        toast.error(`Paket limiti: en fazla ${maxUsers} aktif kullanıcı. Plan yükseltin veya pasif kullanıcı silin.`)
        return
      }

      const found = json.user as { id: string; email: string; profile?: { full_name?: string } | null }

      await (supabase.from('user_profiles') as any).upsert({
        id:        found.id,
        full_name: found.profile?.full_name ?? found.email.split('@')[0],
        role:      newRole,
        tenant_id: selectedTenant.id,
        is_active: true,
      }, { onConflict: 'id' })

      setUsers(prev => [
        ...prev,
        {
          id: found.id, user_id: found.id, role: newRole, is_active: true,
          full_name: found.profile?.full_name || found.email.split('@')[0],
          email: found.email,
          created_at: new Date().toISOString(),
        }
      ])
      toast.success(`✓ ${found.email} → ${selectedTenant.company_name} bayisine eklendi`)
      setShowAddModal(false)
      setNewEmail('')
      setNewRole('staff')
    } catch (e: any) {
      toast.error('Beklenmeyen hata: ' + (e.message || String(e)))
    } finally {
      setAdding(false)
    }
  }


  const filteredUsers = users.filter(u =>
    u.full_name.toLowerCase().includes(searchEmail.toLowerCase()) ||
    u.email.toLowerCase().includes(searchEmail.toLowerCase())
  )

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users size={20} style={{ color: 'var(--accent)' }} />
            Bayi Kullanıcıları
          </h1>
          <p className="text-slate-500 text-sm mt-0.5">
            Her bayiye birden fazla kullanıcı atayın — aynı anda birlikte çalışabilirler
          </p>
        </div>
      </div>

      {/* Tenant Selector */}
      <div className="card p-5">
        <label className="label">Bayi Seçin</label>
        {loadingTenants ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm"><Loader2 size={16} className="animate-spin" /> Yükleniyor...</div>
        ) : (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {tenants.map(t => (
              <button
                key={t.id}
                onClick={() => setSelectedTenant(t)}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                  selectedTenant?.id === t.id
                    ? 'text-white border-transparent'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
                style={selectedTenant?.id === t.id ? { backgroundColor: 'var(--accent)', borderColor: 'var(--accent)' } : {}}
              >
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-bold text-sm ${
                  selectedTenant?.id === t.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}>
                  {t.company_name[0]}
                </div>
                <div className="min-w-0">
                  <p className={`text-sm font-semibold truncate ${selectedTenant?.id === t.id ? 'text-white' : 'text-slate-900'}`}>
                    {t.company_name}
                  </p>
                  {t.portal_slug && (
                    <p className={`text-xs truncate ${selectedTenant?.id === t.id ? 'text-white/70' : 'text-slate-400'}`}>
                      {t.portal_slug}
                    </p>
                  )}
                </div>
                {selectedTenant?.id === t.id && <Check size={16} className="ml-auto text-white flex-shrink-0" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Users Panel */}
      {selectedTenant && (
        <div className="card overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <h2 className="font-semibold text-slate-900">
                {selectedTenant.company_name} — Kullanıcılar
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">{users.length} kullanıcı kayıtlı</p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={searchEmail}
                  onChange={e => setSearchEmail(e.target.value)}
                  placeholder="Ad veya e-posta..."
                  className="input pl-8 text-sm py-2 w-48"
                />
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="btn-primary btn-sm gap-1.5"
                style={{ backgroundColor: 'var(--accent)' }}
              >
                <Plus size={13} /> Kullanıcı Ekle
              </button>
            </div>
          </div>

          {loadingUsers ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-slate-400" />
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="text-center py-12">
              <Users size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 font-medium">Bu bayiye henüz kullanıcı eklenmemiş</p>
              <p className="text-slate-400 text-sm mt-1">Kullanıcı eklemek için yukarıdaki butonu kullanın</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  {['Kullanıcı', 'E-posta', 'Rol', 'Durum', 'Katılım', 'İşlemler'].map(h => (
                    <th key={h} className="text-left text-[10px] font-semibold text-slate-500 uppercase tracking-wide px-5 py-3">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map(u => {
                  const roleInfo = ROLES.find(r => r.value === u.role)
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0"
                            style={{ backgroundColor: 'var(--accent)' }}>
                            {u.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                          </div>
                          <span className="text-sm font-medium text-slate-900">{u.full_name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-sm text-slate-600">{u.email}</span>
                      </td>
                      <td className="px-5 py-3">
                        <select
                          value={u.role}
                          onChange={e => changeRole(u.user_id, e.target.value)}
                          className={`text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer ${roleInfo?.color ?? 'bg-slate-100 text-slate-700'}`}
                        >
                          {ROLES.map(r => (
                            <option key={r.value} value={r.value}>{r.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => toggleActive(u.user_id, u.is_active)}
                          className={`relative w-10 h-5 rounded-full transition-all`}
                          style={u.is_active ? { backgroundColor: 'var(--accent)' } : { backgroundColor: '#e2e8f0' }}
                        >
                          <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${u.is_active ? 'left-5' : 'left-0.5'}`} />
                        </button>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400">
                        {new Date(u.created_at).toLocaleDateString('tr-TR')}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          onClick={() => {
                            // Remove from tenant (set tenant_id to null)
                            supabase.from('user_profiles' as any)
                              .update({ tenant_id: null })
                              .eq('id', u.user_id)
                              .then(() => {
                                setUsers(prev => prev.filter(x => x.user_id !== u.user_id))
                                toast.success('Kullanıcı bayiden çıkarıldı')
                              })
                          }}
                          className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Bayiden çıkar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
            <h3 className="font-bold text-slate-900 text-lg mb-1">Kullanıcı Ekle</h3>
            <p className="text-sm text-slate-500 mb-5">
              <strong>{selectedTenant?.company_name}</strong> bayisine kullanıcı ekleyin.
              Supabase'de kayıtlı herhangi bir kullanıcı e-postası girilebilir.
            </p>
            <div className="space-y-4">
              <div>
                <label className="label">E-posta Adresi *</label>
                <div className="relative">
                  <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    type="email"
                    placeholder="ornek@sirket.com"
                    className="input pl-9"
                    onKeyDown={e => e.key === 'Enter' && addUser()}
                  />
                </div>
              </div>
              <div>
                <label className="label">Rol</label>
                <select value={newRole} onChange={e => setNewRole(e.target.value)} className="select">
                  {ROLES.map(r => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                <p className="text-xs text-slate-400 mt-1.5">
                  Sahip: Tam erişim • Yönetici: Kullanıcı yönetimi hariç tüm özellikler • Personel: Servis ve stok
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowAddModal(false); setNewEmail(''); setNewRole('staff') }}
                className="flex-1 btn-secondary">
                İptal
              </button>
              <button onClick={addUser} disabled={!newEmail.trim() || adding}
                className="flex-1 btn-primary disabled:opacity-50 gap-2"
                style={{ backgroundColor: 'var(--accent)' }}>
                {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                {adding ? 'Ekleniyor...' : 'Ekle'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
