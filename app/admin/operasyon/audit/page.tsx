'use client'

import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'
import { RefreshCw, Shield } from 'lucide-react'
import { AdminPageHeader, AdminCard } from '@/components/admin/AdminPageHeader'

type LogRow = {
  id: string
  action: string
  actor_email: string | null
  target_type: string | null
  target_id: string | null
  metadata: Record<string, unknown>
  created_at: string
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/audit-logs?limit=100', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(json => setLogs(json.data ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  return (
    <div className="space-y-6 animate-fade-in-up">
      <AdminPageHeader
        title="Denetim Kayıtları"
        description="Süper admin işlemleri: ödeme hatırlatma, bayi değişiklikleri, panele giriş linkleri."
        icon={Shield}
        actions={
          <button type="button" onClick={load} className="btn-secondary btn-sm flex items-center gap-1.5">
            <RefreshCw size={14} /> Yenile
          </button>
        }
      />

      <AdminCard>
        {loading ? (
          <p className="text-zinc-500 text-sm py-8 text-center">Yükleniyor...</p>
        ) : logs.length === 0 ? (
          <p className="text-zinc-500 text-sm py-8 text-center">Henüz kayıt yok</p>
        ) : (
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {logs.map(log => (
              <div key={log.id} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 p-3 rounded-lg bg-zinc-900/50 border border-zinc-800 text-sm">
                <span className="text-zinc-500 text-xs font-mono shrink-0">{formatDate(log.created_at)}</span>
                <span className="text-sky-400 font-semibold">{log.action}</span>
                <span className="text-zinc-400">{log.actor_email ?? 'sistem'}</span>
                {log.target_type && (
                  <span className="text-zinc-500 text-xs">{log.target_type}{log.target_id ? ` · ${log.target_id.slice(0, 8)}…` : ''}</span>
                )}
                {typeof log.metadata?.note === 'string' && log.metadata.note && (
                  <span className="text-zinc-400 text-xs italic">&quot;{log.metadata.note}&quot;</span>
                )}
              </div>
            ))}
          </div>
        )}
      </AdminCard>
    </div>
  )
}
