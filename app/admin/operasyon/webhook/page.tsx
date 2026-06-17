'use client'

import { useEffect, useState } from 'react'
import { formatDate } from '@/lib/utils'
import { RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { AdminPageHeader, AdminCard } from '@/components/admin/AdminPageHeader'
import { Webhook } from 'lucide-react'

type Row = {
  id: string
  provider: string
  event_type: string | null
  error_message: string
  tenant_id: string | null
  created_at: string
}

export default function WebhookFailuresPage() {
  const [items, setItems] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    fetch('/api/admin/webhook-failures', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(json => setItems(json.items ?? []))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  async function resolve(id: string) {
    const res = await fetch(`/api/admin/webhook-failures?id=${id}`, { method: 'DELETE', credentials: 'same-origin' })
    if (!res.ok) { toast.error('Çözülemedi'); return }
    toast.success('Kayıt kapatıldı')
    setItems(prev => prev.filter(x => x.id !== id))
  }

  return (
    <div className="space-y-6 animate-fade-in-up">
      <AdminPageHeader
        title="Webhook Hataları"
        description="Stripe, İyzico ve diğer entegrasyon hataları. Çözülen kayıtları kapatın."
        icon={Webhook}
        actions={
          <button type="button" onClick={load} className="btn-secondary btn-sm flex items-center gap-1.5">
            <RefreshCw size={14} /> Yenile
          </button>
        }
      />

      <AdminCard>
        {loading ? (
          <p className="text-zinc-500 text-sm py-8 text-center">Yükleniyor...</p>
        ) : items.length === 0 ? (
          <p className="text-zinc-500 text-sm py-8 text-center">Son 7 günde kayıtlı hata yok ✓</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-base">
              <thead>
                <tr><th>Sağlayıcı</th><th>Olay</th><th>Hata</th><th>Tarih</th><th></th></tr>
              </thead>
              <tbody>
                {items.map(row => (
                  <tr key={row.id}>
                    <td className="font-medium text-white">{row.provider}</td>
                    <td className="text-zinc-400 text-xs">{row.event_type ?? '—'}</td>
                    <td className="text-red-300 text-xs max-w-xs truncate">{row.error_message}</td>
                    <td className="text-zinc-500 text-xs">{formatDate(row.created_at)}</td>
                    <td>
                      <button type="button" onClick={() => resolve(row.id)} className="btn-ghost btn-sm text-emerald-400" title="Çözüldü olarak kapat">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  )
}
