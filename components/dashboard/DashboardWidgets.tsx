'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Wrench, Plus, ShoppingCart, Package, Store, ClipboardCheck, Wallet,
  TrendingUp, AlertTriangle, ChevronRight, Sparkles, BarChart3, Truck,
  type LucideIcon,
} from 'lucide-react'
import { getBusinessBranding } from '@/lib/business-branding'

export function DashboardHero({
  homeLabel,
  subtitle,
  shopName,
  children,
}: {
  homeLabel: string
  subtitle: string
  shopName?: string
  children?: React.ReactNode
}) {
  const [greet, setGreet] = useState('İyi günler')
  const [today, setToday] = useState('GENEL BAKIŞ')

  useEffect(() => {
    const hour = new Date().getHours()
    setGreet(hour < 12 ? 'Günaydın' : hour < 18 ? 'İyi günler' : 'İyi akşamlar')
    setToday(new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' }))
  }, [])

  return (
    <section className="relative overflow-hidden rounded-3xl border border-[var(--accent)]/20 hero-themed text-white shadow-xl" data-tour="dashboard-hero">
      <div className="absolute inset-0 opacity-30 pointer-events-none">
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-white/20 blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-40 h-40 rounded-full bg-cyan-400/20 blur-2xl" />
      </div>
      <div className="relative p-6 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="min-w-0">
          <p className="text-sky-200 text-xs font-bold uppercase tracking-widest">{today}</p>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
            {greet}{shopName ? `, ${shopName}` : ''}
          </h1>
          <p className="text-sky-100/90 text-sm mt-2 max-w-lg">{subtitle}</p>
          <p className="text-[11px] font-semibold text-sky-200/80 mt-3 uppercase tracking-wider">{homeLabel}</p>
        </div>
        {children && <div className="flex flex-wrap gap-2 shrink-0">{children}</div>}
      </div>
    </section>
  )
}

type QuickActionDef = {
  href: string
  label: string
  icon: LucideIcon
  roles: readonly string[]
  color: string
  minPlan?: number
}

/** Önemli modüller önce gelsin — slice(0,6) kasa/raporları dışarıda bırakmasın */
const QUICK_ACTION_PRIORITY = [
  '/dashboard/kabul',
  '/dashboard/atolye',
  '/dashboard/stok',
  '/dashboard/kasa',
  '/dashboard/raporlar',
] as const

function priorityKey(href: string): number {
  const idx = QUICK_ACTION_PRIORITY.indexOf(href as (typeof QUICK_ACTION_PRIORITY)[number])
  return idx === -1 ? 50 : idx
}

const ACTION_DEFS: QuickActionDef[] = [
  { href: '/dashboard/kabul', label: 'Hızlı Kabul', icon: ClipboardCheck, roles: ['owner', 'satis', 'kasiyer'], color: 'from-emerald-500 to-teal-600' },
  { href: '/dashboard/satis', label: 'Satış & POS', icon: ShoppingCart, roles: ['owner', 'satis', 'kasiyer'], color: 'from-sky-500 to-blue-600' },
  { href: '/dashboard/atolye', label: 'Atölye', icon: Wrench, roles: ['owner', 'teknisyen'], color: 'from-violet-500 to-purple-600' },
  { href: '/dashboard/vitrin', label: 'Vitrin', icon: Store, roles: ['owner', 'satis'], color: 'from-amber-500 to-orange-600', minPlan: 3 },
  { href: '/dashboard/stok', label: 'Stok', icon: Package, roles: ['owner', 'teknisyen', 'satis', 'kasiyer'], color: 'from-slate-600 to-slate-800' },
  { href: '/dashboard/raporlar', label: 'Raporlar', icon: BarChart3, roles: ['owner', 'muhasebe'], color: 'from-indigo-500 to-indigo-700', minPlan: 3 },
  { href: '/dashboard/tedarik', label: 'Tedarik', icon: Truck, roles: ['owner', 'teknisyen'], color: 'from-cyan-500 to-sky-600', minPlan: 2 },
  { href: '/dashboard/kasa', label: 'Kasa', icon: Wallet, roles: ['owner', 'kasiyer', 'muhasebe'], color: 'from-emerald-600 to-green-700', minPlan: 3 },
]

export function QuickActionGrid({
  role,
  isOwner,
  planLevel,
}: {
  role: string
  isOwner: boolean
  planLevel: number
}) {
  const roleKey = isOwner ? 'owner' : role === 'teknisyen' ? 'teknisyen' : role === 'muhasebe' ? 'muhasebe' : role === 'kasiyer' ? 'kasiyer' : 'satis'

  const items = ACTION_DEFS.filter(a => {
    if (a.minPlan && planLevel < a.minPlan) return false
    return a.roles.includes(roleKey)
  })
    .sort((a, b) => priorityKey(a.href) - priorityKey(b.href))
    .slice(0, 6)

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-tour="dashboard-hizli-islemler">
      {items.map(a => {
        const Icon = a.icon
        return (
          <Link
            key={a.href}
            href={a.href}
            className="group relative overflow-hidden rounded-2xl border border-[var(--bg-border)] bg-[var(--bg-card)] p-4 hover:shadow-lg hover:-translate-y-0.5 transition-all"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${a.color} flex items-center justify-center text-white shadow-md mb-3 group-hover:scale-105 transition-transform`}>
              <Icon size={18} />
            </div>
            <p className="text-xs font-bold text-[var(--text-primary)] leading-tight">{a.label}</p>
            <ChevronRight size={12} className="absolute top-3 right-3 text-[var(--text-muted)] opacity-0 group-hover:opacity-100 transition-opacity" />
          </Link>
        )
      })}
    </div>
  )
}

export function ServicePipeline({
  counts,
  activeFilter,
  onFilter,
}: {
  counts: { key: string; label: string; count: number; dot: string }[]
  activeFilter: string | null
  onFilter: (key: string | null) => void
}) {
  const total = counts.reduce((s, c) => s + c.count, 0)
  if (total === 0) return null

  return (
    <div className="surface p-4" data-tour="dashboard-servis-akisi">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Sparkles size={15} className="text-sky-500" /> Servis Akışı
        </h2>
        {activeFilter && (
          <button type="button" onClick={() => onFilter(null)} className="text-[10px] font-bold text-sky-600 hover:underline">
            Filtreyi temizle
          </button>
        )}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
        {counts.map(c => (
          <button
            key={c.key}
            type="button"
            onClick={() => onFilter(activeFilter === c.key ? null : c.key)}
            className={`shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-all ${
              activeFilter === c.key
                ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/30'
                : 'border-[var(--bg-border)] bg-[var(--bg-muted)] hover:border-sky-500/40'
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${c.dot}`} />
            <span className="text-[11px] font-bold text-[var(--text-primary)]">{c.label}</span>
            <span className="text-sm font-black tabular-nums text-[var(--text-primary)]">{c.count}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
  href,
  alert,
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  color: 'sky' | 'emerald' | 'violet' | 'amber' | 'slate' | 'red'
  href?: string
  alert?: boolean
}) {
  const colors: Record<string, string> = {
    sky: 'bg-sky-500/10 text-sky-500',
    emerald: 'bg-emerald-500/10 text-emerald-500',
    violet: 'bg-violet-500/10 text-violet-500',
    amber: 'bg-amber-500/10 text-amber-500',
    slate: 'bg-slate-500/10 text-slate-400',
    red: 'bg-red-500/10 text-red-500',
  }
  const inner = (
    <div className={`surface p-4 h-full transition-all hover:shadow-md ${alert ? 'ring-1 ring-red-500/30' : ''} ${href ? 'hover:border-sky-500/30 cursor-pointer' : ''}`}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon size={18} />
        </div>
        {href && <ChevronRight size={14} className="text-[var(--text-muted)] mt-1" />}
      </div>
      <p className="text-xl sm:text-2xl font-black text-[var(--text-primary)] tabular-nums leading-none">{value}</p>
      <p className="text-[10px] font-semibold text-[var(--text-muted)] uppercase tracking-wide mt-2">{label}</p>
      {sub && <p className="text-[10px] text-[var(--text-secondary)] mt-1">{sub}</p>}
    </div>
  )
  if (href) return <Link href={href}>{inner}</Link>
  return inner
}

export function CriticalStockBanner({ count }: { count: number }) {
  if (count <= 0) return null
  return (
    <Link href="/dashboard/stok" className="flex items-center gap-3 p-4 rounded-2xl border border-red-500/25 bg-red-500/5 hover:bg-red-500/10 transition-colors">
      <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center shrink-0">
        <AlertTriangle size={18} className="text-red-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-red-600 dark:text-red-400">Kritik stok uyarısı</p>
        <p className="text-xs text-[var(--text-secondary)]">{count} parça minimum seviyede veya altında</p>
      </div>
      <ChevronRight size={16} className="text-red-400 shrink-0" />
    </Link>
  )
}

export function VitrinSnapshot({ count, value }: { count: number; value: string }) {
  if (count === 0) return null
  return (
    <Link href="/dashboard/vitrin" className="surface p-5 block hover:shadow-md transition-shadow group">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Store size={15} className="text-amber-500" /> Vitrinde
        </h3>
        <ChevronRight size={14} className="text-[var(--text-muted)] group-hover:text-sky-500" />
      </div>
      <p className="text-2xl font-black text-[var(--text-primary)]">{count} cihaz</p>
      <p className="text-xs text-[var(--text-muted)] mt-1">Satış değeri ~ {value}</p>
    </Link>
  )
}

export function useShopGreeting() {
  if (typeof window === 'undefined') return 'AURA İntegra'
  try {
    return getBusinessBranding().shopName
  } catch {
    return 'AURA İntegra'
  }
}
