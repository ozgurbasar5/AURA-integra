'use client'

import React from 'react'
import {
  Wrench, CheckCircle, Clock, CreditCard,
  AlertTriangle, Shield, Users, Building2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import type { AdminKpiSummary } from '@/lib/admin-center'

interface Props {
  kpis: AdminKpiSummary
}

export function AdminKpiHero({ kpis }: Props) {
  const CARDS = [
    {
      label: 'Aktif Servis',
      value: kpis.servicesActive,
      sub: 'Onarımda / Bekliyor',
      icon: Wrench,
      color: 'text-sky-400',
      bg: 'bg-sky-500/10 border-sky-500/20',
    },
    {
      label: 'Bugün Teslim',
      value: kpis.servicesDeliveredToday,
      sub: 'Tamamlanan',
      icon: CheckCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      label: 'Bekleyen Teklif',
      value: kpis.quotesPending,
      sub: 'Müşteri onayı bekliyor',
      icon: Clock,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
    },
    {
      label: 'Toplam Likidite',
      value: formatCurrency(kpis.totalAccountsBalance),
      sub: 'Tüm Kasa & Hesaplar',
      icon: CreditCard,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
    },
    {
      label: 'Kritik Stok',
      value: kpis.criticalStockCount,
      sub: 'Tükenmek üzere',
      icon: AlertTriangle,
      color: kpis.criticalStockCount > 0 ? 'text-red-400' : 'text-zinc-400',
      bg: kpis.criticalStockCount > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-zinc-800/60 border-zinc-700/40',
    },
    {
      label: 'Aktif Garanti',
      value: kpis.warrantyClaimsPending,
      sub: 'Kapsam dahilinde',
      icon: Shield,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      label: 'Personel',
      value: kpis.activePersonnelCount,
      sub: 'Aktif ekip üyesi',
      icon: Users,
      color: 'text-teal-400',
      bg: 'bg-teal-500/10 border-teal-500/20',
    },
    {
      label: 'Şube',
      value: kpis.activeBranchesCount,
      sub: 'Hizmet noktası',
      icon: Building2,
      color: 'text-indigo-400',
      bg: 'bg-indigo-500/10 border-indigo-500/20',
    },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
      {CARDS.map(c => {
        const Icon = c.icon
        return (
          <div
            key={c.label}
            className="relative overflow-hidden rounded-2xl border border-zinc-800/80 bg-gradient-to-br from-zinc-900/90 to-zinc-950 p-4 space-y-2 shadow-lg shadow-black/20"
          >
            <div className="flex items-start justify-between">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
                {c.label}
              </span>
              <div className={`w-8 h-8 rounded-xl border flex items-center justify-center ${c.bg}`}>
                <Icon size={15} className={c.color} />
              </div>
            </div>
            <div>
              <p className="text-xl font-black text-white tabular-nums tracking-tight">{c.value}</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">{c.sub}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
