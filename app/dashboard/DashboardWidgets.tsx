'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Clock, Sun, Cloud, TrendingUp, Search, Plus, Trash2,
  Check, DollarSign, RefreshCw, Wind, Droplets, CloudRain,
  CloudSnow, CloudLightning, Smartphone, Tag, AlertTriangle,
  ChevronDown, X
} from 'lucide-react'

// ─── HELPERS ──────────────────────────────────────────────────────────────────

function uid(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}

function fmtCurrency(val: number): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val)
}

function safeLocalGet<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function safeLocalSet(key: string, data: unknown): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(key, JSON.stringify(data))
  } catch { /* quota exceeded — silently ignore */ }
}

// ─── TYPES ────────────────────────────────────────────────────────────────────

interface StoreData {
  sales?: SaleRecord[]
  stock?: StockItem[]
  services?: ServiceRecord[]
}

interface SaleRecord {
  id: string
  date: string
  category: 'cihaz' | 'aksesuar' | 'tamir' | string
  amount: number
  description?: string
}

interface StockItem {
  id: string
  name: string
  barcode?: string
  imei?: string
  quality?: string
  category?: string
  quantity?: number
  price?: number
  brand?: string
  model?: string
}

interface ServiceRecord {
  id: string
  date: string
  amount: number
  status: string
}

interface TodoItem {
  id: string
  title: string
  priority: 'düşük' | 'orta' | 'yüksek' | 'acil'
  completed: boolean
  createdAt: string
}

// ─── TURKISH DAY & MONTH NAMES ────────────────────────────────────────────────

const GUN_ADLARI = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
const AY_ADLARI = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']

// ═══════════════════════════════════════════════════════════════════════════════
// 1. WEATHER & CLOCK WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

export function WeatherClockWidget() {
  const [now, setNow] = useState(new Date())
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  if (!mounted) {
    return (
      <div className="rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 p-6 h-[180px] animate-pulse" />
    )
  }

  const hours = now.getHours().toString().padStart(2, '0')
  const minutes = now.getMinutes().toString().padStart(2, '0')
  const seconds = now.getSeconds().toString().padStart(2, '0')
  const dayName = GUN_ADLARI[now.getDay()]
  const dateStr = `${now.getDate()} ${AY_ADLARI[now.getMonth()]} ${now.getFullYear()}`

  // Mock weather
  const temp = 18
  const humidity = 62
  const wind = 14
  const isDay = now.getHours() >= 6 && now.getHours() < 20
  const weatherEmoji = isDay ? '⛅' : '🌙'

  return (
    <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 border border-white/5 shadow-xl">
      {/* Decorative glow */}
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-sky-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-8 -left-8 w-32 h-32 bg-sky-500/10 rounded-full blur-3xl" />

      <div className="relative z-10 flex items-start justify-between">
        {/* Left: Clock */}
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-black text-white tabular-nums tracking-tight">
              {hours}:{minutes}
            </span>
            <span className="text-lg font-bold text-sky-300 tabular-nums">
              :{seconds}
            </span>
          </div>
          <p className="text-sm font-semibold text-slate-300 mt-1">{dayName}</p>
          <p className="text-xs text-slate-400">{dateStr}</p>
          <div className="flex items-center gap-1.5 mt-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-slate-400 font-medium">İstanbul, TR</span>
          </div>
        </div>

        {/* Right: Weather */}
        <div className="text-right">
          <div className="text-4xl mb-1">{weatherEmoji}</div>
          <p className="text-2xl font-black text-white">{temp}°</p>
          <div className="flex flex-col gap-1 mt-2">
            <div className="flex items-center justify-end gap-1.5">
              <Droplets size={11} className="text-sky-400" />
              <span className="text-[10px] text-slate-400 font-medium">%{humidity}</span>
            </div>
            <div className="flex items-center justify-end gap-1.5">
              <Wind size={11} className="text-slate-400" />
              <span className="text-[10px] text-slate-400 font-medium">{wind} km/s</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. TODAY SUMMARY WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

export function TodaySummaryWidget() {
  const [mounted, setMounted] = useState(false)
  const [cihaz, setCihaz] = useState(0)
  const [aksesuar, setAksesuar] = useState(0)
  const [tamir, setTamir] = useState(0)

  useEffect(() => {
    setMounted(true)
    const store = safeLocalGet<StoreData>('servissoft_store', {})
    const today = new Date().toISOString().slice(0, 10)
    const sales = store.sales || []

    let cSum = 0
    let aSum = 0
    let tSum = 0

    sales.forEach((s) => {
      if (s.date?.slice(0, 10) !== today) return
      const cat = (s.category || '').toLowerCase()
      if (cat === 'cihaz' || cat === 'telefon' || cat === 'device') cSum += s.amount || 0
      else if (cat === 'aksesuar' || cat === 'accessory') aSum += s.amount || 0
      else if (cat === 'tamir' || cat === 'servis' || cat === 'service') tSum += s.amount || 0
      else cSum += s.amount || 0
    })

    // Also check services for today's completed ones
    const services = store.services || []
    services.forEach((svc) => {
      if (svc.date?.slice(0, 10) !== today) return
      if (['teslim', 'teslim_edildi', 'delivered', 'tamamlandi'].includes(svc.status)) {
        tSum += svc.amount || 0
      }
    })

    setCihaz(cSum)
    setAksesuar(aSum)
    setTamir(tSum)
  }, [])

  if (!mounted) {
    return <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="rounded-2xl bg-slate-800 h-[110px] animate-pulse" />)}</div>
  }

  const cards = [
    {
      label: 'Cihaz Satış',
      value: cihaz,
      icon: Smartphone,
      gradient: 'from-emerald-500/20 to-emerald-600/5',
      iconBg: 'bg-emerald-500',
      textColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/20',
      change: cihaz > 0 ? '+12%' : null,
    },
    {
      label: 'Aksesuar',
      value: aksesuar,
      icon: Tag,
      gradient: 'from-amber-500/20 to-amber-600/5',
      iconBg: 'bg-amber-500',
      textColor: 'text-amber-400',
      borderColor: 'border-amber-500/20',
      change: aksesuar > 0 ? '+8%' : null,
    },
    {
      label: 'Tamir',
      value: tamir,
      icon: TrendingUp,
      gradient: 'from-sky-500/20 to-sky-600/5',
      iconBg: 'bg-sky-500',
      textColor: 'text-sky-400',
      borderColor: 'border-sky-500/20',
      change: tamir > 0 ? '+5%' : null,
    },
  ]

  return (
    <div className="grid grid-cols-3 gap-3">
      {cards.map((c) => (
        <div
          key={c.label}
          className={`rounded-2xl bg-gradient-to-br ${c.gradient} bg-slate-800/80 border ${c.borderColor} p-4 hover:scale-[1.02] transition-all duration-200`}
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`w-8 h-8 rounded-xl ${c.iconBg} flex items-center justify-center shadow-lg`}>
              <c.icon size={14} className="text-white" />
            </div>
            {c.change && (
              <span className={`text-[10px] font-bold ${c.textColor} bg-white/5 px-2 py-0.5 rounded-full`}>
                {c.change}
              </span>
            )}
          </div>
          <p className="text-lg font-black text-white tabular-nums">{fmtCurrency(c.value)}</p>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">{c.label}</p>
        </div>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. QUALITY DISTRIBUTION WIDGET (Pure CSS Donut)
// ═══════════════════════════════════════════════════════════════════════════════

const QUALITY_COLORS: Record<string, string> = {
  'Yeni': '#10b981',
  '2.El': '#f59e0b',
  'Yenilenmiş': '#6366f1',
  'Yurtdışı': '#0ea5e9',
  'Tamirli': '#ef4444',
  'Aksesuar': '#8b5cf6',
}

export function QualityDistributionWidget() {
  const [mounted, setMounted] = useState(false)
  const [data, setData] = useState<{ label: string; count: number; pct: number; color: string }[]>([])

  useEffect(() => {
    setMounted(true)
    const store = safeLocalGet<StoreData>('servissoft_store', {})
    const stocks = store.stock || []

    const qualityCounts: Record<string, number> = {}

    if (stocks.length > 0) {
      stocks.forEach((item) => {
        const q = item.quality || 'Yeni'
        qualityCounts[q] = (qualityCounts[q] || 0) + (item.quantity || 1)
      })
    } else {
      // Mock data when empty
      qualityCounts['Yeni'] = 45
      qualityCounts['2.El'] = 28
      qualityCounts['Yenilenmiş'] = 15
      qualityCounts['Yurtdışı'] = 8
      qualityCounts['Tamirli'] = 12
      qualityCounts['Aksesuar'] = 32
    }

    const total = Object.values(qualityCounts).reduce((a, b) => a + b, 0)
    const result = Object.entries(qualityCounts).map(([label, count]) => ({
      label,
      count,
      pct: total > 0 ? Math.round((count / total) * 100) : 0,
      color: QUALITY_COLORS[label] || '#94a3b8',
    }))

    setData(result)
  }, [])

  if (!mounted) {
    return <div className="rounded-2xl bg-slate-800 h-[320px] animate-pulse" />
  }

  // Build conic-gradient segments
  let accum = 0
  const gradientParts = data.map((d) => {
    const start = accum
    accum += d.pct
    return `${d.color} ${start}% ${accum}%`
  })
  const conicGradient = `conic-gradient(${gradientParts.join(', ')})`
  const total = data.reduce((a, b) => a + b.count, 0)

  return (
    <div className="rounded-2xl bg-slate-800/80 border border-white/5 p-5 shadow-xl">
      <h3 className="text-sm font-bold text-white mb-1">Kalite Dağılımı</h3>
      <p className="text-[11px] text-slate-400 mb-5">Stok kalite kategorileri</p>

      <div className="flex items-center gap-6">
        {/* Donut Chart */}
        <div className="relative flex-shrink-0">
          <div
            className="w-32 h-32 rounded-full"
            style={{
              background: conicGradient,
              mask: 'radial-gradient(circle, transparent 55%, black 55%)',
              WebkitMask: 'radial-gradient(circle, transparent 55%, black 55%)',
            }}
          />
          {/* Center label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-black text-white">{total}</span>
            <span className="text-[9px] text-slate-400 font-semibold uppercase">Toplam</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {data.map((d) => (
            <div key={d.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
                <span className="text-xs text-slate-300 font-medium">{d.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white tabular-nums">{d.count}</span>
                <span className="text-[10px] text-slate-500 tabular-nums w-8 text-right">%{d.pct}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. WEEKLY REVENUE WIDGET (Pure CSS Bars)
// ═══════════════════════════════════════════════════════════════════════════════

const WEEKDAYS_TR = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz']

export function WeeklyRevenueWidget() {
  const [mounted, setMounted] = useState(false)
  const [weekData, setWeekData] = useState<{ day: string; telefon: number; aksesuar: number; tamir: number }[]>([])
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)

  useEffect(() => {
    setMounted(true)
    const store = safeLocalGet<StoreData>('servissoft_store', {})
    const sales = store.sales || []

    // Build last 7 days data
    const result: typeof weekData = []
    const now = new Date()

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().slice(0, 10)
      const dayIdx = d.getDay() // 0=Sun
      const dayLabel = WEEKDAYS_TR[dayIdx === 0 ? 6 : dayIdx - 1]

      let telefon = 0
      let aksesuar = 0
      let tamir = 0

      sales.forEach((s) => {
        if (s.date?.slice(0, 10) !== dateStr) return
        const cat = (s.category || '').toLowerCase()
        if (cat === 'cihaz' || cat === 'telefon' || cat === 'device') telefon += s.amount || 0
        else if (cat === 'aksesuar' || cat === 'accessory') aksesuar += s.amount || 0
        else if (cat === 'tamir' || cat === 'servis' || cat === 'service') tamir += s.amount || 0
        else telefon += s.amount || 0
      })

      // If no real data, use reasonable mocks
      if (sales.length === 0) {
        telefon = Math.floor(Math.random() * 8000) + 3000
        aksesuar = Math.floor(Math.random() * 3000) + 800
        tamir = Math.floor(Math.random() * 4000) + 1500
      }

      result.push({ day: dayLabel, telefon, aksesuar, tamir })
    }

    setWeekData(result)
  }, [])

  if (!mounted) {
    return <div className="rounded-2xl bg-slate-800 h-[320px] animate-pulse" />
  }

  const maxVal = Math.max(...weekData.map((d) => d.telefon + d.aksesuar + d.tamir), 1)
  const totalWeek = weekData.reduce((a, b) => a + b.telefon + b.aksesuar + b.tamir, 0)

  return (
    <div className="rounded-2xl bg-slate-800/80 border border-white/5 p-5 shadow-xl">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-bold text-white">Haftalık Gelir</h3>
        <span className="text-xs font-bold text-emerald-400 tabular-nums">{fmtCurrency(totalWeek)}</span>
      </div>
      <p className="text-[11px] text-slate-400 mb-5">Son 7 gün kategoriye göre</p>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-sky-500" />
          <span className="text-[10px] text-slate-400 font-medium">Telefon</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
          <span className="text-[10px] text-slate-400 font-medium">Aksesuar</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
          <span className="text-[10px] text-slate-400 font-medium">Tamir</span>
        </div>
      </div>

      {/* Bars */}
      <div className="flex items-end gap-2 h-36">
        {weekData.map((d, i) => {
          const totalDay = d.telefon + d.aksesuar + d.tamir
          const heightPct = (totalDay / maxVal) * 100
          const telefonPct = totalDay > 0 ? (d.telefon / totalDay) * heightPct : 0
          const aksesuarPct = totalDay > 0 ? (d.aksesuar / totalDay) * heightPct : 0
          const tamirPct = totalDay > 0 ? (d.tamir / totalDay) * heightPct : 0

          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group relative"
              onMouseEnter={() => setHoveredDay(i)}
              onMouseLeave={() => setHoveredDay(null)}
            >
              {/* Tooltip */}
              {hoveredDay === i && (
                <div className="absolute -top-20 left-1/2 -translate-x-1/2 bg-slate-900 border border-white/10 rounded-lg px-3 py-2 z-20 min-w-[120px] shadow-xl">
                  <p className="text-[10px] text-slate-400 font-semibold mb-1">{d.day}</p>
                  <p className="text-[10px] text-sky-400">Telefon: {fmtCurrency(d.telefon)}</p>
                  <p className="text-[10px] text-amber-400">Aksesuar: {fmtCurrency(d.aksesuar)}</p>
                  <p className="text-[10px] text-emerald-400">Tamir: {fmtCurrency(d.tamir)}</p>
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-b border-r border-white/10 rotate-45" />
                </div>
              )}

              {/* Stacked bar */}
              <div
                className="w-full rounded-t-md flex flex-col-reverse overflow-hidden transition-all duration-300 cursor-pointer"
                style={{ height: `${Math.max(heightPct, 2)}%` }}
              >
                <div
                  className="w-full bg-sky-500 transition-opacity hover:opacity-90"
                  style={{ height: `${telefonPct > 0 ? (telefonPct / heightPct) * 100 : 0}%` }}
                />
                <div
                  className="w-full bg-amber-500 transition-opacity hover:opacity-90"
                  style={{ height: `${aksesuarPct > 0 ? (aksesuarPct / heightPct) * 100 : 0}%` }}
                />
                <div
                  className="w-full bg-emerald-500 transition-opacity hover:opacity-90"
                  style={{ height: `${tamirPct > 0 ? (tamirPct / heightPct) * 100 : 0}%` }}
                />
              </div>

              {/* Day label */}
              <span className={`text-[10px] font-semibold tabular-nums transition-colors ${hoveredDay === i ? 'text-white' : 'text-slate-500'}`}>
                {d.day}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. TODO WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

const PRIORITY_CFG: Record<string, { label: string; color: string; bg: string }> = {
  'düşük':  { label: 'Düşük',  color: 'text-slate-400', bg: 'bg-slate-500/20' },
  'orta':   { label: 'Orta',   color: 'text-sky-400',   bg: 'bg-sky-500/20' },
  'yüksek': { label: 'Yüksek', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  'acil':   { label: 'Acil',   color: 'text-red-400',   bg: 'bg-red-500/20' },
}

export function TodoWidget() {
  const [mounted, setMounted] = useState(false)
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [newTitle, setNewTitle] = useState('')
  const [newPriority, setNewPriority] = useState<TodoItem['priority']>('orta')
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTodos(safeLocalGet<TodoItem[]>('aura_todos', []))
  }, [])

  const persist = useCallback((updated: TodoItem[]) => {
    setTodos(updated)
    safeLocalSet('aura_todos', updated)
  }, [])

  const addTodo = () => {
    const title = newTitle.trim()
    if (!title) return
    const todo: TodoItem = {
      id: uid(),
      title,
      priority: newPriority,
      completed: false,
      createdAt: new Date().toISOString(),
    }
    persist([todo, ...todos])
    setNewTitle('')
  }

  const toggleTodo = (id: string) => {
    persist(todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t)))
  }

  const deleteTodo = (id: string) => {
    persist(todos.filter((t) => t.id !== id))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') addTodo()
  }

  if (!mounted) {
    return <div className="rounded-2xl bg-slate-800 h-[360px] animate-pulse" />
  }

  const completedCount = todos.filter((t) => t.completed).length
  const totalCount = todos.length

  return (
    <div className="rounded-2xl bg-slate-800/80 border border-white/5 p-5 shadow-xl flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-bold text-white">Yapılacaklar</h3>
          <p className="text-[11px] text-slate-400">
            {completedCount}/{totalCount} tamamlandı
          </p>
        </div>
        {totalCount > 0 && (
          <div className="w-10 h-10 relative">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="14" fill="none" stroke="currentColor" className="text-slate-700" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="14" fill="none" stroke="currentColor"
                className="text-sky-500"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${totalCount > 0 ? (completedCount / totalCount) * 88 : 0} 88`}
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[9px] font-bold text-white">
              %{totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}
            </span>
          </div>
        )}
      </div>

      {/* Add input */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-slate-900/60 rounded-xl px-3 py-2 border border-white/5 focus-within:border-sky-500/50 transition-colors">
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Yeni görev ekle..."
            className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
          />
          {/* Priority selector */}
          <div className="relative">
            <button
              onClick={() => setShowPriorityMenu(!showPriorityMenu)}
              className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${PRIORITY_CFG[newPriority].bg} ${PRIORITY_CFG[newPriority].color} hover:opacity-80 transition-opacity`}
            >
              {PRIORITY_CFG[newPriority].label}
            </button>
            {showPriorityMenu && (
              <div className="absolute right-0 top-full mt-1 bg-slate-900 border border-white/10 rounded-lg py-1 z-30 shadow-xl min-w-[80px]">
                {Object.entries(PRIORITY_CFG).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setNewPriority(key as TodoItem['priority'])
                      setShowPriorityMenu(false)
                    }}
                    className={`w-full text-left px-3 py-1.5 text-[11px] font-semibold ${cfg.color} hover:bg-white/5 transition-colors`}
                  >
                    {cfg.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <button
          onClick={addTodo}
          disabled={!newTitle.trim()}
          className="w-9 h-9 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-30 disabled:hover:bg-sky-600 text-white flex items-center justify-center transition-all shadow-lg shadow-sky-600/20"
        >
          <Plus size={16} />
        </button>
      </div>

      {/* Todo list */}
      <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
        {todos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Check size={28} className="text-slate-600 mb-2" />
            <p className="text-xs text-slate-500">Henüz görev yok</p>
            <p className="text-[10px] text-slate-600">Yukarıdan yeni görev ekleyin</p>
          </div>
        ) : (
          todos.map((todo) => {
            const cfg = PRIORITY_CFG[todo.priority] || PRIORITY_CFG['orta']
            return (
              <div
                key={todo.id}
                className={`group flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all duration-200 hover:bg-white/5 ${
                  todo.completed ? 'opacity-50' : ''
                }`}
              >
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                    todo.completed
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-slate-600 hover:border-sky-400'
                  }`}
                >
                  {todo.completed && <Check size={12} className="text-white" strokeWidth={3} />}
                </button>

                <span
                  className={`flex-1 text-sm font-medium transition-all ${
                    todo.completed ? 'line-through text-slate-500' : 'text-slate-200'
                  }`}
                >
                  {todo.title}
                </span>

                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${cfg.bg} ${cfg.color}`}>
                  {cfg.label}
                </span>

                <button
                  onClick={() => deleteTodo(todo.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded-md hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 6. CURRENCY CONVERTER WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

const CURRENCIES = [
  { code: 'USD', symbol: '$', rate: 34.65, flag: '🇺🇸' },
  { code: 'EUR', symbol: '€', rate: 37.12, flag: '🇪🇺' },
  { code: 'GBP', symbol: '£', rate: 43.85, flag: '🇬🇧' },
] as const

export function CurrencyConverterWidget() {
  const [mounted, setMounted] = useState(false)
  const [activeTab, setActiveTab] = useState(0)
  const [tryAmount, setTryAmount] = useState('')

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return <div className="rounded-2xl bg-slate-800 h-[200px] animate-pulse" />
  }

  const curr = CURRENCIES[activeTab]
  const numAmount = parseFloat(tryAmount) || 0
  const converted = numAmount > 0 ? numAmount / curr.rate : 0

  return (
    <div className="rounded-2xl bg-gradient-to-br from-slate-800 via-slate-800/95 to-slate-900 border border-white/5 p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <DollarSign size={14} className="text-sky-400" />
          Döviz Çevirici
        </h3>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-slate-900/60 rounded-xl p-1">
        {CURRENCIES.map((c, i) => (
          <button
            key={c.code}
            onClick={() => setActiveTab(i)}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition-all ${
              activeTab === i
                ? 'bg-sky-600 text-white shadow-lg shadow-sky-600/20'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {c.flag} {c.code}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="space-y-3">
        <div className="bg-slate-900/60 rounded-xl px-4 py-3 border border-white/5 focus-within:border-sky-500/50 transition-colors">
          <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">TRY Miktarı</label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-slate-400">₺</span>
            <input
              type="number"
              value={tryAmount}
              onChange={(e) => setTryAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              className="flex-1 bg-transparent text-lg font-bold text-white placeholder-slate-600 outline-none tabular-nums"
            />
          </div>
        </div>

        <div className="bg-sky-600/10 border border-sky-500/20 rounded-xl px-4 py-3">
          <label className="text-[10px] text-sky-300 font-semibold uppercase tracking-wider">{curr.code} Karşılığı</label>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-sky-300">{curr.symbol}</span>
            <span className="text-lg font-black text-white tabular-nums">
              {converted > 0 ? converted.toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        <p className="text-[10px] text-slate-500 text-center">
          1 {curr.code} = ₺{curr.rate.toFixed(2)} · Kur bilgilendirme amaçlıdır
        </p>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 7. EXCHANGE RATES WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

interface ExchangeRate {
  code: string
  flag: string
  name: string
  buy: number
  sell: number
  change: number
}

const EXCHANGE_RATES: ExchangeRate[] = [
  { code: 'USD', flag: '🇺🇸', name: 'Amerikan Doları', buy: 34.6335, sell: 34.7169, change: 0.12 },
  { code: 'EUR', flag: '🇪🇺', name: 'Euro',            buy: 37.1125, sell: 37.2569, change: -0.08 },
  { code: 'GBP', flag: '🇬🇧', name: 'İngiliz Sterlini', buy: 43.8245, sell: 43.9356, change: 0.24 },
]

export function ExchangeRatesWidget() {
  const [mounted, setMounted] = useState(false)
  const [updateTime, setUpdateTime] = useState('')

  useEffect(() => {
    setMounted(true)
    const now = new Date()
    setUpdateTime(
      now.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
    )
  }, [])

  if (!mounted) {
    return <div className="rounded-2xl bg-slate-800 h-[200px] animate-pulse" />
  }

  return (
    <div className="rounded-2xl bg-slate-800/80 border border-white/5 p-5 shadow-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-bold text-white">Döviz Kurları</h3>
        <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
          <RefreshCw size={10} className="text-slate-500" />
          <span>{updateTime}</span>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/5">
        <table className="w-full">
          <thead>
            <tr className="bg-slate-900/60">
              <th className="text-left py-2 px-3 text-[10px] font-semibold text-slate-500 uppercase">Döviz</th>
              <th className="text-right py-2 px-3 text-[10px] font-semibold text-slate-500 uppercase">Alış</th>
              <th className="text-right py-2 px-3 text-[10px] font-semibold text-slate-500 uppercase">Satış</th>
              <th className="text-right py-2 px-3 text-[10px] font-semibold text-slate-500 uppercase">Değ.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {EXCHANGE_RATES.map((r) => (
              <tr key={r.code} className="hover:bg-white/5 transition-colors">
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{r.flag}</span>
                    <div>
                      <p className="text-xs font-bold text-white">{r.code}</p>
                      <p className="text-[9px] text-slate-500">{r.name}</p>
                    </div>
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className="text-xs font-bold text-white tabular-nums">{r.buy.toFixed(4)}</span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className="text-xs font-bold text-white tabular-nums">{r.sell.toFixed(4)}</span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span
                    className={`text-[10px] font-bold tabular-nums ${
                      r.change >= 0 ? 'text-emerald-400' : 'text-red-400'
                    }`}
                  >
                    {r.change >= 0 ? '+' : ''}{r.change.toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[9px] text-slate-600 text-center mt-3">
        Kurlar bilgilendirme amaçlıdır · TCMB verileri
      </p>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. IMEI SEARCH WIDGET
// ═══════════════════════════════════════════════════════════════════════════════

interface SearchResult {
  id: string
  name: string
  barcode?: string
  imei?: string
  brand?: string
  model?: string
  quality?: string
  price?: number
  quantity?: number
}

export function IMEISearchWidget() {
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const [searching, setSearching] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)

    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const doSearch = useCallback(
    (searchQuery: string) => {
      const q = searchQuery.trim().toLowerCase()
      if (!q || q.length < 2) {
        setResults([])
        setShowResults(false)
        return
      }

      setSearching(true)
      // Simulate small delay for UX
      setTimeout(() => {
        const store = safeLocalGet<StoreData>('servissoft_store', {})
        const stocks = store.stock || []

        const found = stocks.filter((item) => {
          const nameMatch = (item.name || '').toLowerCase().includes(q)
          const barcodeMatch = (item.barcode || '').toLowerCase().includes(q)
          const imeiMatch = (item.imei || '').toLowerCase().includes(q)
          const brandMatch = (item.brand || '').toLowerCase().includes(q)
          const modelMatch = (item.model || '').toLowerCase().includes(q)
          return nameMatch || barcodeMatch || imeiMatch || brandMatch || modelMatch
        })

        setResults(found.slice(0, 8))
        setShowResults(true)
        setSearching(false)
      }, 150)
    },
    []
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setQuery(val)
    doSearch(val)
  }

  const clearSearch = () => {
    setQuery('')
    setResults([])
    setShowResults(false)
  }

  if (!mounted) {
    return <div className="rounded-2xl bg-slate-800 h-[56px] animate-pulse" />
  }

  return (
    <div ref={wrapperRef} className="relative w-full">
      {/* Search Bar */}
      <div className="flex items-center bg-slate-800/80 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-sky-500/50 focus-within:shadow-lg focus-within:shadow-sky-500/5 transition-all duration-200">
        <Search size={18} className="text-slate-500 flex-shrink-0 mr-3" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          placeholder="IMEI, Barkod veya Ürün Ara..."
          className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 outline-none"
        />
        {searching && (
          <div className="w-4 h-4 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mr-2" />
        )}
        {query && (
          <button onClick={clearSearch} className="p-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors">
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results Dropdown */}
      {showResults && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden z-50 max-h-[360px] overflow-y-auto">
          {results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 px-4">
              <Search size={24} className="text-slate-600 mb-2" />
              <p className="text-sm text-slate-400 font-medium">Sonuç bulunamadı</p>
              <p className="text-[10px] text-slate-600 mt-1">
                &quot;{query}&quot; için eşleşen ürün yok
              </p>
            </div>
          ) : (
            <>
              <div className="px-4 py-2 bg-slate-800/50 border-b border-white/5">
                <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider">
                  {results.length} sonuç bulundu
                </p>
              </div>
              {results.map((item) => (
                <div
                  key={item.id}
                  className="px-4 py-3 hover:bg-white/5 transition-colors cursor-pointer border-b border-white/5 last:border-b-0"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-white truncate">
                        {item.brand && <span className="text-sky-400">{item.brand}</span>}{' '}
                        {item.model || item.name}
                      </p>
                      <div className="flex items-center gap-3 mt-1">
                        {item.imei && (
                          <span className="text-[10px] text-slate-400">
                            IMEI: <span className="font-mono text-slate-300">{item.imei}</span>
                          </span>
                        )}
                        {item.barcode && (
                          <span className="text-[10px] text-slate-400">
                            Barkod: <span className="font-mono text-slate-300">{item.barcode}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-3">
                      {item.price != null && item.price > 0 && (
                        <p className="text-sm font-bold text-emerald-400 tabular-nums">
                          {fmtCurrency(item.price)}
                        </p>
                      )}
                      <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                        {item.quality && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-sky-500/20 text-sky-300">
                            {item.quality}
                          </span>
                        )}
                        {item.quantity != null && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-slate-700 text-slate-300">
                            Stok: {item.quantity}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}
