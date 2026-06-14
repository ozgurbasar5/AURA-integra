'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Wrench, Search, ChevronRight, Loader2, CheckCircle2, AlertCircle, Clock,
  ShoppingCart, Wallet, TrendingUp, Package, AlertTriangle,
} from 'lucide-react'
import {
  getServiceOrders, onStoreChange, getFinanceSummary, getSales, getSecondHandDevices,
} from '@/lib/store'
import { loadServiceOrdersFromApi } from '@/lib/service-order-bridge'
import { findRepeatRepairs } from '@/lib/erp-features'
import { usePlanLevel } from '@/lib/plan-context'
import { useUserRole } from '@/lib/role-context'
import {
  TodayActivityWidget, CashSummaryWidget, TechnicianWorkloadWidget,
  PartUsageWidget, QuickNotesWidget, LastShiftSummaryWidget,
} from './DashboardExtraWidgets'
import {
  DashboardHero, QuickActionGrid, ServicePipeline, StatCard,
  CriticalStockBanner, VitrinSnapshot,
} from '@/components/dashboard/DashboardWidgets'
import { DashboardDayHeader } from '@/components/dashboard/DashboardDayHeader'
import { DashboardMiniChart } from '@/components/dashboard/DashboardMiniChart'
import { getBusinessBranding } from '@/lib/business-branding'
import { toast } from 'sonner'

const STATUS: Record<string, { label: string; dot: string; pipelineKey: string }> = {
  waiting_diagnosis: { label: 'Bekliyor', dot: 'bg-slate-400', pipelineKey: 'waiting' },
  in_repair: { label: 'Tamirde', dot: 'bg-sky-500', pipelineKey: 'repair' },
  customer_approval_pending: { label: 'Onay', dot: 'bg-amber-500', pipelineKey: 'approval' },
  ready_for_pickup: { label: 'Hazır', dot: 'bg-emerald-500', pipelineKey: 'ready' },
  parts_waiting: { label: 'Parça Bek.', dot: 'bg-orange-500', pipelineKey: 'parts' },
  delivered: { label: 'Teslim', dot: 'bg-emerald-600', pipelineKey: 'delivered' },
  cancelled: { label: 'İptal', dot: 'bg-red-400', pipelineKey: 'cancelled' },
}

const PIPELINE_KEYS: Record<string, string[]> = {
  waiting: ['waiting_diagnosis'],
  repair: ['in_repair'],
  approval: ['customer_approval_pending'],
  ready: ['ready_for_pickup'],
  parts: ['parts_waiting'],
}

interface OrderRow {
  id: string; job_no: string; customer_name: string; customer_phone: string
  device_brand: string; device_model: string; imei?: string; status: string
  estimated_cost: number; created_at: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(n)
}

function mapOrder(o: {
  id: string; job_no: string; customer_name: string; customer_phone: string
  device_brand: string; device_model: string; imei?: string; status: string
  estimated_cost: number; created_at: string
}): OrderRow {
  return { ...o }
}

export default function DashboardPage() {
  const planLevel = usePlanLevel()
  const { isOwner, homeLabel, role } = useUserRole()
  const isTechnician = role === 'teknisyen'
  const isFinance = role === 'muhasebe'
  const isSales = role === 'satis' || role === 'kasiyer'
  const hasService = planLevel >= 2
  const hasFinance = planLevel >= 3 && !isTechnician
  const router = useRouter()

  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [summary, setSummary] = useState(() => getFinanceSummary())
  const [sales, setSales] = useState(() => getSales())
  const [listFilter, setListFilter] = useState<'active' | 'today' | 'all'>(isTechnician ? 'active' : 'today')
  const [pipelineFilter, setPipelineFilter] = useState<string | null>(null)
  const [shopName, setShopName] = useState('')
  const [remoteStats, setRemoteStats] = useState<{ active_orders?: number; low_stock?: number; today_sales?: number } | null>(null)

  const refresh = useCallback(() => {
    setSummary(getFinanceSummary())
    setSales(getSales())
  }, [])

  const fetchOrders = useCallback(async () => {
    setLoading(true)
    const list = await loadServiceOrdersFromApi(50)
    setOrders(list.map(mapOrder))
    setLoading(false)
  }, [])

  useEffect(() => {
    setMounted(true)
    setShopName(getBusinessBranding().shopName)
    refresh()
    fetchOrders()
    fetch('/api/tenant/stats', { credentials: 'same-origin' })
      .then(r => r.json())
      .then(json => { if (json.stats) setRemoteStats(json.stats) })
      .catch(() => {})
    return onStoreChange(m => {
      refresh()
      if (!m || m === 'service' || m === 'settings') {
        fetchOrders()
        if (m === 'settings') setShopName(getBusinessBranding().shopName)
      }
    })
  }, [refresh, fetchOrders])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const q = search.trim().toLowerCase()
    if (!q) return
    const hit = orders.find(o =>
      o.job_no.toLowerCase().includes(q) ||
      o.imei?.toLowerCase().includes(q) ||
      o.customer_phone.includes(q) ||
      o.customer_name.toLowerCase().includes(q),
    )
    if (hit) router.push(`/dashboard/atolye/${hit.id}`)
    else toast.error('Kayıt bulunamadı')
  }

  const todayStr = new Date().toISOString().slice(0, 10)
  const activeStatuses = ['waiting_diagnosis', 'in_repair', 'customer_approval_pending', 'ready_for_pickup', 'parts_waiting']
  const activeServiceCount = remoteStats?.active_orders ?? orders.filter(o => activeStatuses.includes(o.status)).length
  const lowStockCount = remoteStats?.low_stock ?? summary.criticalStockCount

  const todaySales = useMemo(() => sales.filter(s => s.date?.slice(0, 10) === todayStr), [sales, todayStr])
  const todaySalesTotal = todaySales.reduce((s, x) => s + (x.total_with_vat || x.subtotal || 0), 0)
  const todayProfit = todaySales.reduce((s, x) => s + (x.net_profit || 0), 0)

  const pipelineCounts = useMemo(() => [
    { key: 'waiting', label: 'Bekliyor', count: orders.filter(o => o.status === 'waiting_diagnosis').length, dot: 'bg-slate-400' },
    { key: 'repair', label: 'Tamirde', count: orders.filter(o => o.status === 'in_repair').length, dot: 'bg-sky-500' },
    { key: 'approval', label: 'Onay', count: orders.filter(o => o.status === 'customer_approval_pending').length, dot: 'bg-amber-500' },
    { key: 'ready', label: 'Hazır', count: orders.filter(o => o.status === 'ready_for_pickup').length, dot: 'bg-emerald-500' },
  ], [orders])

  const filteredOrders = useMemo(() => {
    let list = orders
    if (pipelineFilter && PIPELINE_KEYS[pipelineFilter]) {
      list = list.filter(o => PIPELINE_KEYS[pipelineFilter].includes(o.status))
    } else if (listFilter === 'active') {
      list = list.filter(o => activeStatuses.includes(o.status))
    } else if (listFilter === 'today') {
      list = list.filter(o => o.created_at?.slice(0, 10) === todayStr)
    }
    return list
  }, [orders, pipelineFilter, listFilter, todayStr])

  const ready = orders.filter(o => o.status === 'ready_for_pickup')
  const repeatAlerts = hasService && isOwner ? findRepeatRepairs(getServiceOrders()) : []
  const vitrinDevices = planLevel >= 3 ? getSecondHandDevices().filter(d => d.status === 'stokta' && d.showcase) : []
  const vitrinValue = vitrinDevices.reduce((s, d) => s + d.sell_price, 0)

  const subtitle = isTechnician
    ? 'Atölyedeki işleriniz — durum, parça ve teslim takibi.'
    : isFinance
      ? 'Kasa, gelir-gider ve finansal özet.'
      : isSales
        ? 'Satış, kabul ve vitrin — günlük performans.'
        : hasService
          ? 'Servis, satış ve mağaza operasyonlarının tek ekran özeti.'
          : 'Stok ve satış yönetimi.'

  if (!mounted) {
    return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-sky-500" size={28} /></div>
  }

  return (
    <div className="space-y-6 pb-12">
      <DashboardDayHeader shopName={shopName || 'Mağaza'} />
      <DashboardHero homeLabel={homeLabel} subtitle={subtitle} shopName={shopName !== 'AURA İntegra' ? shopName : undefined}>
        {isTechnician ? (
          <>
            <Link href="/dashboard/atolye" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-sky-800 text-sm font-bold hover:bg-sky-50 shadow-lg">
              <Wrench size={15} /> Atölye
            </Link>
          </>
        ) : (
          <>
            <Link href="/dashboard/satis" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-sky-800 text-sm font-bold hover:bg-sky-50 shadow-lg">
              Satış
            </Link>
            {hasService && (
              <Link href="/dashboard/kabul" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 border border-white/25 text-white text-sm font-bold hover:bg-white/20">
                + Kabul
              </Link>
            )}
          </>
        )}
      </DashboardHero>

      <QuickActionGrid role={role} isOwner={isOwner} planLevel={planLevel} />

      {summary.criticalStockCount > 0 && !isTechnician && (
        <CriticalStockBanner count={lowStockCount} />
      )}

      {hasFinance && !isTechnician && <DashboardMiniChart />}

      {/* Metrikler */}
      <div className={`grid gap-3 ${isTechnician ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-2 lg:grid-cols-4 xl:grid-cols-5'}`}>
        {isTechnician ? (
          <>
            <StatCard label="Tamirde" value={String(pipelineCounts[1]?.count ?? 0)} icon={Wrench} color="sky" href="/dashboard/atolye" />
            <StatCard label="Bekleyen" value={String(pipelineCounts[0]?.count ?? 0)} icon={Clock} color="slate" href="/dashboard/atolye" />
            <StatCard label="Teslime Hazır" value={String(pipelineCounts[3]?.count ?? 0)} icon={CheckCircle2} color="emerald" href="/dashboard/atolye" />
            <StatCard label="Onay Bekleyen" value={String(pipelineCounts[2]?.count ?? 0)} icon={AlertCircle} color="amber" href="/dashboard/atolye" />
          </>
        ) : isFinance ? (
          <>
            <StatCard label="Kasa Bakiye" value={fmt(summary.kasaBakiye)} icon={Wallet} color="emerald" href="/dashboard/kasa" />
            <StatCard label="Net Kâr" value={fmt(summary.netKar)} sub="Tüm dönem" icon={TrendingUp} color="violet" href="/dashboard/finans" />
            <StatCard label="Bugün Satış" value={fmt(todaySalesTotal)} icon={ShoppingCart} color="sky" href="/dashboard/satis" />
            <StatCard label="Stok Değeri" value={fmt(summary.totalStockValue)} icon={Package} color="slate" href="/dashboard/stok" />
          </>
        ) : (
          <>
            <StatCard label="Bugün Satış" value={fmt(remoteStats?.today_sales ?? todaySalesTotal)} sub={`${todaySales.length} işlem`} icon={ShoppingCart} color="sky" href="/dashboard/satis" />
            {hasFinance && (
              <StatCard label="Bugün Kâr" value={fmt(todayProfit)} icon={TrendingUp} color="emerald" href="/dashboard/raporlar" />
            )}
            {hasService && (
              <StatCard
                label="Aktif Servis"
                value={String(activeServiceCount)}
                sub={`${ready.length} teslime hazır`}
                icon={Wrench}
                color="violet"
                href="/dashboard/atolye"
              />
            )}
            <StatCard
              label={hasFinance ? 'Kasa' : 'Stok Değeri'}
              value={fmt(hasFinance ? summary.kasaBakiye : summary.totalStockValue)}
              icon={hasFinance ? Wallet : Package}
              color="amber"
              href={hasFinance ? '/dashboard/kasa' : '/dashboard/stok'}
            />
            {lowStockCount > 0 && (
              <StatCard label="Kritik Stok" value={String(lowStockCount)} icon={AlertTriangle} color="red" href="/dashboard/stok" alert />
            )}
          </>
        )}
      </div>

      {hasService && !isFinance && (
        <ServicePipeline counts={pipelineCounts} activeFilter={pipelineFilter} onFilter={setPipelineFilter} />
      )}

      {hasService && (
        <form onSubmit={handleSearch} className="relative max-w-xl">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
          <input
            className="input pl-11 py-3 rounded-2xl"
            placeholder="IMEI, telefon veya servis no ile ara..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </form>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 surface overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--bg-border)]">
            <h2 className="font-bold text-[var(--text-primary)]">
              {isTechnician ? 'Aktif İşler' : hasService ? 'Servis Kayıtları' : 'Son Hareketler'}
            </h2>
            <div className="flex items-center gap-2">
              {hasService && (
                <div className="flex rounded-lg border border-[var(--bg-border)] overflow-hidden text-[10px] font-bold">
                  {(isTechnician ? (['active', 'today', 'all'] as const) : (['today', 'all'] as const)).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => { setListFilter(f); setPipelineFilter(null) }}
                      className={`px-2.5 py-1 ${listFilter === f && !pipelineFilter ? 'bg-sky-600 text-white' : 'bg-[var(--bg-card)] text-[var(--text-muted)] hover:bg-[var(--bg-muted)]'}`}
                    >
                      {f === 'active' ? 'Aktif' : f === 'today' ? 'Bugün' : 'Tümü'}
                    </button>
                  ))}
                </div>
              )}
              {hasService && (
                <Link href="/dashboard/atolye" className="text-xs font-semibold text-sky-500 flex items-center gap-0.5">
                  Tümü <ChevronRight size={12} />
                </Link>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="animate-spin text-sky-500" size={22} /></div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-16 px-6">
              <p className="text-[var(--text-muted)] text-sm mb-4">Bu filtrede kayıt yok</p>
              {hasService && (
                <Link href="/dashboard/kabul" className="btn-primary btn-sm inline-flex items-center gap-2">
                  + Yeni Kabul
                </Link>
              )}
            </div>
          ) : (
            <ul className="divide-y divide-[var(--bg-border)]">
              {filteredOrders.slice(0, 12).map(o => {
                const st = STATUS[o.status] || { label: o.status, dot: 'bg-slate-400' }
                const isReady = o.status === 'ready_for_pickup'
                return (
                  <li key={o.id}>
                    <Link
                      href={`/dashboard/atolye/${o.id}`}
                      className={`flex items-center gap-3 px-5 py-3.5 hover:bg-sky-500/5 transition-colors group ${isReady ? 'bg-emerald-500/5' : ''}`}
                    >
                      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${st.dot}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{o.customer_name}</p>
                        <p className="text-xs text-[var(--text-muted)] truncate font-mono">{o.job_no} · {o.device_brand} {o.device_model}</p>
                      </div>
                      <span className={`text-[10px] font-bold hidden sm:inline px-2 py-0.5 rounded-full ${isReady ? 'bg-emerald-500/15 text-emerald-600' : 'text-[var(--text-secondary)]'}`}>
                        {st.label}
                      </span>
                      {!isTechnician && o.estimated_cost > 0 && (
                        <span className="text-xs font-bold tabular-nums text-[var(--text-primary)]">{fmt(o.estimated_cost)}</span>
                      )}
                      <ChevronRight size={14} className="text-[var(--text-muted)] group-hover:text-sky-500 shrink-0" />
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <div className="space-y-4">
          {isOwner && hasService && ready.length > 0 && (
            <div className="surface p-5 border-emerald-500/20">
              <h3 className="text-sm font-bold text-emerald-600 mb-3 flex items-center gap-2">
                <CheckCircle2 size={15} /> Teslime Hazır ({ready.length})
              </h3>
              <ul className="space-y-2">
                {ready.slice(0, 5).map(o => (
                  <li key={o.id}>
                    <Link href={`/dashboard/atolye/${o.id}`} className="block rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 hover:bg-emerald-500/15">
                      <p className="text-xs font-semibold text-[var(--text-primary)]">{o.customer_name}</p>
                      <p className="text-[10px] text-emerald-600 font-mono">{o.job_no}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {planLevel >= 3 && vitrinDevices.length > 0 && !isTechnician && (
            <VitrinSnapshot count={vitrinDevices.length} value={fmt(vitrinValue)} />
          )}

          {isOwner && hasService && (
            <TodayActivityWidget />
          )}

          {hasFinance && !isTechnician && (
            <>
              <CashSummaryWidget />
              <LastShiftSummaryWidget />
            </>
          )}

          {isOwner && hasService && (
            <TechnicianWorkloadWidget />
          )}

          {isTechnician && hasService && (
            <PartUsageWidget />
          )}

          {isOwner && repeatAlerts.length > 0 && (
            <div className="surface p-5 border-amber-500/20">
              <h3 className="text-sm font-bold text-amber-600 mb-2 flex items-center gap-2">
                <AlertCircle size={15} /> Tekrarlayan Arıza
              </h3>
              {repeatAlerts.slice(0, 3).map(r => (
                <p key={r.imei} className="text-xs text-[var(--text-secondary)] bg-amber-500/10 rounded-lg p-2 mb-1">
                  {r.customer_name} — {r.days_ago} gün önce · {r.previous_job_no}
                </p>
              ))}
            </div>
          )}

          {!isTechnician && <QuickNotesWidget />}
        </div>
      </div>
    </div>
  )
}
