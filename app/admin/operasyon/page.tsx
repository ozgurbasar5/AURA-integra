'use client'

import Link from 'next/link'
import { Activity, Clock, Webhook, FileWarning, ArrowRight } from 'lucide-react'
import { AdminPageHeader } from '@/components/admin/AdminPageHeader'
import AdminOpsAlerts from '@/components/admin/AdminOpsAlerts'

const LINKS = [
  { href: '/admin/operasyon/audit', label: 'Denetim logları', icon: FileWarning, desc: 'Admin işlem geçmişi' },
  { href: '/admin/operasyon/webhook', label: 'Webhook hataları', icon: Webhook, desc: 'Ödeme / entegrasyon' },
  { href: '/admin/operasyon/cron', label: 'Zamanlanmış görevler', icon: Clock, desc: 'Cron manuel tetik' },
]

export default function OperasyonHubPage() {
  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Operasyon Merkezi"
        description="Platform sağlığı, uyarılar ve hızlı erişim"
        icon={Activity}
      />

      <AdminOpsAlerts />

      <div className="grid sm:grid-cols-3 gap-4">
        {LINKS.map(l => (
          <Link
            key={l.href}
            href={l.href}
            className="card p-5 hover:border-sky-500/40 transition-colors group"
          >
            <div className="flex items-start justify-between">
              <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                <l.icon size={18} className="text-sky-400" />
              </div>
              <ArrowRight size={16} className="text-zinc-600 group-hover:text-sky-400 transition-colors" />
            </div>
            <p className="text-white font-semibold mt-3">{l.label}</p>
            <p className="text-xs text-zinc-500 mt-1">{l.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}
