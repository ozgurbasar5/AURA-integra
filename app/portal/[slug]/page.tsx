'use client'

import { useState, useEffect } from 'react'
import { Search, CheckCircle, Wrench, Phone, MessageCircle, ArrowLeft, Calendar, Clock, Package } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// ─── Types ────────────────────────────────────────────────────────────────────

interface HistoryEntry {
  date: string
  status: string
  note: string
}

interface DeviceRecord {
  id: string
  customer: string
  phone: string
  device: string
  brand: string
  color: string
  status: string
  status_color: 'green' | 'blue' | 'amber' | 'red'
  intake_date: string
  eta: string
  technician: string
  complaint: string
  estimated_cost: number
  history: HistoryEntry[]
}

// Mock removed — production uses Supabase only

function getStatusBadge(color: DeviceRecord['status_color']) {
  switch (color) {
    case 'green': return 'bg-green-100 text-green-700 border border-green-200'
    case 'blue':  return 'bg-blue-100 text-blue-700 border border-blue-200'
    case 'red':   return 'bg-red-100 text-red-700 border border-red-200'
    default:      return 'bg-amber-100 text-amber-700 border border-amber-200'
  }
}

function getStatusHeader(color: DeviceRecord['status_color']) {
  switch (color) {
    case 'green': return 'bg-green-50 border-b-2 border-green-200'
    case 'blue':  return 'bg-blue-50 border-b-2 border-blue-200'
    case 'red':   return 'bg-red-50 border-b-2 border-red-200'
    default:      return 'bg-amber-50 border-b-2 border-amber-200'
  }
}

function getStatusPill(color: DeviceRecord['status_color']) {
  switch (color) {
    case 'green': return 'bg-green-600 text-white'
    case 'blue':  return 'bg-blue-600 text-white'
    case 'red':   return 'bg-red-600 text-white'
    default:      return 'bg-amber-500 text-white'
  }
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PortalPage({ params }: { params: { slug: string } }) {
  const supabase = createClient()

  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState(false)
  const [results, setResults] = useState<DeviceRecord[]>([])
  const [selected, setSelected] = useState<DeviceRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [portalEnabled, setPortalEnabled] = useState<boolean | null>(null)

  // Company name from slug: summit-teknik → Summit Teknik
  const companyName = params.slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (l) => l.toUpperCase())

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const { data } = await supabase
          .from('tenants')
          .select('feature_flags')
          .eq('portal_slug', params.slug)
          .maybeSingle()
        if (cancelled) return
        const flags = (data?.feature_flags as Record<string, boolean>) ?? {}
        setPortalEnabled(flags.portal !== false)
      } catch {
        if (!cancelled) setPortalEnabled(true)
      }
    })()
    return () => { cancelled = true }
  }, [params.slug])

  // ── Search handler ──────────────────────────────────────────────────────────

  async function handleSearch() {
    if (!query.trim()) return
    setLoading(true)

    try {
      const res = await fetch(
        `/api/public/portal/${encodeURIComponent(params.slug)}/search?q=${encodeURIComponent(query.trim())}`
      )
      const json = await res.json()

      if (!res.ok || !json.results?.length) {
        setResults([])
        setSearched(true)
        setLoading(false)
        return
      }

      const mapped: DeviceRecord[] = json.results.map((r: {
        id: string
        order_no: string
        customer_name: string
        customer_phone: string
        device_model: string
        device_brand: string
        status: string
        estimated_cost: number
        created_at: string
        eta: string
        description: string
      }) => {
        const st = r.status as string
        let statusLabel = st
        let statusColor: DeviceRecord['status_color'] = 'blue'

        if (['ready_for_pickup', 'delivered', 'repair_complete', 'teslim', 'tamamlandi'].includes(st)) {
          statusLabel = 'Teslime Hazır'
          statusColor = 'green'
        } else if (['cancelled', 'customer_refused', 'iptal'].includes(st)) {
          statusLabel = 'İptal / Tamamlanamadı'
          statusColor = 'red'
        } else if (['waiting_diagnosis', 'customer_approval_pending', 'onay_bekleniyor', 'teshis'].includes(st)) {
          statusLabel = 'İncelemede'
          statusColor = 'amber'
        } else {
          statusLabel = 'İşlemde'
          statusColor = 'blue'
        }

        return {
          id: r.order_no || r.id,
          customer: r.customer_name,
          phone: r.customer_phone,
          device: r.device_model,
          brand: r.device_brand,
          color: '—',
          status: statusLabel,
          status_color: statusColor,
          intake_date: r.created_at?.slice(0, 10) ?? '—',
          eta: r.eta ?? '—',
          technician: '—',
          complaint: r.description ?? '—',
          estimated_cost: Number(r.estimated_cost) || 0,
          history: [],
        }
      })
      setResults(mapped)
    } catch (err) {
      console.error('[Portal] Search error:', err)
      setResults([])
    } finally {
      setSearched(true)
      setLoading(false)
    }
  }

  // ── Load history when selecting an item ────────────────────────────────────

  async function selectDevice(device: DeviceRecord) {
    // Try to get history from Supabase if history is empty
    if (device.history.length === 0) {
      try {
        const { data } = await supabase
          .from('service_status_history')
          .select('*')
          .eq('service_order_id', device.id)
          .order('created_at', { ascending: true })

        if (data && data.length > 0) {
          const history: HistoryEntry[] = data.map((h: any) => ({
            date: new Date(h.created_at).toLocaleString('tr-TR', {
              day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
            }),
            status: h.status,
            note: h.note ?? '',
          }))
          device = { ...device, history }
        }
      } catch (err) {
        console.error('[Portal] History fetch error:', err)
      }
    }
    setSelected(device)
  }

  // ── Keyboard enter search ───────────────────────────────────────────────────

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSearch()
  }

  // ─── Render ──────────────────────────────────────────────────────────────────

  if (portalEnabled === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (portalEnabled === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-6">
        <div className="text-center max-w-md">
          <Package size={40} className="mx-auto text-slate-300 mb-4" />
          <h1 className="text-lg font-bold text-slate-800 mb-2">Müşteri portalı kapalı</h1>
          <p className="text-sm text-slate-500">Bu bayi için online takip özelliği şu an aktif değil. Lütfen servisi telefonla arayın.</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{ fontFamily: "'Inter', system-ui, sans-serif", minHeight: '100vh', backgroundColor: '#f8fafc' }}>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900 text-white py-5 px-6 shadow-lg">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center shadow-md">
              <Wrench size={18} className="text-white" />
            </div>
            <div>
              <p className="font-black text-white text-sm leading-tight">{companyName}</p>
              <p className="text-slate-400 text-[11px]">Müşteri Servis Takip Portali</p>
            </div>
          </div>
          <a
            href="tel:02121234567"
            className="flex items-center gap-1.5 text-sm text-slate-300 hover:text-white transition-colors"
          >
            <Phone size={13} />
            <span className="hidden sm:inline">0212 123 45 67</span>
          </a>
        </div>
      </div>

      {/* ── Content ──────────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">

        {!selected ? (
          <>
            {/* Search Section */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 mb-5">
                <Package size={28} className="text-blue-600" />
              </div>
              <h1 className="text-3xl font-black text-slate-900 mb-3">Cihazınızı Takip Edin</h1>
              <p className="text-slate-500 text-sm">
                Telefon numaranız veya ad soyadınız ile sorgulayabilirsiniz
              </p>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-6">
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Telefon No veya Ad Soyad
              </label>
              <div className="flex gap-3">
                <div className="flex-1 flex items-center gap-2 bg-slate-50 border-2 border-slate-200 rounded-xl px-4 py-3 focus-within:border-blue-500 focus-within:bg-white transition-all">
                  <Search size={17} className="text-slate-400 shrink-0" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ör: 0532 123 4567 veya Ahmet Yılmaz"
                    className="outline-none w-full text-slate-900 bg-transparent text-sm placeholder:text-slate-400"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={loading || !query.trim()}
                  className="px-6 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-all disabled:opacity-60 shadow-md shadow-blue-600/30 whitespace-nowrap text-sm"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Aranıyor
                    </span>
                  ) : 'Sorgula'}
                </button>
              </div>
              <p className="text-[11px] text-slate-400 mt-3">
                🔒 Kişisel verileriniz yalnızca servis takibi amacıyla kullanılmaktadır.
              </p>
            </div>

            {/* Results */}
            {searched && (
              results.length === 0 ? (
                <div className="text-center py-14 bg-white rounded-2xl border border-slate-200 shadow-sm">
                  <p className="text-5xl mb-4">🔍</p>
                  <p className="font-bold text-slate-700 text-lg">Sonuç bulunamadı</p>
                  <p className="text-sm text-slate-400 mt-2">
                    Lütfen telefon numaranızı veya adınızı kontrol edip tekrar deneyin.
                  </p>
                  <a
                    href="tel:02121234567"
                    className="inline-flex items-center gap-2 mt-5 px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                  >
                    <Phone size={14} /> Servisimizi Arayın
                  </a>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wide px-1">
                    {results.length} servis kaydı bulundu
                  </p>
                  {results.map((r) => (
                    <button
                      key={r.id}
                      onClick={() => selectDevice(r)}
                      className="w-full text-left bg-white border-2 border-slate-200 hover:border-blue-400 hover:shadow-md rounded-2xl p-5 transition-all group"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <span className="font-mono text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                              {r.id}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold ${getStatusBadge(r.status_color)}`}>
                              {r.status}
                            </span>
                          </div>
                          <p className="font-bold text-slate-900 text-base truncate">{r.device}</p>
                          <p className="text-sm text-slate-500 mt-0.5">{r.brand} • {r.color}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] text-slate-400 flex items-center gap-1 justify-end">
                            <Calendar size={10} /> {r.intake_date}
                          </p>
                          {r.eta && r.eta !== '—' && (
                            <p className="text-[11px] text-blue-500 flex items-center gap-1 justify-end mt-0.5">
                              <Clock size={10} /> ETA: {r.eta}
                            </p>
                          )}
                          {r.estimated_cost > 0 && (
                            <p className="text-sm font-bold text-slate-900 mt-1.5">
                              ₺{r.estimated_cost.toLocaleString('tr-TR')}
                            </p>
                          )}
                          <span className="text-[11px] text-blue-600 font-semibold group-hover:underline mt-1 block">
                            Detayları gör →
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )
            )}
          </>
        ) : (
          /* ── Device Detail View ────────────────────────────────────────────── */
          <div className="animate-fade-in-up">
            <button
              onClick={() => setSelected(null)}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 mb-6 transition-colors"
            >
              <ArrowLeft size={15} /> Geri Dön
            </button>

            {/* Main Card */}
            <div className="bg-white rounded-2xl border-2 border-slate-200 overflow-hidden shadow-sm mb-4">

              {/* Card Header */}
              <div className={`px-6 py-4 ${getStatusHeader(selected.status_color)}`}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="font-mono text-[11px] text-slate-400">{selected.id}</span>
                    <h2 className="text-xl font-black text-slate-900 mt-0.5">{selected.device}</h2>
                    <p className="text-sm text-slate-500 mt-0.5">{selected.brand} • {selected.color}</p>
                  </div>
                  <span className={`px-4 py-2 rounded-xl text-sm font-bold shrink-0 ${getStatusPill(selected.status_color)}`}>
                    {selected.status}
                  </span>
                </div>
              </div>

              {/* Info Grid */}
              <div className="p-6 grid grid-cols-2 sm:grid-cols-3 gap-5">
                {[
                  ['Marka / Model', `${selected.brand} ${selected.device}`],
                  ['Renk', selected.color],
                  ['Teknisyen', selected.technician],
                  ['Tahmini Ücret', selected.estimated_cost > 0 ? `₺${selected.estimated_cost.toLocaleString('tr-TR')}` : '—'],
                  ['Giriş Tarihi', selected.intake_date],
                  ['Tahmini Teslim', selected.eta !== '—' ? selected.eta : 'Belirtilmedi'],
                ].map(([label, value]) => (
                  <div key={label}>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{label}</p>
                    <p className="font-semibold text-slate-900 text-sm">{value}</p>
                  </div>
                ))}
              </div>

              {/* Complaint */}
              <div className="px-6 pb-6">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Müşteri Şikayeti</p>
                <p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-100 leading-relaxed">
                  {selected.complaint}
                </p>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4 shadow-sm">
              <h3 className="font-bold text-slate-900 mb-5 flex items-center gap-2">
                <Clock size={16} className="text-sky-500" /> Servis Geçmişi
              </h3>

              {selected.history.length === 0 ? (
                <p className="text-sm text-slate-400 text-center py-4">Geçmiş kaydı bulunmuyor</p>
              ) : (
                <div className="space-y-1">
                  {selected.history.map((h, i) => (
                    <div key={i} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                            i === selected.history.length - 1
                              ? 'bg-blue-600'
                              : 'bg-green-100'
                          }`}
                        >
                          {i === selected.history.length - 1
                            ? <Wrench size={13} className="text-white" />
                            : <CheckCircle size={13} className="text-green-600" />
                          }
                        </div>
                        {i < selected.history.length - 1 && (
                          <div className="w-0.5 h-8 bg-slate-100 mt-1" />
                        )}
                      </div>
                      <div className="flex-1 pb-4">
                        <span className="text-[11px] text-slate-400 font-medium">{h.date}</span>
                        <p className="font-semibold text-slate-900 text-sm mt-0.5">{h.status}</p>
                        <p className="text-sm text-slate-500">{h.note}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <a
                href={`https://wa.me/902121234567?text=${encodeURIComponent(
                  `Merhaba, ${selected.id} numaralı servisim hakkında bilgi almak istiyorum.`
                )}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2.5 w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-green-600/25 text-sm"
              >
                <MessageCircle size={18} />
                WhatsApp ile İletişim
              </a>
              <a
                href="tel:02121234567"
                className="flex items-center justify-center gap-2.5 w-full py-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-2xl transition-all shadow-sm text-sm"
              >
                <Phone size={18} />
                Telefon ile Ara
              </a>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer ───────────────────────────────────────────────────────────── */}
      <footer className="bg-slate-900 text-slate-400 py-8 text-center text-xs mt-16">
        <div className="flex items-center justify-center gap-2 mb-2">
          <div className="w-6 h-6 rounded-lg bg-sky-600 flex items-center justify-center">
            <Wrench size={12} className="text-white" />
          </div>
          <span className="font-semibold text-slate-300">{companyName}</span>
        </div>
        <p className="text-slate-500">AURA İntegra ile yönetilmektedir</p>
        <a href="https://aurabilisim.net" target="_blank" rel="noreferrer" className="text-sky-400 hover:text-sky-300 mt-1 block">
          aurabilisim.net
        </a>
      </footer>
    </div>
  )
}
