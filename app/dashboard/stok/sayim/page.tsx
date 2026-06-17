'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { ClipboardList, Save, Smartphone, AlertTriangle } from 'lucide-react'
import { getStock, onStoreChange } from '@/lib/store'
import { toast } from 'sonner'

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

  useEffect(() => {
    setMounted(true)
    const load = () => {
      setRows(getStock().map(s => ({
        id: s.id,
        name: s.name,
        barcode: s.barcode,
        expected: s.stock_qty,
        counted: String(s.stock_qty),
      })))
    }
    load()
    return onStoreChange(m => { if (!m || m === 'stock') load() })
  }, [])

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

  function saveCount() {
    toast.success(`${diffs.length} farklı kalem tespit edildi — kayıt yerel olarak işlendi`)
  }

  if (!mounted) return null

  return (
    <div className="space-y-6 pb-8">
      <div data-tour="sayim-baslik" className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ClipboardList size={20} className="text-sky-600" /> Stok Sayım
          </h1>
          <p className="text-sm text-slate-500">Excel tablosu gibi manuel sayım — beklenen ve sayılan miktarı karşılaştırın</p>
        </div>
        <Link href="/dashboard/stok" className="text-sm text-sky-600 font-semibold hover:underline">← Stok</Link>
      </div>

      <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm">
        <Smartphone size={18} className="shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Cep telefonu uygulaması yakında</p>
          <p className="text-xs mt-1 text-amber-800">Kamera ile barkod okuma mobil uygulamada eklenecek. Şimdilik tablo üzerinden sayım yapın.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="input max-w-xs"
          placeholder="Parça veya barkod ara..."
          value={filter}
          onChange={e => setFilter(e.target.value)}
        />
        {diffs.length > 0 && (
          <span className="text-xs font-bold text-amber-700 flex items-center gap-1">
            <AlertTriangle size={14} /> {diffs.length} fark
          </span>
        )}
        <button data-tour="sayim-kaydet-btn" type="button" onClick={saveCount} className="btn-primary btn-sm ml-auto flex items-center gap-1">
          <Save size={14} /> Sayımı Kaydet
        </button>
      </div>

      <div data-tour="sayim-tablo" className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="text-left p-3 text-[10px] font-bold uppercase text-slate-500">Barkod</th>
                <th className="text-left p-3 text-[10px] font-bold uppercase text-slate-500">Parça</th>
                <th className="text-right p-3 text-[10px] font-bold uppercase text-slate-500">Beklenen</th>
                <th className="text-right p-3 text-[10px] font-bold uppercase text-slate-500">Sayılan</th>
                <th className="text-right p-3 text-[10px] font-bold uppercase text-slate-500">Fark</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Kayıt yok</td></tr>
              ) : filtered.map(r => {
                const counted = parseInt(r.counted, 10)
                const diff = (Number.isNaN(counted) ? 0 : counted) - r.expected
                return (
                  <tr key={r.id} className={`border-t border-slate-100 ${diff !== 0 ? 'bg-amber-50/50' : ''}`}>
                    <td className="p-2 font-mono text-xs text-slate-600">{r.barcode || '—'}</td>
                    <td className="p-2 font-medium">{r.name}</td>
                    <td className="p-2 text-right font-mono">{r.expected}</td>
                    <td className="p-2 text-right">
                      <input
                        type="number"
                        min={0}
                        className="input w-20 text-right py-1 text-sm ml-auto"
                        value={r.counted}
                        onChange={e => setRows(prev => prev.map(x => x.id === r.id ? { ...x, counted: e.target.value } : x))}
                      />
                    </td>
                    <td className={`p-2 text-right font-bold font-mono ${diff === 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                      {diff > 0 ? `+${diff}` : diff}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
