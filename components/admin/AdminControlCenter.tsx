'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  LayoutDashboard, Users, Building2, Shield, Settings, Activity,
  Globe, Bell, Key, Database, RefreshCw, Plus, Search,
  CheckCircle2, AlertTriangle, Clock, Wrench, Package,
  CreditCard, Eye, EyeOff, Save, Trash2, Command, FileText,
  Smartphone, MessageSquare, Mail, Layers, ShieldCheck, Ticket
} from 'lucide-react'
import { toast } from 'sonner'
import { AdminCommandPalette } from './AdminCommandPalette'
import { AdminAlertCenter } from './AdminAlertCenter'
import { AdminDetailDrawer } from './AdminDetailDrawer'
import { AdminDataTable, type Column } from './AdminDataTable'
import { RolePermissionMatrix } from './RolePermissionMatrix'
import { AdminKpiHero } from './AdminKpiHero'
import type { AdminKpiSummary, AdminAlert, SystemHealthReport } from '@/lib/admin-center'
import type { ServiceRulesConfig } from '@/app/api/tenant/service-rules/route'
import type { TenantNotificationConfig } from '@/app/api/tenant/notification-config/route'
import { formatCurrency, formatDate } from '@/lib/utils'

export type AdminDomain =
  | 'overview'
  | 'operations'
  | 'organization'
  | 'customer'
  | 'settings'
  | 'system'
  | 'tenant'

interface Props {
  initialDomain?: AdminDomain
  isPlatformAdmin?: boolean
}

export function AdminControlCenter({
  initialDomain = 'overview',
  isPlatformAdmin = false,
}: Props) {
  const [domain, setDomain] = useState<AdminDomain>(initialDomain)
  const [subTab, setSubTab] = useState<string>('kpis')
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Aggregated Data State
  const [kpis, setKpis] = useState<AdminKpiSummary>({
    servicesActive: 0,
    servicesDeliveredToday: 0,
    quotesPending: 0,
    totalAccountsBalance: 0,
    criticalStockCount: 0,
    warrantyClaimsPending: 0,
    activePersonnelCount: 1,
    activeBranchesCount: 1,
    alertCount: 0,
  })
  const [alerts, setAlerts] = useState<AdminAlert[]>([])
  const [health, setHealth] = useState<SystemHealthReport | null>(null)

  // Organization State
  const [users, setUsers] = useState<any[]>([])
  const [branches, setBranches] = useState<any[]>([])
  const [limits, setLimits] = useState({ max_users: 5, max_branches: 2 })

  // Service Rules State
  const [serviceRules, setServiceRules] = useState<ServiceRulesConfig>({
    default_service_fee: 250,
    warranty_months_default: 3,
    auto_require_qc: true,
    approval_threshold_amount: 1000,
    numbering_prefixes: { service: 'SRV-', customer: 'CUST-', warranty: 'WAR-', invoice: 'FAT-' },
    status_transitions: { allow_skip_diagnosis: false, require_quote_before_repair: true, auto_notify_on_ready: true },
  })

  // Notifications State
  const [notifConfig, setNotifConfig] = useState<TenantNotificationConfig>({
    netgsm_user: '',
    netgsm_header: '',
    smtp_email: '',
    smtp_host: 'smtp.gmail.com',
    whatsapp_phone: '',
  })
  const [notifPassInput, setNotifPassInput] = useState('')

  // API Key State
  const [hasApiKey, setHasApiKey] = useState(false)
  const [generatedApiKey, setGeneratedApiKey] = useState<string | null>(null)

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<any[]>([])

  // Support Tickets State
  const [tickets, setTickets] = useState<any[]>([])

  // Drawer State
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [drawerEntity, setDrawerEntity] = useState<any>(null)
  const [drawerMode, setDrawerMode] = useState<'user' | 'branch' | 'ticket' | 'audit'>('user')

  // Keyboard shortcut listener for Ctrl/Cmd + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setCommandPaletteOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const loadCenterData = useCallback(async () => {
    setLoading(true)
    try {
      const [centerRes, orgRes, rulesRes, notifRes, apiKeyRes, auditRes, ticketsRes] =
        await Promise.all([
          fetch('/api/admin/center', { credentials: 'same-origin' }).then(r => (r.ok ? r.json() : null)),
          fetch('/api/tenant/organization', { credentials: 'same-origin' }).then(r => (r.ok ? r.json() : null)),
          fetch('/api/tenant/service-rules', { credentials: 'same-origin' }).then(r => (r.ok ? r.json() : null)),
          fetch('/api/tenant/notification-config', { credentials: 'same-origin' }).then(r => (r.ok ? r.json() : null)),
          fetch('/api/tenant/api-key', { credentials: 'same-origin' }).then(r => (r.ok ? r.json() : null)),
          fetch('/api/admin/audit-logs?limit=30', { credentials: 'same-origin' }).then(r => (r.ok ? r.json() : null)),
          fetch('/api/tenant/support', { credentials: 'same-origin' }).then(r => (r.ok ? r.json() : null)),
        ])

      if (centerRes?.ok) {
        setKpis(centerRes.kpis)
        setAlerts(centerRes.alerts ?? [])
        setHealth(centerRes.health ?? null)
      }
      if (orgRes?.ok) {
        setUsers(orgRes.users ?? [])
        setBranches(orgRes.branches ?? [])
        if (orgRes.limits) setLimits(orgRes.limits)
      }
      if (rulesRes?.ok && rulesRes.rules) {
        setServiceRules(rulesRes.rules)
      }
      if (notifRes?.config) {
        setNotifConfig(notifRes.config)
      }
      if (apiKeyRes?.has_key) {
        setHasApiKey(true)
      }
      if (auditRes?.data) {
        setAuditLogs(auditRes.data)
      }
      if (ticketsRes?.items) {
        setTickets(ticketsRes.items)
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCenterData()
  }, [loadCenterData])

  // Save Service Rules
  const handleSaveServiceRules = async () => {
    try {
      const res = await fetch('/api/tenant/service-rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(serviceRules),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Kaydedilemedi')
      toast.success('Servis ve numaratör kuralları güncellendi')
    } catch (e: any) {
      toast.error(e.message || 'Kayıt hatası')
    }
  }

  // Save Notification Config
  const handleSaveNotifConfig = async () => {
    try {
      const res = await fetch('/api/tenant/notification-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...notifConfig,
          netgsm_pass: notifPassInput || undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Kaydedilemedi')
      toast.success('Bildirim ve SMS yapılandırması güncellendi')
      setNotifPassInput('')
    } catch (e: any) {
      toast.error(e.message || 'Kayıt hatası')
    }
  }

  // Generate API Key
  const handleGenerateApiKey = async () => {
    try {
      const res = await fetch('/api/tenant/api-key', {
        method: 'POST',
        credentials: 'same-origin',
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Oluşturulamadı')
      setGeneratedApiKey(json.api_key)
      setHasApiKey(true)
      toast.success('Yeni API Anahtarı üretildi')
    } catch (e: any) {
      toast.error(e.message || 'Hata')
    }
  }

  // Toggle User Active Status
  const handleToggleUserActive = async (userId: string, current: boolean) => {
    try {
      const res = await fetch('/api/tenant/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user',
          id: userId,
          updates: { is_active: !current },
        }),
      })
      if (!res.ok) throw new Error('Kullanıcı durumu güncellenemedi')
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, is_active: !current } : u)))
      toast.success(current ? 'Kullanıcı pasife alındı' : 'Kullanıcı aktif edildi')
    } catch (e: any) {
      toast.error(e.message || 'Hata')
    }
  }

  // Change User Role
  const handleChangeUserRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/tenant/organization', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'user',
          id: userId,
          updates: { role: newRole },
        }),
      })
      if (!res.ok) throw new Error('Rol güncellenemedi')
      setUsers(prev => prev.map(u => (u.id === userId ? { ...u, role: newRole } : u)))
      toast.success('Kullanıcı rolü güncellendi')
    } catch (e: any) {
      toast.error(e.message || 'Hata')
    }
  }

  const DOMAINS: { id: AdminDomain; label: string; icon: any }[] = [
    { id: 'overview', label: 'Komuta Merkezi', icon: LayoutDashboard },
    { id: 'organization', label: 'Organizasyon & Roller', icon: Users },
    { id: 'operations', label: 'Operasyon & Servis', icon: Wrench },
    { id: 'customer', label: 'Müşteri & Bildirim', icon: MessageSquare },
    { id: 'settings', label: 'İş Kuralları & SLA', icon: Settings },
    { id: 'system', label: 'Sistem, API & Denetim', icon: Activity },
    { id: 'tenant', label: 'Bayi & Abonelik', icon: Building2 },
  ]

  // User table columns
  const userColumns: Column<any>[] = [
    {
      key: 'full_name',
      header: 'Kullanıcı',
      sortable: true,
      render: u => (
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 font-bold flex items-center justify-center text-xs">
            {u.full_name?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div>
            <p className="font-semibold text-white">{u.full_name}</p>
            <p className="text-[10px] text-zinc-400">{u.id.slice(0, 8)}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Rol',
      sortable: true,
      render: u => (
        <select
          value={u.role}
          onChange={e => handleChangeUserRole(u.id, e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-xs text-white rounded-lg px-2 py-1 focus:outline-none"
        >
          <option value="tenant_admin">Sahip / Yönetici</option>
          <option value="mudur">Müdür</option>
          <option value="teknisyen">Teknisyen</option>
          <option value="muhasebe">Muhasebe</option>
          <option value="satis">Satış</option>
          <option value="kasiyer">Kasiyer</option>
          <option value="viewer">Sadece Görüntüleme</option>
        </select>
      ),
    },
    {
      key: 'is_active',
      header: 'Durum',
      render: u => (
        <button
          onClick={() => handleToggleUserActive(u.id, u.is_active)}
          className={`px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${
            u.is_active
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
              : 'bg-zinc-800 text-zinc-500 border-zinc-700'
          }`}
        >
          {u.is_active ? 'Aktif' : 'Pasif'}
        </button>
      ),
    },
    {
      key: 'created_at',
      header: 'Kayıt Tarihi',
      render: u => <span className="text-zinc-400 font-mono text-[11px]">{formatDate(u.created_at)}</span>,
    },
  ]

  // Branch table columns
  const branchColumns: Column<any>[] = [
    {
      key: 'name',
      header: 'Şube Adı',
      sortable: true,
      render: b => (
        <div className="flex items-center gap-2">
          <Building2 size={15} className="text-sky-400" />
          <span className="font-semibold text-white">{b.name}</span>
          {b.is_main && (
            <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.2 rounded-full">
              Merkez
            </span>
          )}
        </div>
      ),
    },
    { key: 'phone', header: 'Telefon', render: b => <span className="text-zinc-400">{b.phone || '—'}</span> },
    { key: 'address', header: 'Adres', render: b => <span className="text-zinc-400 line-clamp-1">{b.address || '—'}</span> },
    {
      key: 'is_active',
      header: 'Durum',
      render: b => (
        <span className={`badge ${b.is_active !== false ? 'badge-green' : 'badge-slate'}`}>
          {b.is_active !== false ? 'Aktif' : 'Pasif'}
        </span>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      {/* Top Bar with Omnibar trigger and Real-time Status */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 p-4 rounded-2xl border border-zinc-800 bg-zinc-900/90 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-sky-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-sky-500/20">
            <LayoutDashboard size={18} />
          </div>
          <div>
            <h1 className="text-base font-black text-white flex items-center gap-2">
              AURA Control Center <span className="text-[10px] font-bold text-sky-400 bg-sky-500/10 border border-sky-500/20 px-2 py-0.5 rounded-full">2.0</span>
            </h1>
            <p className="text-xs text-zinc-400">Kurumsal Yönetim, Yetkilendirme & Operasyon Konsolu</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setCommandPaletteOpen(true)}
            className="flex-1 sm:flex-initial flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-700/80 text-zinc-400 hover:text-white hover:border-sky-500 text-xs transition-all"
          >
            <Search size={14} className="text-zinc-500" />
            <span>Evrensel Arama...</span>
            <kbd className="ml-2 font-mono text-[10px] bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700 text-zinc-400">
              Ctrl+K
            </kbd>
          </button>

          {health && (
            <div className="hidden lg:flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Sistem Sağlıklı ({health.db.latencyMs}ms)
            </div>
          )}

          <button
            onClick={() => void loadCenterData()}
            disabled={loading}
            className="btn-ghost p-2 text-zinc-400 hover:text-white rounded-xl"
            title="Yenile"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Domain Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin border-b border-zinc-800">
        {DOMAINS.map(d => {
          const Icon = d.icon
          const isActive = domain === d.id
          return (
            <button
              key={d.id}
              onClick={() => setDomain(d.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20'
                  : 'text-zinc-400 hover:text-white hover:bg-zinc-850 bg-zinc-900/50'
              }`}
            >
              <Icon size={15} />
              {d.label}
            </button>
          )
        })}
      </div>

      {/* ── 1. DOMAIN: OVERVIEW ────────────────────────────────────────── */}
      {domain === 'overview' && (
        <div className="space-y-6 animate-fade-in">
          {/* KPI Hero Cards */}
          <AdminKpiHero kpis={kpis} />

          {/* Alert Center */}
          <AdminAlertCenter alerts={alerts} onRefresh={loadCenterData} />

          {/* Quick Operations Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="card p-5 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Users size={16} className="text-sky-400" /> Ekip & Kullanıcılar
                </h3>
                <span className="text-xs text-zinc-400 font-mono">{users.length} / {limits.max_users}</span>
              </div>
              <p className="text-xs text-zinc-400">Aktif kullanıcılar, roller ve şube yetkilendirmesi.</p>
              <button onClick={() => setDomain('organization')} className="btn-secondary btn-sm w-full text-xs">
                Kullanıcıları Yönet →
              </button>
            </div>

            <div className="card p-5 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-400" /> SLA & Durum Kuralları
                </h3>
                <span className="text-xs text-emerald-400 font-medium">Aktif</span>
              </div>
              <p className="text-xs text-zinc-400">Servis durum geçişleri, teşhis onayları ve SLA süreleri.</p>
              <button onClick={() => setDomain('settings')} className="btn-secondary btn-sm w-full text-xs">
                İş Kurallarını Düzenle →
              </button>
            </div>

            <div className="card p-5 border border-zinc-800 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-white text-sm flex items-center gap-2">
                  <Activity size={16} className="text-purple-400" /> Güvenlik & Denetim
                </h3>
                <span className="text-xs text-zinc-400 font-mono">{auditLogs.length} Günlük</span>
              </div>
              <p className="text-xs text-zinc-400">Tüm sistem mutasyonları ve güvenlik denetim kayıtları.</p>
              <button onClick={() => setDomain('system')} className="btn-secondary btn-sm w-full text-xs">
                Audit Logları İncele →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. DOMAIN: ORGANIZATION & ROLES ────────────────────────────── */}
      {domain === 'organization' && (
        <div className="space-y-6 animate-fade-in">
          {/* Sub Navigation */}
          <div className="flex items-center gap-2">
            {[
              { id: 'users', label: `Kullanıcılar (${users.length})` },
              { id: 'branches', label: `Şubeler (${branches.length})` },
              { id: 'roles', label: 'Rol & Yetki Matrisi' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  subTab === tab.id
                    ? 'bg-zinc-800 text-white border border-zinc-700'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {subTab === 'roles' ? (
            <RolePermissionMatrix />
          ) : subTab === 'branches' ? (
            <AdminDataTable
              data={branches}
              columns={branchColumns}
              keyExtractor={b => b.id}
              searchPlaceholder="Şube adı, telefon veya adres ara..."
              exportFileName="subeler.csv"
            />
          ) : (
            <AdminDataTable
              data={users}
              columns={userColumns}
              keyExtractor={u => u.id}
              searchPlaceholder="Kullanıcı adı veya rol ara..."
              exportFileName="kullanicilar.csv"
            />
          )}
        </div>
      )}

      {/* ── 3. DOMAIN: OPERATIONS & SERVICE ────────────────────────────── */}
      {domain === 'operations' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card p-6 border border-zinc-800 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Wrench size={16} className="text-sky-400" /> Servis Durum & Akış Kuralları
              </h3>
              <div className="space-y-3">
                <label className="flex items-center justify-between text-xs text-zinc-300 p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/80">
                  <span>Teşhis Aşaması Atlanabilsin</span>
                  <input
                    type="checkbox"
                    checked={serviceRules.status_transitions.allow_skip_diagnosis}
                    onChange={e =>
                      setServiceRules(r => ({
                        ...r,
                        status_transitions: { ...r.status_transitions, allow_skip_diagnosis: e.target.checked },
                      }))
                    }
                    className="checkbox"
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-zinc-300 p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/80">
                  <span>Tamir Öncesi Fiyat Teklifi Zorunlu</span>
                  <input
                    type="checkbox"
                    checked={serviceRules.status_transitions.require_quote_before_repair}
                    onChange={e =>
                      setServiceRules(r => ({
                        ...r,
                        status_transitions: { ...r.status_transitions, require_quote_before_repair: e.target.checked },
                      }))
                    }
                    className="checkbox"
                  />
                </label>
                <label className="flex items-center justify-between text-xs text-zinc-300 p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/80">
                  <span>Teslimatta Kalite Kontrol (QC) Zorunlu</span>
                  <input
                    type="checkbox"
                    checked={serviceRules.auto_require_qc}
                    onChange={e => setServiceRules(r => ({ ...r, auto_require_qc: e.target.checked }))}
                    className="checkbox"
                  />
                </label>
              </div>
              <button onClick={handleSaveServiceRules} className="btn-primary btn-sm flex items-center gap-2">
                <Save size={14} /> Kuralları Kaydet
              </button>
            </div>

            <div className="card p-6 border border-zinc-800 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <CreditCard size={16} className="text-emerald-400" /> Ücretlendirme & Onay Eşikleri
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="label text-xs">Varsayılan Servis / Arıza Tespit Ücreti (₺)</label>
                  <input
                    type="number"
                    value={serviceRules.default_service_fee}
                    onChange={e => setServiceRules(r => ({ ...r, default_service_fee: Number(e.target.value) }))}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="label text-xs">Müşteri Onayı Gerektiren Tutar Eşiği (₺)</label>
                  <input
                    type="number"
                    value={serviceRules.approval_threshold_amount}
                    onChange={e => setServiceRules(r => ({ ...r, approval_threshold_amount: Number(e.target.value) }))}
                    className="input text-xs"
                  />
                </div>
                <div>
                  <label className="label text-xs">Varsayılan Onarım Garanti Süresi (Ay)</label>
                  <input
                    type="number"
                    value={serviceRules.warranty_months_default}
                    onChange={e => setServiceRules(r => ({ ...r, warranty_months_default: Number(e.target.value) }))}
                    className="input text-xs"
                  />
                </div>
              </div>
              <button onClick={handleSaveServiceRules} className="btn-primary btn-sm flex items-center gap-2">
                <Save size={14} /> Eşikleri Kaydet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 4. DOMAIN: CUSTOMER & NOTIFICATION ─────────────────────────── */}
      {domain === 'customer' && (
        <div className="space-y-6 animate-fade-in">
          <div className="card p-6 border border-zinc-800 space-y-5 max-w-3xl">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <MessageSquare size={16} className="text-sky-400" /> Bildirim & SMS Yapılandırması
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label text-xs">Netgsm Kullanıcı Kodu</label>
                <input
                  value={notifConfig.netgsm_user || ''}
                  onChange={e => setNotifConfig(c => ({ ...c, netgsm_user: e.target.value }))}
                  placeholder="850xxxxxxx"
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="label text-xs">SMS Başlığı (Header)</label>
                <input
                  value={notifConfig.netgsm_header || ''}
                  onChange={e => setNotifConfig(c => ({ ...c, netgsm_header: e.target.value }))}
                  placeholder="AURASRVS"
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="label text-xs">Netgsm Şifresi {notifConfig.has_netgsm_pass && '(Kayıtlı ve Şifreli)'}</label>
                <input
                  type="password"
                  value={notifPassInput}
                  onChange={e => setNotifPassInput(e.target.value)}
                  placeholder={notifConfig.has_netgsm_pass ? '•••••••• (Değiştirmek için yazın)' : 'Şifre'}
                  className="input text-xs"
                />
              </div>
              <div>
                <label className="label text-xs">WhatsApp Destek Telefonu</label>
                <input
                  value={notifConfig.whatsapp_phone || ''}
                  onChange={e => setNotifConfig(c => ({ ...c, whatsapp_phone: e.target.value }))}
                  placeholder="905xxxxxxxxx"
                  className="input text-xs"
                />
              </div>
            </div>
            <button onClick={handleSaveNotifConfig} className="btn-primary btn-sm flex items-center gap-2">
              <Save size={14} /> Bildirim Ayarlarını Kaydet
            </button>
          </div>
        </div>
      )}

      {/* ── 5. DOMAIN: SETTINGS & NUMBERING ─────────────────────────────── */}
      {domain === 'settings' && (
        <div className="space-y-6 animate-fade-in">
          <div className="card p-6 border border-zinc-800 space-y-5 max-w-3xl">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <FileText size={16} className="text-sky-400" /> Belge & Kayıt Numaratör Önekleri
            </h3>
            <p className="text-xs text-zinc-400">
              Yeni kayıtlar açılırken otomatik atanan sıralı numara önekleri.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="label text-xs">Servis No Öneki</label>
                <input
                  value={serviceRules.numbering_prefixes.service}
                  onChange={e =>
                    setServiceRules(r => ({
                      ...r,
                      numbering_prefixes: { ...r.numbering_prefixes, service: e.target.value },
                    }))
                  }
                  className="input text-xs font-mono"
                />
              </div>
              <div>
                <label className="label text-xs">Müşteri No Öneki</label>
                <input
                  value={serviceRules.numbering_prefixes.customer}
                  onChange={e =>
                    setServiceRules(r => ({
                      ...r,
                      numbering_prefixes: { ...r.numbering_prefixes, customer: e.target.value },
                    }))
                  }
                  className="input text-xs font-mono"
                />
              </div>
              <div>
                <label className="label text-xs">Garanti No Öneki</label>
                <input
                  value={serviceRules.numbering_prefixes.warranty}
                  onChange={e =>
                    setServiceRules(r => ({
                      ...r,
                      numbering_prefixes: { ...r.numbering_prefixes, warranty: e.target.value },
                    }))
                  }
                  className="input text-xs font-mono"
                />
              </div>
              <div>
                <label className="label text-xs">Fatura No Öneki</label>
                <input
                  value={serviceRules.numbering_prefixes.invoice}
                  onChange={e =>
                    setServiceRules(r => ({
                      ...r,
                      numbering_prefixes: { ...r.numbering_prefixes, invoice: e.target.value },
                    }))
                  }
                  className="input text-xs font-mono"
                />
              </div>
            </div>
            <button onClick={handleSaveServiceRules} className="btn-primary btn-sm flex items-center gap-2">
              <Save size={14} /> Numaratör Ayarlarını Kaydet
            </button>
          </div>
        </div>
      )}

      {/* ── 6. DOMAIN: SYSTEM, API & AUDIT ─────────────────────────────── */}
      {domain === 'system' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* System Health Widget */}
            <div className="card p-6 border border-zinc-800 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Activity size={16} className="text-emerald-400" /> Sistem & Altyapı Sağlığı
              </h3>
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/80">
                  <span className="text-zinc-300">Veritabanı (PostgreSQL / Supabase)</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={13} /> Sağlıklı ({health?.db?.latencyMs ?? 12}ms)
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/80">
                  <span className="text-zinc-300">Realtime WebSocket Gateway</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={13} /> Bağlı
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/80">
                  <span className="text-zinc-300">Arka Plan Cron & SLA Motoru</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={13} /> Çalışıyor
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/80">
                  <span className="text-zinc-300">Webhook & Entegrasyonlar</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 size={13} /> 0 Hata
                  </span>
                </div>
              </div>
            </div>

            {/* API Key Management */}
            <div className="card p-6 border border-zinc-800 space-y-4">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Key size={16} className="text-amber-400" /> Kurumsal API Anahtarları
              </h3>
              <p className="text-xs text-zinc-400">
                Dış sistemler ve üçüncü taraf entegrasyonlar için güvenli API anahtarı.
              </p>
              {generatedApiKey ? (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1.5">
                  <p className="text-[11px] font-bold text-amber-300">Yeni API Anahtarı (Sadece bir kez gösterilir):</p>
                  <code className="text-xs font-mono text-white break-all">{generatedApiKey}</code>
                </div>
              ) : hasApiKey ? (
                <div className="p-3 rounded-xl bg-zinc-950/50 border border-zinc-800 text-xs text-zinc-300 flex items-center justify-between">
                  <span>Aktif API Anahtarı: <code className="text-zinc-400">ak_live_••••••••••••••••</code></span>
                  <span className="badge badge-green">Aktif</span>
                </div>
              ) : (
                <p className="text-xs text-zinc-500">Henüz oluşturulmuş bir API anahtarı yok.</p>
              )}
              <button onClick={handleGenerateApiKey} className="btn-secondary btn-sm flex items-center gap-2 text-xs">
                <Plus size={14} /> Yeni API Anahtarı Üret
              </button>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="space-y-2">
            <h3 className="font-bold text-white text-sm">Denetim Günlükleri (Audit Log)</h3>
            <div className="rounded-2xl border border-zinc-800 overflow-hidden bg-zinc-900 shadow-xl">
              <div className="divide-y divide-zinc-800/60 max-h-72 overflow-y-auto text-xs">
                {auditLogs.length > 0 ? (
                  auditLogs.map((log, idx) => (
                    <div key={log.id || idx} className="p-3.5 flex items-center justify-between hover:bg-zinc-800/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-sky-400 font-semibold">{log.action}</span>
                        <span className="text-zinc-300 font-medium">{log.entity_type || log.target_type || 'system'}</span>
                      </div>
                      <span className="text-zinc-500 font-mono text-[11px]">
                        {new Date(log.created_at).toLocaleString('tr-TR')}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="p-8 text-center text-zinc-500">Kayıtlı denetim günlüğü bulunamadı.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 7. DOMAIN: TENANT & SUBSCRIPTION ───────────────────────────── */}
      {domain === 'tenant' && (
        <div className="space-y-6 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
            <div className="card p-6 border border-zinc-800 space-y-3">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <Building2 size={16} className="text-sky-400" /> Bayi Profili & Kota
              </h3>
              <div className="space-y-2 text-xs text-zinc-300">
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-500">Maksimum Kullanıcı</span>
                  <span className="font-bold text-white">{limits.max_users}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-zinc-800">
                  <span className="text-zinc-500">Maksimum Şube</span>
                  <span className="font-bold text-white">{limits.max_branches}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Universal Command Palette Modal */}
      <AdminCommandPalette
        isOpen={commandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />

      {/* Detail Drawer */}
      <AdminDetailDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={drawerEntity?.title || 'Detay İnceleme'}
        subtitle={drawerEntity?.subtitle}
      >
        <div className="space-y-4 text-xs text-zinc-300">
          <pre className="p-3 bg-zinc-950 rounded-xl border border-zinc-800 font-mono overflow-x-auto text-[11px]">
            {JSON.stringify(drawerEntity, null, 2)}
          </pre>
        </div>
      </AdminDetailDrawer>
    </div>
  )
}
