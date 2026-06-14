'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Building2, Wrench, DollarSign, Users } from 'lucide-react'
import Link from 'next/link'

export default function BayiPreviewPage() {
  const params = useParams()
  const router = useRouter()
  const tenantId = String(params.id ?? '')
  const [health, setHealth] = useState<Record<string, unknown> | null>(null)
  const [tenant, setTenant] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!tenantId) return
    fetch(`/api/admin/tenant-health?tenant_id=${tenantId}`, { credentials: 'same-origin' })
      .then(r => r.json())
      .then(json => {
        setHealth(json.health ?? null)
        setTenant(json.tenant ?? null)
      })
      .finally(() => setLoading(false))
  }, [tenantId])

  if (loading) return <div className="p-8 text-zinc-400">Yükleniyor...</div>

  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="btn-ghost btn-sm"><ArrowLeft size={16} /></button>
        <div>
          <h1 className="text-white text-xl font-black">Bayi Önizleme (Salt Okunur)</h1>
          <p className="text-zinc-500 text-sm">{String(tenant?.company_name ?? '—')}</p>
        </div>
        <Link href={`/admin/bayiler`} className="btn-secondary ml-auto text-sm">Bayi Yönetimi</Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Aktif Kullanıcı', value: health?.active_users ?? 0, icon: Users },
          { label: 'Servis (30g)', value: health?.orders_30d ?? 0, icon: Wrench },
          { label: 'Ciro (30g)', value: `₺${Number(health?.revenue_30d ?? 0).toLocaleString('tr-TR')}`, icon: DollarSign },
          { label: 'Durum', value: String(tenant?.status ?? '—'), icon: Building2 },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="card p-4">
            <Icon size={16} className="text-sky-400 mb-2" />
            <p className="text-zinc-500 text-xs">{label}</p>
            <p className="text-white text-lg font-bold mt-1">{String(value)}</p>
          </div>
        ))}
      </div>

      <p className="text-zinc-500 text-sm">
        Tam panel erişimi için bayi admin hesabıyla giriş yapılmalıdır. Bu sayfa destek amaçlı özet gösterir.
      </p>
    </div>
  )
}
