'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { ClipboardList, Save, AlertTriangle } from 'lucide-react'
import { getStock, onStoreChange, upsertStockItem } from '@/lib/store'
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
    load()
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
      for (const d of diffs) {
        const qty = parseInt(d.counted, 10)
        if (Number.isNaN(qty)) continue
        const item = getStock().find(s => s.id === d.id)
        if (!item) continue
        upsertStockItem({ ...item, stock_qty: qty })
      }
      toast.success(`${diffs.length} kalem güncellendi — sunucuya senkronize ediliyor`)
      load()
    } catch {
      toast.error('Kayıt başarısız')
    } finally {
      setSaving(false)
    }
  }

  if (!mounted) return null

  return (
    <div className="space-y-6 pb-8">
      <div data-tour="sayim-baslik" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ClipboardList size={20} className="text-sky-600" /> Stok Sayım
          </h1>
          <p className="text-sm text-slate-500">Barkod okutarak veya tablo üzerinden sayım yapın</p>
        </div>
        <Link href="/dashboard/stok" className="text-sm text-sky-600 font-semibold hover:underline">← Stok</Link>
      </div>

      <div className="card p-4 space-y-3">
        <p className="text-sm font-semibold text-slate-800">Barkod okuyucu</p>
        <BarcodeScanField onScan={onBarcodeScan} />
        <p className="text-xs text-slate-500">USB barkod okuyucu Enter ile de çalışır. Kamera: BarcodeDetector veya iOS için html5-qrcode.</p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="input max-w-xs"
          placeholder="Parça veya barkod ara..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        {diffs.length > 0 && (
          <span className="text-xs font-semibold text-amber-700 flex items-center gap-1">
            <AlertTriangle size={14} /> {diffs.length} farklı kalem
          </span>
        )}
        <button type="button" onClick={saveCount} disabled={saving || diffs.length === 0} className="btn-primary ml-auto flex items-center gap-2">
          <Save size={16} /> {saving ? 'Kaydediliyor…' : 'Sayımı Kaydet'}
        </button>
      </div>

      <div className="card overflow-x-auto">
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
                      onChange={e => setRows(prev => prev.map(x => x.id === r.id ? { ...x, counted: e.target.value } : x))}
                    />
                  </td>
                  <td className={diff !== 0 ? 'text-amber-600 font-bold' : 'text-slate-400'}>{diff > 0 ? `+${diff}` : diff}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
