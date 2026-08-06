'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { ClipboardList, Save, AlertTriangle, Minus, Plus } from 'lucide-react'
import { getStock, onStoreChange } from '@/lib/store'
import { loadStockFromApi, submitStockCountViaApi } from '@/lib/stock-bridge'
import { toast } from 'sonner'
import BarcodeScanField from '@/components/barcode/BarcodeScanField'

type CountRow = {
  id: string
  name: string
  barcode: string
  expected: number
  counted: string
}

export default function StokSayimPage() {
  const [mounted, setMounted] = useState(false)
  const [rows, setRows] = useState<CountRow[]>([])
  const [filter, setFilter] = useState('')
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setRows(getStock().map(s => ({
      id: s.id,
      name: s.name,
      barcode: s.barcode,
      expected: s.stock_qty,
      counted: String(s.stock_qty),
    })))
  }, [])

  useEffect(() => {
    setMounted(true)
    void loadStockFromApi({ limit: 200 }).then(() => load())
    return onStoreChange(m => { if (!m || m === 'stock') load() })
  }, [load])

  const filtered = useMemo(() => {
    const q = filter.trim().toLocaleLowerCase('tr-TR')
    if (!q) return rows
    return rows.filter(r =>
      r.name.toLocaleLowerCase('tr-TR').includes(q) ||
      r.barcode.includes(q)
    )
  }, [rows, filter])

  const diffs = useMemo(() => filtered.filter(r => {
    const c = parseInt(r.counted, 10)
    return !Number.isNaN(c) && c !== r.expected
  }), [filtered])

  const setCounted = (id: string, counted: string) => {
    setRows(prev => prev.map(x => x.id === id ? { ...x, counted } : x))
  }

  const bumpCounted = (id: string, delta: number) => {
    setRows(prev => prev.map(r => {
      if (r.id !== id) return r
      const current = parseInt(r.counted, 10)
      const base = Number.isNaN(current) ? r.expected : current
      return { ...r, counted: String(Math.max(0, base + delta)) }
    }))
  }

  const onBarcodeScan = useCallback((code: string) => {
    const match = rows.find(r => r.barcode === code || r.barcode.includes(code))
    if (!match) {
      toast.error(`Barkod bulunamadı: ${code}`)
      return
    }
    setRows(prev => prev.map(r => {
      if (r.id !== match.id) return r
      const current = parseInt(r.counted, 10)
      const next = (Number.isNaN(current) ? r.expected : current) + 1
      return { ...r, counted: String(next) }
    }))
    toast.success(`${match.name} +1`)
  }, [rows])

  async function saveCount() {
    if (diffs.length === 0) {
      toast.info('Kaydedilecek fark yok')
      return
    }
    setSaving(true)
    try {
      const items = diffs
        .map(d => {
          const qty = parseInt(d.counted, 10)
          if (Number.isNaN(qty)) return null
          return { part_id: d.id, counted_qty: qty, expected_qty: d.expected }
        })
        .filter((x): x is { part_id: string; counted_qty: number; expected_qty: number } => x != null)

      await submitStockCountViaApi(items, 'Stok sayım')
      toast.success(`${items.length} kalem sunucuda güncellendi`)
      load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="space-y-6 pb-24 md:pb-8">
      <div data-tour="sayim-baslik" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ClipboardList size={20} className="text-sky-600" /> Stok Sayım
          </h1>
          <p className="text-sm text-slate-500">Barkod okutarak veya listeden sayım yapın</p>
        </div>
        <Link href="/dashboard/stok" className="text-sm text-sky-600 font-semibold hover:underline">← Stok</Link>
      </div>

      <div className="card p-4 space-y-3" data-testid="sayim-barcode">
        <p className="text-sm font-semibold text-slate-800">Barkod okuyucu</p>
        <BarcodeScanField onScan={onBarcodeScan} />
        <p className="text-xs text-slate-500">USB barkod Enter ile çalışır. Kamera: BarcodeDetector veya iOS html5-qrcode.</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="input max-w-xs flex-1 min-w-[10rem]"
          placeholder="Parça veya barkod ara..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        {diffs.length > 0 && (
          <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
            <AlertTriangle size={14} /> {diffs.length} farklı kalem
          </span>
        )}
        <button
          type="button"
          onClick={saveCount}
          disabled={saving || diffs.length === 0}
          className="btn-primary ml-auto flex items-center gap-2 hidden md:inline-flex"
        >
          <Save size={16} /> {saving ? 'Kaydediliyor…' : 'Sayımı Kaydet'}
        </button>
      </div>

      {/* Mobile cards */}
      <div className="mobile-data-card-list" data-testid="sayim-mobile-cards">
        {filtered.map(r => {
          const c = parseInt(r.counted, 10)
          const diff = Number.isNaN(c) ? 0 : c - r.expected
          return (
            <div key={r.id} className="mobile-data-card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 text-sm truncate">{r.name}</p>
                  <p className="font-mono text-[10px] text-slate-400">{r.barcode}</p>
                </div>
                <span className={`text-xs font-bold tabular-nums shrink-0 ${diff !== 0 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {diff > 0 ? `+${diff}` : diff}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">Beklenen: <strong className="text-slate-800">{r.expected}</strong></span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => bumpCounted(r.id, -1)}
                    className="min-h-[44px] min-w-[44px] rounded-xl bg-slate-100 flex items-center justify-center text-slate-700"
                    aria-label="Azalt"
                  >
                    <Minus size={16} />
                  </button>
                  <input
                    className="input w-16 h-11 text-center text-sm font-bold"
                    inputMode="numeric"
                    value={r.counted}
                    onChange={e => setCounted(r.id, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => bumpCounted(r.id, 1)}
                    className="min-h-[44px] min-w-[44px] rounded-xl bg-sky-100 flex items-center justify-center text-sky-700"
                    aria-label="Artır"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Desktop table */}
      <div className="card overflow-x-auto hidden md:block">
        <table className="table-base">
          <thead>
            <tr>
              <th>Parça</th>
              <th>Barkod</th>
              <th>Beklenen</th>
              <th>Sayılan</th>
              <th>Fark</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const c = parseInt(r.counted, 10)
              const diff = Number.isNaN(c) ? 0 : c - r.expected
              return (
                <tr key={r.id}>
                  <td className="font-medium">{r.name}</td>
                  <td className="font-mono text-xs">{r.barcode}</td>
                  <td>{r.expected}</td>
                  <td>
                    <input
                      className="input w-20 h-8 text-center"
                      value={r.counted}
                      onChange={e => setCounted(r.id, e.target.value)}
                    />
                  </td>
                  <td className={diff !== 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}>{diff > 0 ? `+${diff}` : diff}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Sticky save on phone — above bottom nav */}
      <div className="md:hidden fixed inset-x-0 z-30 px-3 pb-[calc(3.5rem+env(safe-area-inset-bottom,0px)+0.5rem)] pointer-events-none">
        <button
          type="button"
          onClick={saveCount}
          disabled={saving || diffs.length === 0}
          className="pointer-events-auto w-full btn-primary flex items-center justify-center gap-2 shadow-lg min-h-[48px]"
        >
          <Save size={16} /> {saving ? 'Kaydediliyor…' : diffs.length ? `Sayımı Kaydet (${diffs.length})` : 'Fark yok'}
        </button>
      </div>
    </div>
  )
}
