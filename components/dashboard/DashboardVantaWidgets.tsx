'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Smartphone, Headphones, Wrench, TrendingUp, TrendingDown,
  Clock, CheckSquare, PieChart as PieIcon,
} from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import {
  onStoreChange, getSales, getServiceOrders, getTodos, getStoreProducts,
  getSecondHandDevices,
} from '@/lib/store'
import { filterByActiveBranch } from '@/lib/branch-scope'

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(n)
}

function isToday(d?: string) {
  return (d || '').slice(0, 10) === new Date().toISOString().slice(0, 10)
}

function isYesterday(d?: string) {
  const y = new Date()
  y.setDate(y.getDate() - 1)
  return (d || '').slice(0, 10) === y.toISOString().slice(0, 10)
}

function pctChange(today: number, yesterday: number): number | null {
  if (yesterday === 0 && today === 0) return null
  if (yesterday === 0) return 100
  return Math.round(((today - yesterday) / yesterday) * 100)
}

function classifySaleItem(name: string): 'device' | 'accessory' | 'repair' {
  const n = name.toLowerCase()
  if (/tamir|servis|onarım|onarim|işçilik|iscilik/.test(n)) return 'repair'
  if (/kılıf|kilif|cam|kablo|şarj|sarj|kulaklık|aksesuar|adaptör|adaptör/.test(n)) return 'accessory'
  if (/iphone|samsung|xiaomi|huawei|telefon|tablet|ipad|watch|saat|cihaz/.test(n)) return 'device'
  return 'accessory'
}

/** Bugün özeti — cihaz / aksesuar / tamir + dünkü % */
export function TodaySalesBreakdownWidget() {
  const [stats, setStats] = useState({ device: 0, accessory: 0, repair: 0, total: 0, change: null as number | null })

  const refresh = useCallback(() => {
    const sales = getSales()
    const todaySales = sales.filter(s => isToday(s.date))
    const yesterdaySales = sales.filter(s => isYesterday(s.date))

    const sumBreakdown = (list: typeof sales) => {
      let device = 0
      let accessory = 0
      let repair = 0
      for (const s of list) {
        const amount = s.total_with_vat || s.subtotal || 0
        for (const it of s.items || []) {
          const part = (it.unit_price * it.qty) / Math.max(s.subtotal || amount, 1) * amount
          const kind = classifySaleItem(it.name)
          if (kind === 'device') device += part
          else if (kind === 'repair') repair += part
          else accessory += part
        }
        if (!s.items?.length) accessory += amount
      }
      return { device, accessory, repair, total: device + accessory + repair }
    }

    const today = sumBreakdown(todaySales)
    const yesterday = sumBreakdown(yesterdaySales)
    setStats({ ...today, change: pctChange(Math.round(today.total), Math.round(yesterday.total)) })
  }, [])

  useEffect(() => {
    refresh()
    return onStoreChange(m => {
      if (['sales', 'branches', 'seed'].includes(m)) refresh()
    })
  }, [refresh])

  const rows = [
    { key: 'device', label: 'Cihaz Satış', value: stats.device, icon: Smartphone, color: 'text-blue-600', bg: 'bg-blue-50' },
    { key: 'accessory', label: 'Aksesuar', value: stats.accessory, icon: Headphones, color: 'text-violet-600', bg: 'bg-violet-50' },
    { key: 'repair', label: 'Tamir / Servis', value: stats.repair, icon: Wrench, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]

  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[var(--text-primary)] text-sm">Bugünün Özeti</h3>
        {stats.change !== null && (
          <span className={`text-[10px] font-bold flex items-center gap-0.5 ${stats.change >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {stats.change >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
            Düne göre %{Math.abs(stats.change)}
          </span>
        )}
      </div>
      <div className="space-y-2.5">
        {rows.map(r => (
          <div key={r.key} className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${r.bg} dark:bg-opacity-20 flex items-center justify-center shrink-0`}>
              <r.icon size={15} className={r.color} />
            </div>
            <span className="text-sm text-[var(--text-secondary)] flex-1">{r.label}</span>
            <span className="text-sm font-bold tabular-nums text-[var(--text-primary)]">{fmt(r.value)}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 pt-3 border-t border-[var(--bg-border)] flex justify-between text-xs">
        <span className="text-[var(--text-muted)]">Toplam ciro</span>
        <span className="font-bold text-[var(--text-primary)]">{fmt(stats.total)}</span>
      </div>
    </div>
  )
}

type ActivityItem = { id: string; label: string; sub: string; at: string; kind: 'sale' | 'service' }

/** Son işlemler timeline */
export function RecentActivityWidget() {
  const [items, setItems] = useState<ActivityItem[]>([])

  const refresh = useCallback(() => {
    const sales = getSales()
      .slice()
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 4)
      .map(s => ({
        id: `sale-${s.id}`,
        label: `Satış · ${s.customer_name || 'Perakende'}`,
        sub: fmt(s.total_with_vat || s.subtotal || 0),
        at: s.date,
        kind: 'sale' as const,
      }))

    const orders = filterByActiveBranch(getServiceOrders())
      .slice()
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .slice(0, 4)
      .map(o => ({
        id: `svc-${o.id}`,
        label: `${o.job_no} · ${o.customer_name}`,
        sub: o.status,
        at: o.updated_at || o.created_at,
        kind: 'service' as const,
      }))

    setItems([...sales, ...orders]
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
      .slice(0, 8))
  }, [])

  useEffect(() => {
    refresh()
    return onStoreChange(m => {
      if (['sales', 'service', 'branches', 'seed'].includes(m)) refresh()
    })
  }, [refresh])

  return (
    <div className="surface p-5">
      <h3 className="font-bold text-[var(--text-primary)] text-sm mb-4 flex items-center gap-2">
        <Clock size={15} className="text-sky-500" />
        Son İşlemler
      </h3>
      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">Henüz kayıt yok</p>
      ) : (
        <ul className="space-y-3">
          {items.map(it => (
            <li key={it.id} className="flex gap-3">
              <div className={`w-1.5 rounded-full shrink-0 ${it.kind === 'sale' ? 'bg-emerald-500' : 'bg-sky-500'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-[var(--text-primary)] truncate">{it.label}</p>
                <p className="text-[10px] text-[var(--text-muted)]">{it.sub}</p>
              </div>
              <span className="text-[9px] text-[var(--text-muted)] shrink-0">
                {new Date(it.at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/** Yapılacaklar özeti — ilk 3 madde */
export function TodosPreviewWidget() {
  const [todos, setTodos] = useState<{ id: string; title: string; done: boolean }[]>([])

  const refresh = useCallback(() => {
    setTodos(
      getTodos()
        .filter(t => !t.completed)
        .slice(0, 3)
        .map(t => ({ id: t.id, title: t.title, done: t.completed })),
    )
  }, [])

  useEffect(() => {
    refresh()
    return onStoreChange(m => {
      if (m === 'todos' || m === 'seed') refresh()
    })
  }, [refresh])

  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-[var(--text-primary)] text-sm flex items-center gap-2">
          <CheckSquare size={15} className="text-amber-500" />
          Yapılacaklar
        </h3>
        <Link href="/dashboard/yapilacaklar" className="text-[10px] font-bold text-sky-500">Tümü</Link>
      </div>
      {todos.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">Açık görev yok</p>
      ) : (
        <ul className="space-y-2">
          {todos.map(t => (
            <li key={t.id} className="text-xs text-[var(--text-secondary)] flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 shrink-0" />
              <span className="line-clamp-2">{t.title}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const QUALITY_COLORS = ['#0ea5e9', '#8b5cf6', '#f59e0b', '#64748b', '#10b981']

/** Ürün kalite dağılımı — vitrin / ikinci el / stok */
export function QualityDistributionWidget() {
  const [data, setData] = useState<{ name: string; value: number }[]>([])

  const refresh = useCallback(() => {
    const products = getStoreProducts().filter(p => p.is_active)
    const secondHand = getSecondHandDevices().filter(d => d.status !== 'satildi')
    const vitrin = secondHand.filter(d => d.showcase).length
    const ikinciEl = secondHand.filter(d => !d.showcase).length
    const stokSifir = products.filter(p => p.quality === 'sifir' || !p.quality).length
    const stokIkinci = products.filter(p =>
      p.quality === 'ikinci_el' || p.quality === 'yenilenmis' || p.quality === 'tamirli',
    ).length

    setData([
      { name: 'Vitrin', value: vitrin },
      { name: '2. El', value: ikinciEl },
      { name: 'Sıfır Stok', value: stokSifir },
      { name: 'Yenilenmiş', value: stokIkinci },
    ].filter(d => d.value > 0))
  }, [])

  useEffect(() => {
    refresh()
    return onStoreChange(m => {
      if (['storeProducts', 'secondHand', 'branches', 'seed'].includes(m)) refresh()
    })
  }, [refresh])

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data])

  return (
    <div className="surface p-5">
      <h3 className="font-bold text-[var(--text-primary)] text-sm mb-3 flex items-center gap-2">
        <PieIcon size={15} className="text-violet-500" />
        Ürün Kalite Dağılımı
      </h3>
      {data.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">Stok verisi yok</p>
      ) : (
        <>
          <div className="h-36">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={36} outerRadius={56} paddingAngle={2}>
                  {data.map((_, i) => (
                    <Cell key={i} fill={QUALITY_COLORS[i % QUALITY_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v) => [`${Number(v ?? 0)} adet`, '']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="mt-2 space-y-1">
            {data.map((d, i) => (
              <li key={d.name} className="flex items-center justify-between text-[10px]">
                <span className="flex items-center gap-1.5 text-[var(--text-secondary)]">
                  <span className="w-2 h-2 rounded-full" style={{ background: QUALITY_COLORS[i % QUALITY_COLORS.length] }} />
                  {d.name}
                </span>
                <span className="font-bold tabular-nums text-[var(--text-primary)]">
                  {total ? Math.round((d.value / total) * 100) : 0}%
                </span>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  )
}
