'use client'

import { useState, useEffect, useCallback } from 'react'
import { Wallet, Lock, Unlock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { PageShell, PageHeader, PageCard } from '@/components/ui/PageShell'
import {
  getOpenCashShift, getCashShifts, openCashShift, closeCashShift,
  getCashSummary, onStoreChange, type CashShift,
} from '@/lib/store'
import { formatCurrency } from '@/lib/validators'

function fmt(n: number) {
  return formatCurrency(n)
}

export default function KasaPage() {
  const [mounted, setMounted] = useState(false)
  const [openShift, setOpenShift] = useState<CashShift | undefined>()
  const [history, setHistory] = useState<CashShift[]>([])
  const [cash, setCash] = useState(getCashSummary())
  const [opening, setOpening] = useState('')
  const [closing, setClosing] = useState('')
  const [notes, setNotes] = useState('')

  const refresh = useCallback(() => {
    setOpenShift(getOpenCashShift())
    setHistory(getCashShifts().slice(0, 20))
    setCash(getCashSummary())
  }, [])

  useEffect(() => {
    setMounted(true)
    refresh()
    return onStoreChange(m => { if (!m || m === 'cash' || m === 'finance') refresh() })
  }, [refresh])

  function handleOpen() {
    const bal = Number(opening) || 0
    openCashShift(bal, 'Kasiyer')
    toast.success('Vardiya açıldı')
    setOpening('')
    refresh()
  }

  function handleClose() {
    const bal = Number(closing)
    if (Number.isNaN(bal)) { toast.error('Kapanış tutarı girin'); return }
    const result = closeCashShift(bal, 'Kasiyer', notes)
    if (!result) { toast.error('Açık vardiya yok'); return }
    toast.success(`Vardiya kapandı · Fark: ${fmt(result.difference || 0)}`)
    setClosing('')
    setNotes('')
    refresh()
  }

  if (!mounted) {
    return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-sky-500" size={28} /></div>
  }

  const expected = openShift
    ? openShift.opening_balance + cash.nakit - cash.nakitCikis
    : 0

  return (
    <PageShell>
      <PageHeader
        eyebrow="Finans"
        title="Kasa Vardiyası"
        description="Açılış/kapanış, nakit sayımı ve kasa farkı takibi."
        icon={Wallet}
      />

      <div className="grid md:grid-cols-3 gap-4">
        <div className="surface p-5 rounded-2xl">
          <p className="text-xs font-bold text-slate-500 uppercase">Kasa Bakiye</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{fmt(cash.kasaBakiye)}</p>
        </div>
        <div className="surface p-5 rounded-2xl">
          <p className="text-xs font-bold text-slate-500 uppercase">Bugün Nakit Giriş</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{fmt(cash.nakit)}</p>
        </div>
        <div className="surface p-5 rounded-2xl">
          <p className="text-xs font-bold text-slate-500 uppercase">Bugün Nakit Çıkış</p>
          <p className="text-2xl font-black text-red-600 mt-1">{fmt(cash.nakitCikis)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <PageCard title={openShift ? 'Açık Vardiya' : 'Vardiya Aç'}>
          {openShift ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl text-sm font-semibold">
                <Unlock size={16} /> {new Date(openShift.opened_at).toLocaleString('tr-TR')} — {openShift.opened_by}
              </div>
              <p className="text-sm text-slate-600">Açılış: <strong>{fmt(openShift.opening_balance)}</strong></p>
              <p className="text-sm text-slate-600">Beklenen nakit: <strong>{fmt(expected)}</strong></p>
              <input className="input" type="number" placeholder="Sayım tutarı (₺)" value={closing} onChange={e => setClosing(e.target.value)} />
              <input className="input" placeholder="Not (opsiyonel)" value={notes} onChange={e => setNotes(e.target.value)} />
              <button type="button" onClick={handleClose} className="btn-primary w-full flex items-center justify-center gap-2">
                <Lock size={16} /> Vardiyayı Kapat
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <input className="input" type="number" placeholder="Açılış kasa tutarı (₺)" value={opening} onChange={e => setOpening(e.target.value)} />
              <button type="button" onClick={handleOpen} className="btn-primary w-full flex items-center justify-center gap-2">
                <Unlock size={16} /> Vardiya Aç
              </button>
            </div>
          )}
        </PageCard>

        <PageCard title="Vardiya Geçmişi" noPadding>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-sm text-slate-400 p-5 text-center">Kayıt yok</p>
            ) : history.map(s => (
              <div key={s.id} className="px-5 py-3 flex justify-between items-center text-sm">
                <div>
                  <p className="font-semibold text-slate-800">{new Date(s.opened_at).toLocaleDateString('tr-TR')}</p>
                  <p className="text-xs text-slate-400">{s.status === 'open' ? 'Açık' : 'Kapalı'}</p>
                </div>
                <div className="text-right">
                  <p className="font-mono font-bold">{fmt(s.closing_balance ?? s.opening_balance)}</p>
                  {s.difference !== undefined && (
                    <p className={`text-xs font-bold ${s.difference === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      Fark: {fmt(s.difference)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </PageCard>
      </div>
    </PageShell>
  )
}
