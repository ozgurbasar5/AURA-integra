'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Building2, Wrench, DollarSign, Users, Activity, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { healthScoreLabel, type HealthIntervention } from '@/lib/admin/health-score'
import { formatCurrency } from '@/lib/utils'

type HealthData = {
  active_users?: number
  orders_30d?: number
  revenue_30d?: number
  overdue_payments?: number
  health_score?: number
}

export default function BayiPreviewPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = String(params.id ?? '')
  const [health, setHealth] = useState<HealthData | null>(null)
  const [tenant, setTenant] = useState<Record<string, unknown> | null>(null)
  const [interventions, setInterventions] = useState<HealthIntervention[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) return
    fetch(`/api/admin/tenant-health?tenant_id=${tenantId}`, { credentials: 'same-origin' })
      .then(r => r.json())
      .then(json => {
        setHealth(json.health ?? null)
        setTenant(json.tenant ?? null)
        setInterventions(json.interventions ?? [])
      })
      .finally(() => setLoading(false))
  }, [tenantId])

  if (loading) return <div className="p-8 text-zinc-400">Yükleniyor...</div>

  const score = health?.health_score ?? 0
  const scoreMeta = healthScoreLabel(score)

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="btn-ghost btn-sm"><ArrowLeft size={16} /></button>
        <div>
          <h1 className="text-white text-xl font-black">Bayi Önizleme (Salt Okunur)</h1>
          <p className="text-zinc-500 text-sm">{String(tenant?.company_name ?? '—')}</p>
        </div>
        <Link href={`/admin/bayiler?highlight=${tenantId}`} className="btn-secondary ml-auto text-sm">Bayi Drawer</Link>
      </div>

      <div className="card p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-sky-400" />
          <span className="text-zinc-400 text-sm">Sağlık Skoru</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-white text-2xl font-black">{score}</span>
          <span className={`badge border ${scoreMeta.color}`}>{scoreMeta.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Aktif Kullanıcı', value: health?.active_users ?? 0, icon: Users },
          { label: 'Servis (30g)', value: health?.orders_30d ?? 0, icon: Wrench },
          { label: 'Ciro (30g)', value: formatCurrency(Number(health?.revenue_30d ?? 0)), icon: DollarSign },
          { label: 'Gecikmiş Ödeme', value: health?.overdue_payments ?? 0, icon: Building2 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-4">
            <Icon size={16} className="text-sky-400 mb-2" />
            <p className="text-zinc-500 text-xs">{label}</p>
            <p className="text-white text-lg font-bold mt-1">{String(value)}</p>
          </div>
        ))}
      </div>

      {interventions.length > 0 && (
        <div className="card p-4 border border-amber-500/20">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-400 mb-3 flex items-center gap-2">
            <AlertTriangle size={14} /> Önerilen müdahaleler
          </p>
          <div className="space-y-2">
            {interventions.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-zinc-900/60">
                <span className="text-sm text-zinc-200">{item.message}</span>
                {item.action && <span className="text-xs text-sky-400 shrink-0">{item.action}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-zinc-500 text-sm">
        Tam panel erişimi için magic link ile giriş yapılmalıdır. Bu sayfa destek amaçlı özet gösterir.
      </p>
    </div>
  )
}
