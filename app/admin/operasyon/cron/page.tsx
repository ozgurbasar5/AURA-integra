'use client'

import { useEffect, useState } from 'react'
import { Clock, Play, Loader2, CheckCircle, AlertTriangle } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'

const JOBS = [
  { id: 'trial-reminders', label: 'Deneme Bitiş Hatırlatma', schedule: 'Her gün 09:00' },
  { id: 'payment-reminders', label: 'Ödeme Hatırlatma', schedule: 'Her gün 10:00' },
  { id: 'appointment-reminders', label: 'Randevu SMS', schedule: 'Her gün 18:00' },
  { id: 'churn-interventions', label: 'Churn Müdahalesi', schedule: 'Her gün 11:00 (önerilen)' },
] as const

type AuditRow = { action: string; created_at: string; metadata?: Record<string, unknown> }

export default function CronOperasyonPage() {
  const [running, setRunning] = useState<string | null>(null)
  const [logs, setLogs] = useState<AuditRow[]>([])

  useEffect(() => {
    fetch('/api/admin/audit-logs?limit=30&action_prefix=cron', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(json => setLogs(json.data ?? []))
      .catch(() => {})
  }, [])

  async function trigger(job: string) {
    setRunning(job)
    try {
      const res = await fetch('/api/admin/cron-trigger', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Cron başarısız')
      toast.success(`${job} tamamlandı`)
      setLogs(prev => [{
        action: 'cron_manual_trigger',
        created_at: new Date().toISOString(),
        metadata: { job, result: json.result },
      }, ...prev])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Hata')
    } finally {
      setRunning(null)
    }
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Zamanlanmış Görevler"
        description="E-posta ve SMS otomasyonları — manuel tetikleme ve son kayıtlar"
        icon={Clock}
      />

      <div className="grid sm:grid-cols-2 gap-4">
        {JOBS.map(job => (
          <div key={job.id} className="card p-4 flex flex-col gap-3">
            <div>
              <p className="font-semibold text-[var(--text-primary)]">{job.label}</p>
              <p className="text-xs text-[var(--text-muted)]">{job.schedule}</p>
              <p className="text-xs font-mono text-sky-600 mt-1">/api/cron/{job.id}</p>
            </div>
            <button
              type="button"
              disabled={running === job.id}
              onClick={() => trigger(job.id)}
              className="btn-secondary w-full flex items-center justify-center gap-2"
            >
              {running === job.id ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              Şimdi Çalıştır
            </button>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <p className="text-sm font-semibold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <CheckCircle size={16} className="text-emerald-500" /> Son cron kayıtları
        </p>
        {logs.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)] flex items-center gap-2">
            <AlertTriangle size={14} /> Henüz kayıt yok
          </p>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {logs.filter(l => l.action.includes('cron')).map(log => (
              <div key={log.created_at + log.action} className="text-xs border-b border-[var(--bg-border)] pb-2 flex justify-between gap-2">
                <span className="font-mono text-[var(--text-secondary)]">{log.action}</span>
                <span className="text-[var(--text-muted)] shrink-0">{new Date(log.created_at).toLocaleString('tr-TR')}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
