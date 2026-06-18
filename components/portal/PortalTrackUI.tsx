'use client'

import { useState } from 'react'
import {
  Search, Phone, ArrowLeft, Clock, Smartphone, CheckCircle2, Loader2, Copy, MessageCircle,
} from 'lucide-react'
import {
  PORTAL_STATUS_STEPS,
  portalStatusStepIndex,
  type PortalOrderHit,
} from '@/lib/tracking-search'

type HistoryEntry = {
  status: string
  status_label: string
  note: string
  created_at: string
}

type Props = {
  slug: string
  shopName: string
  shopPhone: string
  shopLogo?: string | null
  shopAddress?: string
}

export default function PortalTrackUI({ slug, shopName, shopPhone, shopLogo, shopAddress }: Props) {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [searchError, setSearchError] = useState('')
  const [results, setResults] = useState<PortalOrderHit[]>([])
  const [selected, setSelected] = useState<PortalOrderHit | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  async function handleSearch() {
    const q = query.trim()
    if (!q) return
    setLoading(true)
    setSelected(null)
    setHistory([])
    setSearchError('')
    try {
      const res = await fetch(
        `/api/public/portal/${encodeURIComponent(slug)}/search?q=${encodeURIComponent(q)}`,
      )
      const json = await res.json()
      if (!res.ok) {
        setResults([])
        setSearchError(json.error || 'Arama başarısız')
        return
      }
      setResults(Array.isArray(json.results) ? json.results : [])
      if (json.results?.length === 0) {
        setSearchError(
          json.tenant?.name
            ? `Bu bayide (${json.tenant.name}) eşleşen kayıt yok. Doğru portal linkini kullandığınızdan emin olun — slug Ayarlar → Slug Kaydet ile kaydedilmeli. Servis no (SRV-2606-0001 veya 26060001) veya IMEI deneyin.`
            : 'Kayıt bulunamadı. Servis no (SRV-2606-0001 veya 26060001) veya IMEI deneyin.',
        )
      }
    } catch {
      setResults([])
    } finally {
      setSearched(true)
      setLoading(false)
    }
  }

  async function openOrder(order: PortalOrderHit) {
    setSelected(order)
    setHistoryLoading(true)
    try {
      const res = await fetch(
        `/api/public/portal/${encodeURIComponent(slug)}/history?order_id=${encodeURIComponent(order.id)}`,
      )
      const json = await res.json()
      setHistory(Array.isArray(json.history) ? json.history : [])
    } catch {
      setHistory([])
    } finally {
      setHistoryLoading(false)
    }
  }

  const stepIdx = selected ? portalStatusStepIndex(selected.public_status) : -1
  const phoneDigits = shopPhone.replace(/\D/g, '')
  const telHref = phoneDigits ? `tel:${phoneDigits}` : undefined
  const waHref = phoneDigits
    ? `https://wa.me/90${phoneDigits.slice(-10)}`
    : undefined

  return (
    <div className="min-h-screen bg-[#05061a] text-white">
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-700/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-violet-700/15 rounded-full blur-3xl" />
      </div>

      <header className="relative z-10 border-b border-white/5 bg-white/[0.02] backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {shopLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shopLogo} alt="" className="w-10 h-10 rounded-xl object-contain bg-white/10 shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center font-black shrink-0">
                {shopName.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold truncate">{shopName}</p>
              <p className="text-xs text-white/50 truncate">{shopAddress || 'Servis Takip Portalı'}</p>
            </div>
          </div>
          {telHref && (
            <a href={telHref} className="flex items-center gap-1.5 text-sm text-white/70 hover:text-white shrink-0">
              <Phone size={14} />
              <span className="hidden sm:inline">{shopPhone}</span>
            </a>
          )}
        </div>
      </header>

      <main className="relative z-10 max-w-3xl mx-auto px-4 py-8 pb-16">
        {!selected ? (
          <>
            <div className="text-center mb-8">
              <div className="inline-flex w-14 h-14 rounded-2xl bg-sky-500/20 items-center justify-center mb-4">
                <Smartphone size={28} className="text-sky-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black mb-2">Cihazınızı Takip Edin</h1>
              <p className="text-white/50 text-sm max-w-md mx-auto">
                Servis numarası (<span className="font-mono text-white/70">SRV-2606-0001</span> veya{' '}
                <span className="font-mono text-white/70">26060001</span>), IMEI veya telefon ile sorgulayın
              </p>
            </div>

            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 sm:p-5 mb-6">
              <label className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-2 block">
                Takip Kodu / IMEI / Telefon
              </label>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-sky-500/50">
                  <Search size={18} className="text-white/30 shrink-0" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && void handleSearch()}
                    placeholder="SRV-2606-0001, 26060001 veya IMEI"
                    className="w-full bg-transparent outline-none text-sm placeholder:text-white/30"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleSearch()}
                  disabled={loading || !query.trim()}
                  className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 font-bold text-sm shrink-0 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : null}
                  Sorgula
                </button>
              </div>
            </div>

            {searched && results.length === 0 && (
              <div className="text-center py-12 bg-white/[0.03] border border-white/10 rounded-2xl">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-bold text-lg">Kayıt bulunamadı</p>
                <p className="text-sm text-white/45 mt-2 max-w-sm mx-auto">
                  {searchError || 'Servis numarası veya IMEI\'yi kontrol edip tekrar deneyin.'}
                </p>
              </div>
            )}

            {results.length > 0 && (
              <div className="space-y-3">
                <p className="text-xs text-white/40 font-semibold uppercase tracking-wide">
                  {results.length} kayıt bulundu
                </p>
                {results.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => void openOrder(r)}
                    className="w-full text-left bg-white/[0.04] hover:bg-white/[0.07] border border-white/10 hover:border-sky-500/40 rounded-2xl p-4 transition-all"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-bold text-sky-300">{r.order_no}</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-200">
                            {r.status_label}
                          </span>
                        </div>
                        <p className="font-semibold truncate">{r.device_brand} {r.device_model}</p>
                        <p className="text-xs text-white/45 mt-0.5">{r.customer_name}</p>
                        {r.imei && r.imei !== '-' && (
                          <p className="text-[10px] text-white/35 font-mono mt-1">IMEI: {r.imei}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0 text-xs text-white/40">
                        {r.created_at ? new Date(r.created_at).toLocaleDateString('tr-TR') : '—'}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div>
            <button
              type="button"
              onClick={() => { setSelected(null); setHistory([]) }}
              className="flex items-center gap-1.5 text-sm text-white/50 hover:text-white mb-6"
            >
              <ArrowLeft size={16} /> Geri
            </button>

            <div className="bg-white/[0.04] border border-white/10 rounded-2xl overflow-hidden mb-5">
              <div className="p-5 border-b border-white/10">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-sky-300 font-bold text-lg">{selected.order_no}</p>
                    <p className="text-xl font-black mt-1">{selected.device_brand} {selected.device_model}</p>
                    {selected.imei && selected.imei !== '-' && (
                      <p className="text-xs text-white/40 font-mono mt-1">IMEI: {selected.imei}</p>
                    )}
                  </div>
                  <span className="px-3 py-1.5 rounded-xl bg-sky-500/20 text-sky-200 text-sm font-bold">
                    {selected.status_label}
                  </span>
                </div>
              </div>

              <div className="p-5 grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-[10px] uppercase text-white/35 font-bold mb-1">Müşteri</p>
                  <p>{selected.customer_name || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-white/35 font-bold mb-1">Tahmini Ücret</p>
                  <p>{selected.estimated_cost > 0 ? `₺${selected.estimated_cost.toLocaleString('tr-TR')}` : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-white/35 font-bold mb-1">Kayıt Tarihi</p>
                  <p>{selected.created_at ? new Date(selected.created_at).toLocaleDateString('tr-TR') : '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-white/35 font-bold mb-1">Tahmini Teslim</p>
                  <p>{selected.eta ? new Date(selected.eta).toLocaleDateString('tr-TR') : 'Belirtilmedi'}</p>
                </div>
              </div>

              {selected.description && (
                <div className="px-5 pb-5">
                  <p className="text-[10px] uppercase text-white/35 font-bold mb-1">Arıza / Not</p>
                  <p className="text-sm text-white/70 bg-white/5 rounded-xl p-3">{selected.description}</p>
                </div>
              )}
            </div>

            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 mb-5">
              <h3 className="font-bold mb-5 flex items-center gap-2">
                <Clock size={16} className="text-sky-400" /> Servis Durumu
              </h3>
              <div className="space-y-0">
                {PORTAL_STATUS_STEPS.map((step, i) => {
                  const done = i <= stepIdx
                  const current = i === stepIdx
                  return (
                    <div key={step.key} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm ${
                          current ? 'bg-sky-500 ring-4 ring-sky-500/30' : done ? 'bg-emerald-500/80' : 'bg-white/10'
                        }`}>
                          {done && !current ? <CheckCircle2 size={16} /> : step.icon}
                        </div>
                        {i < PORTAL_STATUS_STEPS.length - 1 && (
                          <div className={`w-0.5 flex-1 min-h-[24px] my-1 ${done ? 'bg-emerald-500/50' : 'bg-white/10'}`} />
                        )}
                      </div>
                      <div className="pb-5 pt-1">
                        <p className={`text-sm font-semibold ${current ? 'text-sky-300' : done ? 'text-white/80' : 'text-white/35'}`}>
                          {step.label}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-5 mb-5">
              <h3 className="font-bold mb-4 text-sm">İşlem Geçmişi</h3>
              {historyLoading ? (
                <div className="flex justify-center py-6"><Loader2 className="animate-spin text-sky-400" /></div>
              ) : history.length === 0 ? (
                <p className="text-sm text-white/40 text-center py-4">Henüz geçmiş kaydı yok</p>
              ) : (
                <div className="space-y-3">
                  {history.map((h, i) => (
                    <div key={i} className="flex gap-3 text-sm">
                      <span className="text-white/35 text-xs shrink-0 w-28">
                        {new Date(h.created_at).toLocaleString('tr-TR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <div>
                        <p className="font-semibold">{h.status_label}</p>
                        {h.note && <p className="text-white/45 text-xs mt-0.5">{h.note}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-3">
              {telHref && (
                <a href={telHref} className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-sm font-semibold">
                  <Phone size={16} /> Ara
                </a>
              )}
              {waHref && (
                <a href={waHref} target="_blank" rel="noopener noreferrer" className="flex-1 min-w-[140px] flex items-center justify-center gap-2 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-sm font-semibold">
                  <MessageCircle size={16} /> WhatsApp
                </a>
              )}
              <button
                type="button"
                onClick={() => void navigator.clipboard?.writeText(selected.order_no)}
                className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm"
              >
                <Copy size={16} /> Kodu Kopyala
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
