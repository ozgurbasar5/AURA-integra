'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2, Wrench, Inbox, Banknote, CreditCard, Wallet,
  Users2, Package2, StickyNote, Plus, X, TrendingUp
} from 'lucide-react'
import {
  onStoreChange, getCashSummary, getTodayActivity,
  getTechnicianWorkload, getPartUsageThisWeek, getCashShifts,
} from '@/lib/store'

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(n)
}

// ─── Bugün Ne Yapıldı ─────────────────────────────────────────────────────────

export function TodayActivityWidget() {
  const [data, setData] = useState({ delivered: 0, repaired: 0, newOrders: 0, salesCount: 0, salesTotal: 0, profitToday: 0 })
  const refresh = useCallback(() => setData(getTodayActivity()), [])
  useEffect(() => { refresh(); return onStoreChange(refresh) }, [refresh])

  const items = [
    { label: 'Yeni Gelen', value: data.newOrders, icon: Inbox, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Tamir Edilen', value: data.repaired, icon: Wrench, color: 'text-sky-600', bg: 'bg-sky-50' },
    { label: 'Teslim Edilen', value: data.delivered, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  ]
  return (
    <div className="surface p-5">
      <h3 className="font-bold text-[var(--text-primary)] text-sm mb-4">Bugün Ne Yapıldı?</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
        {items.map(i => (
          <div key={i.label} className="text-center">
            <div className={`w-11 h-11 rounded-xl ${i.bg} dark:bg-opacity-20 flex items-center justify-center mx-auto mb-2`}>
              <i.icon size={18} className={i.color} />
            </div>
            <p className="text-2xl font-black text-[var(--text-primary)]">{i.value}</p>
            <p className="text-[10px] text-[var(--text-muted)] font-semibold">{i.label}</p>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 border-t border-[var(--bg-border)]">
        <span className="text-xs text-[var(--text-secondary)]">{data.salesCount} satış · Ciro</span>
        <span className="text-sm font-bold text-[var(--text-primary)]">{fmt(data.salesTotal)}</span>
      </div>
    </div>
  )
}

// ─── Kasa Özeti ───────────────────────────────────────────────────────────────

export function CashSummaryWidget() {
  const [c, setC] = useState({ nakit: 0, kart: 0, diger: 0, toplam: 0, nakitCikis: 0, kartCikis: 0, kasaBakiye: 0 })
  const refresh = useCallback(() => {
    const today = new Date().toISOString().slice(0, 10)
    setC(getCashSummary({ from: `${today}T00:00:00`, to: new Date().toISOString() }))
  }, [])
  useEffect(() => { refresh(); return onStoreChange(refresh) }, [refresh])

  const rows = [
    { label: 'Nakit', value: c.nakit, icon: Banknote, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Kart / POS', value: c.kart, icon: CreditCard, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Diğer', value: c.diger, icon: Wallet, color: 'text-slate-600', bg: 'bg-slate-50' },
  ]
  return (
    <div className="surface p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-[var(--text-primary)] text-sm">Bugün Kasa Özeti</h3>
        <span className="text-xs font-bold px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-300">
          Bakiye: {fmt(c.kasaBakiye)}
        </span>
      </div>
      <div className="space-y-2.5">
        {rows.map(r => (
          <div key={r.label} className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg ${r.bg} dark:bg-opacity-20 flex items-center justify-center shrink-0`}>
              <r.icon size={15} className={r.color} />
            </div>
            <span className="text-sm text-[var(--text-secondary)] flex-1">{r.label}</span>
            <span className="text-sm font-bold text-[var(--text-primary)] tabular-nums">{fmt(r.value)}</span>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-3 mt-3 border-t border-[var(--bg-border)]">
        <span className="text-sm font-semibold text-[var(--text-secondary)]">Toplam Tahsilat</span>
        <span className="text-base font-black text-emerald-600 tabular-nums">{fmt(c.toplam)}</span>
      </div>
    </div>
  )
}

// ─── Son Vardiya Özeti ───────────────────────────────────────────────────────

export function LastShiftSummaryWidget() {
  const [shift, setShift] = useState<ReturnType<typeof getCashShifts>[0] | null>(null)
  const refresh = useCallback(() => {
    setShift(getCashShifts().find(s => s.status === 'closed') ?? null)
  }, [])
  useEffect(() => { refresh(); return onStoreChange(m => { if (!m || m === 'cashShifts') refresh() }) }, [refresh])

  if (!shift?.closed_at) return null
  return (
    <div className="surface p-5">
      <h3 className="font-bold text-[var(--text-primary)] text-sm mb-2">Son Gün Sonu</h3>
      <p className="text-xs text-[var(--text-muted)]">
        {new Date(shift.closed_at).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
      </p>
      <p className={`text-lg font-black mt-2 tabular-nums ${(shift.difference ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
        Fark: {fmt(shift.difference ?? 0)}
      </p>
    </div>
  )
}

// ─── Teknisyen İş Yükü ────────────────────────────────────────────────────────

export function TechnicianWorkloadWidget() {
  const [rows, setRows] = useState<{ name: string; active: number; total: number }[]>([])
  const refresh = useCallback(() => setRows(getTechnicianWorkload()), [])
  useEffect(() => { refresh(); return onStoreChange(refresh) }, [refresh])

  const maxTotal = Math.max(1, ...rows.map(r => r.total))
  return (
    <div className="surface p-5">
      <h3 className="font-bold text-[var(--text-primary)] text-sm mb-1 flex items-center gap-1.5">
        <Users2 size={15} className="text-sky-500" /> Teknisyen İş Yükü
      </h3>
      <p className="text-[11px] text-[var(--text-muted)] mb-4">Kim kaç servise bakıyor</p>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">Henüz servis kaydı yok</p>
      ) : (
        <div className="space-y-3">
          {rows.slice(0, 5).map(r => {
            const initials = r.name === 'Atanmadı' ? '—' : r.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
            return (
              <div key={r.name}>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 text-[9px] font-bold flex items-center justify-center shrink-0">{initials}</div>
                  <span className="text-xs font-medium text-[var(--text-secondary)] flex-1 truncate">{r.name}</span>
                  <span className="text-xs text-slate-500">
                    <span className="font-bold text-amber-600">{r.active}</span> aktif / {r.total}
                  </span>
                </div>
                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden ml-8">
                  <div className="h-full bg-sky-500 rounded-full transition-all" style={{ width: `${(r.total / maxTotal) * 100}%` }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Parça Kullanımı (bu hafta) ──────────────────────────────────────────────

export function PartUsageWidget() {
  const [rows, setRows] = useState<{ name: string; qty: number }[]>([])
  const refresh = useCallback(() => setRows(getPartUsageThisWeek()), [])
  useEffect(() => { refresh(); return onStoreChange(refresh) }, [refresh])

  const maxQty = Math.max(1, ...rows.map(r => r.qty))
  return (
    <div className="surface p-5">
      <h3 className="font-bold text-[var(--text-primary)] text-sm mb-1 flex items-center gap-1.5">
        <Package2 size={15} className="text-emerald-500" /> En Çok Kullanılan Parça
      </h3>
      <p className="text-[11px] text-[var(--text-muted)] mb-4">Son 7 gün</p>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-4">Bu hafta satış/parça kaydı yok</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r, i) => (
            <div key={r.name + i}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-700 truncate flex-1">{r.name}</span>
                <span className="text-xs font-bold text-slate-900">{r.qty} adet</span>
              </div>
              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${(r.qty / maxQty) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Hızlı Notlar ─────────────────────────────────────────────────────────────

interface QuickNote { id: string; text: string; created_at: string }
const NOTES_KEY = 'aura_quick_notes'

function loadNotes(): QuickNote[] {
  try { return JSON.parse(localStorage.getItem(NOTES_KEY) || '[]') } catch { return [] }
}
function saveNotes(notes: QuickNote[]) {
  localStorage.setItem(NOTES_KEY, JSON.stringify(notes))
}

export function QuickNotesWidget() {
  const [notes, setNotes] = useState<QuickNote[]>([])
  const [input, setInput] = useState('')

  useEffect(() => { setNotes(loadNotes()) }, [])

  const add = () => {
    if (!input.trim()) return
    const next = [{ id: Date.now().toString(36), text: input.trim(), created_at: new Date().toISOString() }, ...notes]
    setNotes(next); saveNotes(next); setInput('')
  }
  const remove = (id: string) => {
    const next = notes.filter(n => n.id !== id)
    setNotes(next); saveNotes(next)
  }

  return (
    <div className="surface p-5">
      <h3 className="font-bold text-[var(--text-primary)] text-sm mb-3 flex items-center gap-1.5">
        <StickyNote size={15} className="text-amber-500" /> Hızlı Notlar
        <span className="text-[10px] font-normal text-slate-400 ml-1">(yerel)</span>
      </h3>
      <div className="flex gap-2 mb-3">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Yarın bak, parça bekliyor..."
          className="input py-2 text-sm flex-1"
        />
        <button onClick={add} className="btn-primary btn-sm px-3"><Plus size={14} /></button>
      </div>
      {notes.length === 0 ? (
        <p className="text-xs text-slate-400 text-center py-3">Not yok. Hatırlatma ekleyin.</p>
      ) : (
        <div className="space-y-1.5 max-h-44 overflow-y-auto">
          {notes.map(n => (
            <div key={n.id} className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50/60 border border-amber-100 group">
              <span className="text-sm text-slate-700 flex-1 break-words">{n.text}</span>
              <button onClick={() => remove(n.id)} className="text-slate-300 hover:text-red-500 transition-colors shrink-0">
                <X size={13} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
