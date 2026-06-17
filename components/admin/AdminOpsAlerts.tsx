'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Bell, Building2, ClipboardList, Webhook, ChevronRight } from 'lucide-react'

type Alert = { id: string; severity: 'critical' | 'warning' | 'info'; title: string; href: string; count?: number }
type Intervention = { priority: string; message: string; action?: string; tenant_id: string; risk_score: number }

const ICONS: Record<string, typeof Bell> = {
  basvuru: ClipboardList,
  overdue: Bell,
  expiring: Building2,
  webhook: Webhook,
  churn: AlertTriangle,
}

const SEV: Record<string, string> = {
  critical: 'border-red-500/40 bg-red-500/10 text-red-300',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-300',
  info: 'border-sky-500/40 bg-sky-500/10 text-sky-300',
}

export default function AdminOpsAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [interventions, setInterventions] = useState<Intervention[]>([])

  useEffect(() => {
    fetch('/api/admin/ops-summary', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(json => {
        setAlerts(json.alerts ?? [])
        setInterventions(json.interventions ?? [])
      })
      .catch(() => {})
  }, [])

  if (alerts.length === 0 && interventions.length === 0) return null

  return (
    <div className="space-y-4" data-tour="admin-ops-alerts">
      {alerts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {alerts.map(a => {
            const Icon = ICONS[a.id] ?? AlertTriangle
            return (
              <Link
                key={a.id}
                href={a.href}
                className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-semibold transition-all hover:scale-[1.02] ${SEV[a.severity]}`}
              >
                <Icon size={15} />
                {a.title}
                {a.count != null && <span className="opacity-80">({a.count})</span>}
                <ChevronRight size={14} className="opacity-60" />
              </Link>
            )
          })}
        </div>
      )}

      {interventions.length > 0 && (
        <div className="card p-4 border border-amber-500/20" data-tour="admin-interventions">
          <p className="text-xs font-bold uppercase tracking-wide text-amber-400 mb-3">Önerilen müdahaleler</p>
          <div className="space-y-2">
            {interventions.map((i, idx) => (
              <Link
                key={`${i.tenant_id}-${idx}`}
                href={`/admin/bayiler?highlight=${i.tenant_id}`}
                className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-zinc-900/60 hover:bg-zinc-800/80 transition-colors"
              >
                <span className="text-sm text-zinc-200">{i.message}</span>
                <span className="text-xs text-sky-400 shrink-0">{i.action}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
