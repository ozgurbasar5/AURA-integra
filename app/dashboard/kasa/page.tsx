'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Wallet, Lock, Unlock, Loader2, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { PageShell, PageHeader, PageCard } from '@/components/ui/PageShell'
import { openCashShiftViaApi, closeCashShiftViaApi, loadCashShiftsFromApi } from '@/lib/cash-bridge'
import {
  getOpenCashShift, getCashShifts,
  getCashSummary, onStoreChange, attachShiftReport, type CashShift,
} from '@/lib/store'
import { buildShiftReport, suggestOpeningCash } from '@/lib/eod-report'
import { getBusinessBranding } from '@/lib/business-branding'
import { formatCurrency } from '@/lib/validators'
import { parseLocaleNumber } from '@/lib/parse-locale-number'
import { useUserRole } from '@/lib/role-context'
import { isOwnerRole } from '@/lib/role-access'

function fmt(n: number) {
  return formatCurrency(n)
}

export default function KasaPage() {
  const router = useRouter()
  const { role } = useUserRole()
  const cashier = role === 'kasiyer' ? 'Kasiyer' : isOwnerRole(role) ? 'Sahip' : 'Personel'

  const [mounted, setMounted] = useState(false)
  const [openShift, setOpenShift] = useState<CashShift | undefined>()
  const [history, setHistory] = useState<CashShift[]>([])
  const [shiftCash, setShiftCash] = useState(getCashSummary())
  const [opening, setOpening] = useState('')
  const [closing, setClosing] = useState('')
  const [notes, setNotes] = useState('')
  const [adjDelta, setAdjDelta] = useState('')
  const [adjReason, setAdjReason] = useState('')
  const [adjBusy, setAdjBusy] = useState(false)
  const canAdjust = isOwnerRole(role)

  const refresh = useCallback(() => {
    const open = getOpenCashShift()
    setOpenShift(open)
    setHistory(getCashShifts().slice(0, 20))
    if (open) {
      setShiftCash(getCashSummary({ from: open.opened_at, to: new Date().toISOString() }))
    } else {
      const today = new Date().toISOString().slice(0, 10)
      setShiftCash(getCashSummary({ from: `${today}T00:00:00`, to: new Date().toISOString() }))
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    void loadCashShiftsFromApi().then(() => {
      refresh()
      if (!getOpenCashShift()) {
        const suggested = suggestOpeningCash()
        if (suggested > 0) setOpening(String(suggested))
      }
    })
    return onStoreChange(m => { if (!m || m === 'cashShifts' || m === 'cash' || m === 'finance' || m === 'sales') refresh() })
  }, [refresh])

  function handleOpen() {
    const bal = Number(opening) || 0
    void openCashShiftViaApi(bal, cashier).then(() => {
      toast.success('Vardiya açıldı')
      setOpening('')
      refresh()
    }).catch(err => toast.error(err instanceof Error ? err.message : 'Vardiya açılamadı'))
  }

  function handleClose() {
    const bal = Number(closing)
    if (Number.isNaN(bal)) { toast.error('Kapanış tutarı girin'); return }
    void closeCashShiftViaApi(bal, cashier, notes).then(result => {
      if (!result) { toast.error('Açık vardiya yok'); return }
      const report = buildShiftReport(result, getBusinessBranding().shopName)
      attachShiftReport(result.id, report as unknown as Record<string, unknown>)
      toast.success(`Vardiya kapandı · Fark: ${fmt(result.difference || 0)}`)
      setClosing('')
      setNotes('')
      refresh()
      router.push(`/dashboard/kasa/rapor/${result.id}`)
    }).catch(err => toast.error(err instanceof Error ? err.message : 'Vardiya kapatılamadı'))
  }

  if (!mounted) {
    return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-sky-500" size={28} /></div>
  }

  const expected = openShift
    ? openShift.opening_balance + shiftCash.nakit - shiftCash.nakitCikis
    : 0

  const cashLabel = openShift ? 'Vardiya Nakit Giriş' : 'Bugün Nakit Giriş'

  return (
    <PageShell>
      <PageHeader
        data-tour="kasa-baslik"
        eyebrow="Finans"
        title="Kasa Vardiyası"
        description="Açılış/kapanış, nakit sayımı ve gün sonu Z raporu."
        icon={Wallet}
      />

      <div data-tour="kasa-ozet-kartlar" className="grid md:grid-cols-3 gap-4">
        <div className="surface p-5 rounded-2xl">
          <p className="text-xs font-bold text-slate-500 uppercase">Kasa Bakiye</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{fmt(shiftCash.kasaBakiye)}</p>
        </div>
        <div className="surface p-5 rounded-2xl">
          <p className="text-xs font-bold text-slate-500 uppercase">{cashLabel}</p>
          <p className="text-2xl font-black text-emerald-600 mt-1">{fmt(shiftCash.nakit)}</p>
        </div>
        <div className="surface p-5 rounded-2xl">
          <p className="text-xs font-bold text-slate-500 uppercase">{openShift ? 'Vardiya Nakit Çıkış' : 'Bugün Nakit Çıkış'}</p>
          <p className="text-2xl font-black text-red-600 mt-1">{fmt(shiftCash.nakitCikis)}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <PageCard data-tour="kasa-vardiya-panel" title={openShift ? 'Açık Vardiya' : 'Vardiya Aç'}>
          {openShift ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-2 rounded-xl text-sm font-semibold">
                <Unlock size={16} /> {new Date(openShift.opened_at).toLocaleString('tr-TR')} — {openShift.opened_by}
              </div>
              <p className="text-sm text-slate-600">Açılış: <strong>{fmt(openShift.opening_balance)}</strong></p>
              <p className="text-sm text-slate-600">Beklenen nakit: <strong>{fmt(expected)}</strong></p>
              <input className="input" type="number" placeholder="Sayım tutarı (₺)" value={closing} onChange={e => setClosing(e.target.value)} />
              <input className="input" placeholder="Not (opsiyonel)" value={notes} onChange={e => setNotes(e.target.value)} />
              <button data-tour="kasa-vardiya-kapat-btn" type="button" onClick={handleClose} className="btn-primary w-full flex items-center justify-center gap-2">
                <Lock size={16} /> Vardiyayı Kapat & Rapor
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-slate-500">Sabah kasadaki nakit tutarını girin. Önerilen: {fmt(suggestOpeningCash())}</p>
              <input data-tour="kasa-acilis-input" className="input" type="number" placeholder="Açılış kasa tutarı (₺)" value={opening} onChange={e => setOpening(e.target.value)} />
              <button data-tour="kasa-vardiya-ac-btn" type="button" onClick={handleOpen} className="btn-primary w-full flex items-center justify-center gap-2">
                <Unlock size={16} /> Vardiya Aç
              </button>
            </div>
          )}
        </PageCard>

        <PageCard data-tour="kasa-gecmis" title="Vardiya Geçmişi" noPadding>
          <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-sm text-slate-400 p-5 text-center">Kayıt yok</p>
            ) : history.map(s => (
              <div key={s.id} className="px-5 py-3 flex justify-between items-center text-sm">
                <div>
                  <p className="font-semibold text-slate-800">{new Date(s.opened_at).toLocaleDateString('tr-TR')}</p>
                  <p className="text-xs text-slate-400">{s.status === 'open' ? 'Açık' : 'Kapalı'}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <p className="font-mono font-bold">{fmt(s.closing_balance ?? s.opening_balance)}</p>
                  {s.difference !== undefined && (
                    <p className={`text-xs font-bold ${s.difference === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                      Fark: {fmt(s.difference)}
                    </p>
                  )}
                  {s.status === 'closed' && (
                    <Link href={`/dashboard/kasa/rapor/${s.id}`} className="text-xs text-sky-600 flex items-center gap-1">
                      <FileText size={12} /> Rapor
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        </PageCard>
      </div>

      {canAdjust && (
        <PageCard title="Kasa Düzeltme">
          <p className="text-xs text-slate-500 mb-3">
            Eski bug veya sayım farkı için nakit bakiyeyi düzeltin. İşlem loglanır (Kasa Düzeltme).
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              className="input sm:w-40"
              type="number"
              placeholder="Δ tutar (±₺)"
              value={adjDelta}
              onChange={e => setAdjDelta(e.target.value)}
            />
            <input
              className="input flex-1"
              placeholder="Gerekçe (zorunlu)"
              value={adjReason}
              onChange={e => setAdjReason(e.target.value)}
            />
            <button
              type="button"
              disabled={adjBusy}
              className="btn-secondary whitespace-nowrap"
              onClick={() => {
                const delta = parseLocaleNumber(adjDelta)
                if (!Number.isFinite(delta) || delta === 0) { toast.error('Geçerli tutar girin (örn. 50,5)'); return }
                if (!delta || !adjReason.trim()) {
                  toast.error('Tutar ve gerekçe girin')
                  return
                }
                setAdjBusy(true)
                void fetch('/api/tenant/kasa/adjust', {
                  method: 'POST',
                  credentials: 'same-origin',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ delta, reason: adjReason.trim() }),
                })
                  .then(async r => {
                    const j = await r.json()
                    if (!r.ok) throw new Error(j.error || 'Düzeltme başarısız')
                    toast.success(`Kasa güncellendi: ${fmt(j.kasa_balance)}`)
                    setAdjDelta('')
                    setAdjReason('')
                    refresh()
                  })
                  .catch(e => toast.error(e instanceof Error ? e.message : 'Hata'))
                  .finally(() => setAdjBusy(false))
              }}
            >
              {adjBusy ? <Loader2 className="animate-spin" size={14} /> : 'Uygula'}
            </button>
          </div>
        </PageCard>
      )}
    </PageShell>
  )
}
