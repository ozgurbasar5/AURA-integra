'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Building2, Loader2, LogIn, Mail, MessageCircle, PauseCircle, Save,
} from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import { formatCurrency, formatDate, TENANT_STATUS_COLORS, TENANT_STATUS_LABELS } from '@/lib/utils'
import { healthScoreLabel } from '@/lib/admin/health-score'
import type { Tenant, SubscriptionPlan } from '@/types/database'

export default function BayiDetailPage() {
  const params = useParams()
  const router = useRouter()
  const id = String(params.id ?? '')
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [impersonating, setImpersonating] = useState(false)
  const [subStart, setSubStart] = useState('')
  const [subEnd, setSubEnd] = useState('')
  const [subPlanId, setSubPlanId] = useState('')
  const [subStatus, setSubStatus] = useState('')
  const [featureFlags, setFeatureFlags] = useState({ sms: true, portal: true, whatsapp: false, efatura: false })
  const [health, setHealth] = useState<{
    active_users: number; orders_30d: number; revenue_30d: number; overdue_payments: number; health_score?: number
  } | null>(null)

  const load = useCallback(async () => {
    if (!id) return
    setLoading(true)
    try {
      const [tenantsRes, plansRes, healthRes] = await Promise.all([
        fetch('/api/tenants', { credentials: 'same-origin' }),
        fetch('/api/admin/plans', { credentials: 'same-origin' }),
        fetch(`/api/admin/tenant-health?tenant_id=${id}`, { credentials: 'same-origin' }),
      ])
      const tenantsJson = await tenantsRes.json()
      const plansJson = await plansRes.json()
      const healthJson = await healthRes.json().catch(() => ({}))
      if (!tenantsRes.ok) throw new Error(tenantsJson.error || 'Bayiler yüklenemedi')
      const t = (tenantsJson.data as Tenant[] || []).find(x => x.id === id) || null
      if (!t) throw new Error('Bayi bulunamadı')
      setTenant(t)
      setPlans(plansJson.data || [])
      setSubStart(t.subscription_start || '')
      setSubEnd(t.subscription_end || '')
      setSubPlanId(t.plan_id || '')
      setSubStatus(t.status || '')
      const flags = ((t as Tenant & { feature_flags?: Record<string, boolean> }).feature_flags || {}) as Record<string, boolean>
      setFeatureFlags({
        sms: flags.sms !== false,
        portal: flags.portal !== false,
        whatsapp: !!flags.whatsapp,
        efatura: !!flags.efatura,
      })
      setHealth(healthJson.health ?? null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Yüklenemedi')
      router.replace('/admin/bayiler')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => { void load() }, [load])

  async function saveSubscription() {
    if (!tenant) return
    setSaving(true)
    try {
      const res = await fetch('/api/admin/tenant', {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tenant.id,
          subscription_start: subStart || null,
          subscription_end: subEnd || null,
          plan_id: subPlanId || null,
          status: subStatus,
          feature_flags: featureFlags,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Kayıt başarısız')
      toast.success('Bayi güncellendi')
      await load()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Hata')
    } finally {
      setSaving(false)
    }
  }

  async function impersonate() {
    if (!tenant) return
    setImpersonating(true)
    try {
      const res = await fetch('/api/admin/impersonate', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenant.id }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Impersonate başarısız')
      window.location.href = json.redirect || '/dashboard'
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Hata')
      setImpersonating(false)
    }
  }

  async function remind(channel: 'email' | 'whatsapp') {
    if (!tenant) return
    try {
      const res = await fetch('/api/admin/remind-payment', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenant_id: tenant.id, channel }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Hatırlatıcı gönderilemedi')
      if (channel === 'whatsapp' && json.wa_url) {
        window.open(json.wa_url, '_blank')
        toast.success('WhatsApp açıldı')
      } else {
        toast.success('Hatırlatıcı gönderildi')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Hata')
    }
  }

  if (loading || !tenant) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-500 gap-2">
        <Loader2 className="animate-spin" size={18} /> Yükleniyor…
      </div>
    )
  }

  const score = health?.health_score

  return (
    <div className="space-y-6 animate-fade-in-up">
      <AdminPageHeader
        title={tenant.company_name}
        description={`${tenant.email} · ${tenant.city || '—'}`}
        icon={Building2}
        actions={(
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/bayiler" className="btn-secondary btn-sm inline-flex items-center gap-1">
              <ArrowLeft size={14} /> Liste
            </Link>
            <button type="button" onClick={() => void impersonate()} disabled={impersonating} className="btn-primary btn-sm inline-flex items-center gap-1">
              {impersonating ? <Loader2 size={14} className="animate-spin" /> : <LogIn size={14} />}
              Bayi olarak gir
            </button>
          </div>
        )}
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="card p-4">
          <p className="text-xs text-zinc-500 uppercase font-semibold">Durum</p>
          <span className={`badge border mt-2 ${TENANT_STATUS_COLORS[tenant.status]}`}>
            {TENANT_STATUS_LABELS[tenant.status]}
          </span>
        </div>
        <div className="card p-4">
          <p className="text-xs text-zinc-500 uppercase font-semibold">Paket</p>
          <p className="text-white font-bold mt-2">{(tenant.subscription_plans as { name?: string } | null)?.name || '—'}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-zinc-500 uppercase font-semibold">Health</p>
          <p className="text-white font-black text-xl mt-1">{score ?? '—'}</p>
          {score != null && (
            <span className={`text-xs ${healthScoreLabel(score).color}`}>{healthScoreLabel(score).label}</span>
          )}
        </div>
        <div className="card p-4">
          <p className="text-xs text-zinc-500 uppercase font-semibold">30g ciro</p>
          <p className="text-white font-bold mt-2">{formatCurrency(health?.revenue_30d ?? 0)}</p>
          <p className="text-xs text-zinc-500 mt-1">{health?.orders_30d ?? 0} iş · {health?.active_users ?? 0} kullanıcı</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-5 space-y-3">
          <h3 className="text-white font-bold text-sm">Abonelik</h3>
          <label className="block text-xs text-zinc-500">Başlangıç
            <input className="input mt-1" type="date" value={subStart.slice(0, 10)} onChange={e => setSubStart(e.target.value)} />
          </label>
          <label className="block text-xs text-zinc-500">Bitiş
            <input className="input mt-1" type="date" value={subEnd.slice(0, 10)} onChange={e => setSubEnd(e.target.value)} />
          </label>
          <label className="block text-xs text-zinc-500">Paket
            <select className="input mt-1" value={subPlanId} onChange={e => setSubPlanId(e.target.value)}>
              <option value="">—</option>
              {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </label>
          <label className="block text-xs text-zinc-500">Durum
            <select className="input mt-1" value={subStatus} onChange={e => setSubStatus(e.target.value)}>
              {['active', 'trial', 'passive', 'suspended'].map(s => (
                <option key={s} value={s}>{TENANT_STATUS_LABELS[s] || s}</option>
              ))}
            </select>
          </label>
          <p className="text-xs text-zinc-500">Bitiş: {tenant.subscription_end ? formatDate(tenant.subscription_end) : '—'}</p>
        </div>

        <div className="card p-5 space-y-3">
          <h3 className="text-white font-bold text-sm">Özellik bayrakları</h3>
          {(['sms', 'portal', 'whatsapp', 'efatura'] as const).map(key => (
            <label key={key} className="flex items-center justify-between text-sm text-zinc-300">
              <span className="capitalize">{key === 'efatura' ? 'e-Fatura (opsiyonel)' : key}</span>
              <input
                type="checkbox"
                checked={featureFlags[key]}
                onChange={e => setFeatureFlags(f => ({ ...f, [key]: e.target.checked }))}
              />
            </label>
          ))}
          <div className="flex flex-wrap gap-2 pt-2">
            <button type="button" onClick={() => void remind('email')} className="btn-secondary btn-sm inline-flex items-center gap-1">
              <Mail size={14} /> E-posta hatırlat
            </button>
            <button type="button" onClick={() => void remind('whatsapp')} className="btn-secondary btn-sm inline-flex items-center gap-1">
              <MessageCircle size={14} /> WhatsApp
            </button>
            <button
              type="button"
              className="btn-secondary btn-sm inline-flex items-center gap-1"
              onClick={() => {
                setSubStatus('suspended')
                toast.message('Durum suspended — Kaydet’e basın')
              }}
            >
              <PauseCircle size={14} /> Askıya al
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" disabled={saving} onClick={() => void saveSubscription()} className="btn-primary inline-flex items-center gap-2">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          Kaydet
        </button>
      </div>
    </div>
  )
}
