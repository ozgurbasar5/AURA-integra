'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Store, Plus, Loader2, Printer, Battery, Sparkles, Tag, Eye, EyeOff, Search,
} from 'lucide-react'
import { toast } from 'sonner'
import { PageShell, PageHeader, PageCard } from '@/components/ui/PageShell'
import {
  getSecondHandDevices, markSecondHandSold,
  onStoreChange, type SecondHandDevice,
} from '@/lib/store'
import { createShowcaseViaApi, loadShowcaseFromApi, updateShowcaseViaApi } from '@/lib/showcase-bridge'
import { formatCurrency } from '@/lib/validators'
import BarcodeLabelSheet from '@/components/labels/BarcodeLabelSheet'
import { vitrinLabelFromDevice, cosmeticLabel } from '@/lib/barcode-labels'

const CONDITION: Record<string, string> = {
  mukemmel: 'Mükemmel',
  iyi: 'İyi',
  orta: 'Orta',
  kotu: 'Kötü',
}

const EMPTY_FORM = {
  brand: 'Samsung',
  model: '',
  imei: '',
  condition: 'iyi' as SecondHandDevice['condition'],
  cosmetic_score: '8',
  battery_health: '92',
  color: '',
  storage: '128 GB',
  buy_price: '',
  sell_price: '',
  notes: '',
  showcase: true,
}

function VitrinContent() {
  const searchParams = useSearchParams()
  const [mounted, setMounted] = useState(false)
  const [devices, setDevices] = useState<SecondHandDevice[]>([])
  const [tab, setTab] = useState<'vitrin' | 'all' | 'sold'>('vitrin')
  const [search, setSearch] = useState(searchParams.get('code') || '')
  const [showForm, setShowForm] = useState(false)
  const [printLabels, setPrintLabels] = useState<ReturnType<typeof vitrinLabelFromDevice>[] | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const refresh = useCallback(() => setDevices(getSecondHandDevices()), [])

  useEffect(() => {
    setMounted(true)
    void loadShowcaseFromApi().then(() => refresh())
    const code = searchParams.get('code')
    if (code) setSearch(code)
    return onStoreChange(m => { if (!m || m === 'secondhand') refresh() })
  }, [refresh, searchParams])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    try {
      await createShowcaseViaApi({
        brand: form.brand,
        model: form.model || '—',
        imei: form.imei || undefined,
        condition: form.condition,
        cosmetic_score: Number(form.cosmetic_score) || 8,
        battery_health: form.battery_health ? Number(form.battery_health) : undefined,
        color: form.color || undefined,
        storage: form.storage || undefined,
        buy_price: Number(form.buy_price) || 0,
        sell_price: Number(form.sell_price) || 0,
        notes: form.notes || undefined,
        showcase: form.showcase,
      })
      toast.success('Vitrin cihazı eklendi')
      setShowForm(false)
      setForm(EMPTY_FORM)
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eklenemedi')
    }
  }

  function printDevice(d: SecondHandDevice) {
    setPrintLabels([vitrinLabelFromDevice(d)])
    setTimeout(() => window.print(), 120)
  }

  async function sellViaPos(d: SecondHandDevice) {
    const uuidOk = /^[0-9a-f-]{36}$/i.test(d.id)
    if (!uuidOk) {
      markSecondHandSold(d.id)
      refresh()
      toast.warning('Yerel kayıt satıldı — sunucu POS için cihazı yeniden ekleyin (UUID)')
      return
    }
    try {
      const res = await fetch('/api/tenant/showcase/sell', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          device_id: d.id,
          sell_price: d.sell_price,
          payment_method: 'nakit',
          customer_name: 'Vitrin satış',
        }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) {
        toast.error(json.error || 'Satış başarısız')
        return
      }
      markSecondHandSold(d.id)
      refresh()
      toast.success('Satıldı — POS + kasa kaydı oluşturuldu')
    } catch {
      toast.error('Bağlantı hatası')
    }
  }

  if (!mounted) {
    return <div className="flex justify-center py-32"><Loader2 className="animate-spin text-sky-500" size={28} /></div>
  }

  const inStock = devices.filter(d => d.status === 'stokta')
  const vitrin = inStock.filter(d => d.showcase)
  const filtered = devices.filter(d => {
    const q = search.trim().toLowerCase()
    const matchSearch = !q || [d.brand, d.model, d.barcode, d.imei].some(v => v?.toLowerCase().includes(q))
    if (tab === 'sold') return d.status === 'satildi' && matchSearch
    if (tab === 'vitrin') return d.status === 'stokta' && d.showcase && matchSearch
    return matchSearch
  })

  return (
    <>
    <PageShell className="no-print">
      <PageHeader
        data-tour="vitrin-baslik"
        eyebrow="Mağaza"
        title="Vitrin Cihazları"
        description="2. el alım-satım, vitrin durumu, kozmetik/pil bilgisi ve barkod etiketi."
        icon={Store}
        actions={
          <button data-tour="vitrin-cihaz-ekle-btn" type="button" onClick={() => setShowForm(true)} className="btn-primary btn-sm flex items-center gap-2">
            <Plus size={14} /> Cihaz Ekle
          </button>
        }
      />

      <div className="grid sm:grid-cols-4 gap-4">
        {[
          { label: 'Vitrinde', val: vitrin.length },
          { label: 'Arka Stok', val: inStock.filter(d => !d.showcase).length },
          { label: 'Stok Değeri', val: formatCurrency(inStock.reduce((s, d) => s + d.buy_price, 0)) },
          { label: 'Potansiyel Kâr', val: formatCurrency(inStock.reduce((s, d) => s + (d.sell_price - d.buy_price), 0)), accent: true },
        ].map(c => (
          <div key={c.label} className="surface p-4 rounded-2xl">
            <p className="text-xs font-bold text-slate-500 uppercase">{c.label}</p>
            <p className={`text-2xl font-black ${c.accent ? 'text-emerald-600' : ''}`}>{c.val}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {([
          ['vitrin', 'Vitrin'],
          ['all', 'Tüm Stok'],
          ['sold', 'Satılanlar'],
        ] as const).map(([key, label]) => (
          <button key={key} type="button" onClick={() => setTab(key)}
            className={`filter-chip ${tab === key ? 'filter-chip-active' : ''}`}>{label}</button>
        ))}
        <div className="relative flex-1 min-w-[200px] ml-auto">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="input pl-9 text-sm" placeholder="Barkod, marka, IMEI..." value={search}
            onChange={e => setSearch(e.target.value)} />
        </div>
      </div>

      {tab === 'vitrin' && vitrin.length > 0 && (
        <div data-tour="vitrin-kart-grid" className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {vitrin.filter(d => !search.trim() || filtered.some(f => f.id === d.id)).map(d => (
            <DeviceCard key={d.id} d={d} onPrint={() => printDevice(d)} onSold={() => { void sellViaPos(d) }}
              onToggleShowcase={() => {
                void updateShowcaseViaApi(d.id, { showcase: !d.showcase })
                  .then(() => refresh())
                  .catch(e => toast.error(e instanceof Error ? e.message : 'Güncellenemedi'))
              }} />
          ))}
        </div>
      )}

      <PageCard title={tab === 'vitrin' ? 'Vitrin Listesi' : tab === 'sold' ? 'Satılan Cihazlar' : 'Tüm Envanter'} noPadding>
        <div className="divide-y divide-slate-100">
          {filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">Kayıt yok</p>
          ) : filtered.map(d => (
            <div key={d.id} className="px-5 py-4 flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[180px]">
                <p className="font-bold text-slate-900">{d.brand} {d.model}</p>
                <p className="text-xs text-slate-500 font-mono">{d.barcode}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {CONDITION[d.condition]} · Kozmetik {d.cosmetic_score}/10 ({cosmeticLabel(d.cosmetic_score)})
                  {d.battery_health != null && ` · Pil %${d.battery_health}`}
                  {d.color && ` · ${d.color}`}
                  {d.storage && ` · ${d.storage}`}
                </p>
              </div>
              <div className="text-right text-sm">
                <p>Alış: {formatCurrency(d.buy_price)}</p>
                <p className="font-bold text-emerald-700">Satış: {formatCurrency(d.sell_price)}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {d.status === 'stokta' && (
                  <>
                    <button type="button" onClick={() => printDevice(d)} className="btn-secondary btn-sm flex items-center gap-1">
                      <Printer size={13} /> Etiket
                    </button>
                    <button type="button" onClick={() => {
                      void updateShowcaseViaApi(d.id, { showcase: !d.showcase })
                        .then(() => refresh())
                        .catch(e => toast.error(e instanceof Error ? e.message : 'Güncellenemedi'))
                    }}
                      className="btn-ghost btn-sm flex items-center gap-1">
                      {d.showcase ? <EyeOff size={13} /> : <Eye size={13} />}
                      {d.showcase ? 'Vitrinden Çıkar' : 'Vitrine Al'}
                    </button>
                    <button type="button" onClick={() => { void sellViaPos(d) }}
                      className="btn-primary btn-sm">Satıldı (POS)</button>
                  </>
                )}
                {d.status === 'satildi' && (
                  <span className="text-xs font-bold px-2 py-1 rounded-full bg-slate-100 text-slate-600">Satıldı</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </PageCard>

      {showForm && (
        <div className="modal-overlay" onClick={() => setShowForm(false)}>
          <div className="modal-box max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-header py-4 px-5"><h3 className="font-bold">Vitrin Cihazı Ekle</h3></div>
            <form onSubmit={handleCreate} className="modal-body space-y-3 py-4 px-5 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-2">
                <select className="input" value={form.brand} onChange={e => setForm(f => ({ ...f, brand: e.target.value }))}>
                  {['Samsung', 'Apple', 'Xiaomi', 'Huawei', 'Oppo', 'Diğer'].map(b => <option key={b}>{b}</option>)}
                </select>
                <input className="input" placeholder="Model *" required value={form.model} onChange={e => setForm(f => ({ ...f, model: e.target.value }))} />
              </div>
              <input className="input font-mono" placeholder="IMEI" value={form.imei} onChange={e => setForm(f => ({ ...f, imei: e.target.value }))} />
              <div className="grid grid-cols-2 gap-2">
                <input className="input" placeholder="Renk" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                <input className="input" placeholder="Hafıza" value={form.storage} onChange={e => setForm(f => ({ ...f, storage: e.target.value }))} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <select className="input" value={form.condition} onChange={e => setForm(f => ({ ...f, condition: e.target.value as SecondHandDevice['condition'] }))}>
                  {Object.entries(CONDITION).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
                <input className="input" type="number" min={1} max={10} placeholder="Kozmetik 1-10" value={form.cosmetic_score}
                  onChange={e => setForm(f => ({ ...f, cosmetic_score: e.target.value }))} />
                <input className="input" type="number" min={0} max={100} placeholder="Pil %" value={form.battery_health}
                  onChange={e => setForm(f => ({ ...f, battery_health: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input className="input" type="number" placeholder="Alış ₺" value={form.buy_price} onChange={e => setForm(f => ({ ...f, buy_price: e.target.value }))} />
                <input className="input" type="number" placeholder="Satış ₺ *" required value={form.sell_price} onChange={e => setForm(f => ({ ...f, sell_price: e.target.value }))} />
              </div>
              <textarea className="input resize-none" rows={2} placeholder="Not" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.showcase} onChange={e => setForm(f => ({ ...f, showcase: e.target.checked }))} />
                Vitrinde göster
              </label>
              <div className="flex gap-2 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">İptal</button>
                <button type="submit" className="btn-primary flex-1">Kaydet & Etiket Bas</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </PageShell>

    {printLabels && <BarcodeLabelSheet labels={printLabels} />}
    </>
  )
}

function DeviceCard({ d, onPrint, onSold, onToggleShowcase }: {
  d: SecondHandDevice
  onPrint: () => void
  onSold: () => void
  onToggleShowcase: () => void
}) {
  return (
    <div className="surface rounded-2xl overflow-hidden border border-sky-100/80 hover:shadow-lg transition-shadow">
      <div className="bg-gradient-to-br from-slate-900 to-slate-800 p-4 text-white">
        <div className="flex justify-between items-start gap-2">
          <div>
            <p className="text-lg font-black leading-tight">{d.brand}</p>
            <p className="text-sm text-sky-300">{d.model}</p>
          </div>
          <span className="text-[10px] font-mono bg-white/10 px-2 py-1 rounded-lg">{d.barcode}</span>
        </div>
        <p className="text-2xl font-black mt-3">{formatCurrency(d.sell_price)}</p>
      </div>
      <div className="p-4 space-y-2 text-sm">
        <div className="flex items-center gap-2 text-slate-600">
          <Sparkles size={14} className="text-amber-500" />
          Kozmetik {d.cosmetic_score}/10 — {cosmeticLabel(d.cosmetic_score)}
        </div>
        {d.battery_health != null && (
          <div className="flex items-center gap-2 text-slate-600">
            <Battery size={14} className="text-emerald-500" />
            Pil sağlığı %{d.battery_health}
          </div>
        )}
        <div className="flex items-center gap-2 text-slate-600">
          <Tag size={14} className="text-sky-500" />
          {CONDITION[d.condition]}
          {d.color && ` · ${d.color}`}
          {d.storage && ` · ${d.storage}`}
        </div>
        <div className="flex gap-2 pt-2">
          <button type="button" onClick={onPrint} className="btn-secondary btn-sm flex-1 flex items-center justify-center gap-1">
            <Printer size={13} /> Etiket
          </button>
          <button type="button" onClick={onSold} className="btn-primary btn-sm flex-1">Sat</button>
        </div>
      </div>
    </div>
  )
}

export default function VitrinPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-32"><Loader2 className="animate-spin text-sky-500" size={28} /></div>}>
      <VitrinContent />
    </Suspense>
  )
}
