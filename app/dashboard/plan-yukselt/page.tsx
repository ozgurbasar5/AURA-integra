'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Crown, Check, ArrowLeft, Loader2 } from 'lucide-react'
import { PLAN_TIERS, type PlanLevel } from '@/lib/plan-tiers'
import { usePlanLevel } from '@/lib/plan-context'
import { toast } from 'sonner'

export default function PlanYukseltPage() {
  const currentLevel = usePlanLevel()
  const [limits, setLimits] = useState<{ max_users: number; max_branches: number; plan_name: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('paid') === '1') {
      toast.success('Ödemeniz alındı! Aboneliğiniz kısa süre içinde güncellenecek.')
    }
    if (params.get('cancelled') === '1') {
      toast.info('Ödeme iptal edildi')
    }
  }, [])

  useEffect(() => {
    fetch('/api/tenant/limits', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(json => {
        if (json.limits) setLimits(json.limits)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function requestUpgrade(target: PlanLevel) {
    if (target <= currentLevel) {
      toast.info('Bu paket zaten aktif veya daha düşük seviyede')
      return
    }
    const tier = PLAN_TIERS.find(t => t.level === target)
    if (!tier) return

    const checkoutRes = await fetch('/api/billing/checkout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan_level: target }),
    })
    const checkoutJson = await checkoutRes.json() as { url?: string; error?: string; fallback?: boolean }

    if (checkoutRes.ok && checkoutJson.url) {
      window.location.href = checkoutJson.url
      return
    }

    if (checkoutJson.fallback || checkoutRes.status === 503) {
      const res = await fetch('/api/tenant/plan-upgrade', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: tier.name, message: `${tier.name} paketine yükseltme talebi` }),
      })
      const json = await res.json()
      if (res.ok) {
        toast.success(json.message || 'Talep alındı — ödeme linki için destek ile iletişime geçin')
      } else {
        toast.error(json.error || 'Talep gönderilemedi')
      }
      return
    }

    toast.error(checkoutJson.error || 'Ödeme başlatılamadı')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-sky-500" size={28} />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Crown size={20} className="text-amber-500" /> Paket Yükseltme
          </h1>
          <p className="text-sm text-slate-500">
            Mevcut paketiniz: <strong>{limits?.plan_name ?? '—'}</strong>
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {PLAN_TIERS.map(tier => {
          const active = currentLevel >= tier.level
          const isCurrent = currentLevel === tier.level
          return (
            <div
              key={tier.level}
              className={`card p-6 flex flex-col ${isCurrent ? 'ring-2 ring-sky-500' : ''}`}
            >
              <p className="text-xs font-bold uppercase text-slate-400">{tier.name}</p>
              <p className="text-3xl font-black text-slate-900 mt-1">₺{tier.price}<span className="text-sm font-normal text-slate-400">/ay</span></p>
              <ul className="mt-4 space-y-2 flex-1">
                {tier.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
                    <Check size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              <p className="text-xs text-slate-400 mt-3">{tier.max_users} kullanıcı · {tier.max_branches} şube</p>
              <button
                type="button"
                disabled={active}
                onClick={() => requestUpgrade(tier.level as PlanLevel)}
                className={`mt-4 w-full py-2.5 rounded-xl text-sm font-bold transition-colors ${
                  isCurrent
                    ? 'bg-sky-100 text-sky-700 cursor-default'
                    : active
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : 'bg-sky-600 text-white hover:bg-sky-700'
                }`}
              >
                {isCurrent ? 'Mevcut Paket' : active ? 'Dahil' : 'Öde ve Yükselt'}
              </button>
            </div>
          )
        })}
      </div>

      <p className="text-xs text-slate-400 text-center">
        Ödeme ve paket değişikliği sistem yöneticisi tarafından onaylanır. Sorularınız için Destek modülünü kullanın.
      </p>
    </div>
  )
}
