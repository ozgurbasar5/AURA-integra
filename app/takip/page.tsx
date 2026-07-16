'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Search, Phone, Copy, CheckCircle, Clock, Smartphone, ChevronRight, RotateCcw } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'
import type { ServiceOrderStatus } from '@/types/database'
import { mapStoreStatusToPublic, PUBLIC_STATUS_LABELS, buildTrackingUrl } from '@/lib/erp-features'

type ShopBranding = {
  shopName: string
  shopPhone: string
  shopAddress: string
  shopLogo: string | null
}

// ─── Status config ─────────────────────────────────────────────────────────────

type StatusStep = {
  key: ServiceOrderStatus
  label: string
  icon: string
  color: string
  bgColor: string
  ringColor: string
}

const STATUS_STEPS: StatusStep[] = [
  {
    key: 'alindi',
    label: 'Cihaz Teslim Alındı',
    icon: '📋',
    color: 'text-sky-300',
    bgColor: 'bg-sky-600',
    ringColor: 'ring-sky-500',
  },
  {
    key: 'teshis',
    label: 'Teşhis Yapılıyor',
    icon: '🔍',
    color: 'text-violet-300',
    bgColor: 'bg-violet-600',
    ringColor: 'ring-violet-500',
  },
  {
    key: 'onay_bekleniyor',
    label: 'Müşteri Onayı Bekleniyor',
    icon: '⏳',
    color: 'text-amber-300',
    bgColor: 'bg-amber-600',
    ringColor: 'ring-amber-500',
  },
  {
    key: 'tamir',
    label: 'Onarım Yapılıyor',
    icon: '🔧',
    color: 'text-sky-300',
    bgColor: 'bg-sky-600',
    ringColor: 'ring-sky-500',
  },
  {
    key: 'kalite_kontrol',
    label: 'Kalite Kontrol',
    icon: '✅',
    color: 'text-emerald-300',
    bgColor: 'bg-emerald-600',
    ringColor: 'ring-emerald-500',
  },
  {
    key: 'teslim',
    label: 'Teslim Edildi',
    icon: '🎉',
    color: 'text-green-300',
    bgColor: 'bg-green-600',
    ringColor: 'ring-green-500',
  },
]

const STATUS_BADGE: Record<ServiceOrderStatus, { label: string; classes: string }> = {
  alindi: {
    label: 'Teslim Alındı',
    classes: 'bg-sky-500/20 text-sky-300 border border-sky-500/40',
  },
  teshis: {
    label: 'Teşhiste',
    classes: 'bg-violet-500/20 text-violet-300 border border-violet-500/40',
  },
  onay_bekleniyor: {
    label: 'Onay Bekleniyor',
    classes: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
  },
  tamir: {
    label: 'Tamirde',
    classes: 'bg-sky-500/20 text-sky-300 border border-sky-500/40',
  },
  kalite_kontrol: {
    label: 'Kalite Kontrol',
    classes: 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40',
  },
  teslime_hazir: {
    label: 'Teslime Hazır',
    classes: 'bg-teal-500/20 text-teal-300 border border-teal-500/40',
  },
  teslim: {
    label: 'Teslim Edildi',
    classes: 'bg-green-500/20 text-green-300 border border-green-500/40',
  },
  iptal: {
    label: 'İptal Edildi',
    classes: 'bg-red-500/20 text-red-300 border border-red-500/40',
  },
}

// ─── Types ─────────────────────────────────────────────────────────────────────

type LocalTrackOrder = {
  id: string
  order_no: string
  device_brand: string
  device_model: string
  device_color?: string
  status: ServiceOrderStatus
  received_at: string
  estimated_delivery?: string
  fault_description: string
  estimated_cost?: number
  actual_cost?: number
  customers: { full_name: string; phone: string }
}

type OrderWithCustomer = LocalTrackOrder

type HistoryEntry = { status: string; created_at: string; note?: string | null }

// ─── Component ─────────────────────────────────────────────────────────────────

export default function TakipPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#05061a] text-white/40 text-sm">Yükleniyor...</div>
    }>
      <TakipContent />
    </Suspense>
  )
}

function TakipContent() {
  const searchParams = useSearchParams()
  const shopSlug = searchParams.get('shop') || searchParams.get('slug') || ''
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState<OrderWithCustomer | null>(null)
  const [history, setHistory] = useState<HistoryEntry[]>([])
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)
  const [branding, setBranding] = useState<ShopBranding>({
    shopName: 'AURA İntegra',
    shopPhone: '0850 000 00 00',
    shopAddress: '',
    shopLogo: null,
  })

  useEffect(() => {
    const q = searchParams.get('q')
    if (q) setQuery(q)
  }, [searchParams])

  useEffect(() => {
    if (shopSlug) {
      fetch(`/api/tenant/branding?slug=${encodeURIComponent(shopSlug)}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (!data) return
          setBranding({
            shopName: data.shopName || 'AURA İntegra',
            shopPhone: data.shopPhone || '0850 000 00 00',
            shopAddress: data.shopAddress || '',
            shopLogo: data.shopLogo || null,
          })
        })
        .catch(() => {})
    }
  }, [shopSlug])

  const handleSearch = async () => {
    const trimmed = query.trim()
    if (!trimmed) return
    setLoading(true)
    setError('')
    setOrder(null)
    setHistory([])

    if (!shopSlug) {
      setError('Servis takibi için bayi linkinizi kullanın (URL\'de shop parametresi gerekli).')
      setLoading(false)
      return
    }

    try {
      const params = new URLSearchParams({ shop: shopSlug, q: trimmed })
      const res = await fetch(`/api/public/takip?${params.toString()}`)
      const payload = await res.json() as {
        found?: boolean
        error?: string
        order?: {
          id: string
          order_no: string
          device_brand: string
          device_model: string
          status: string
          public_status: string
          customer_name: string
          customer_phone: string
          estimated_cost: number
          created_at: string
          eta: string | null
          description: string
        }
        history?: HistoryEntry[]
      }

      if (!res.ok) {
        setError(payload.error || 'Arama başarısız.')
        return
      }

      if (!payload.found || !payload.order) {
        setError('Kayıt bulunamadı. Servis no (SRV-2606-0001 veya 26060001), IMEI veya telefon deneyin.')
        return
      }

      const hit = payload.order
      setOrder({
        id: hit.id,
        order_no: hit.order_no,
        device_brand: hit.device_brand,
        device_model: hit.device_model,
        status: (hit.public_status || hit.status) as ServiceOrderStatus,
        received_at: hit.created_at,
        estimated_delivery: hit.eta || undefined,
        fault_description: hit.description || '—',
        estimated_cost: hit.estimated_cost,
        customers: { full_name: hit.customer_name, phone: hit.customer_phone },
      })
      setHistory(payload.history ?? [])
    } catch {
      setError('Bir hata oluştu. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  const displayOrder = order
  const currentStepIdx = displayOrder
    ? STATUS_STEPS.findIndex((s) => s.key === displayOrder.status)
    : -1

  const trackShareUrl = displayOrder
    ? (typeof window !== 'undefined'
        ? buildTrackingUrl(displayOrder.order_no, shopSlug)
        : `/takip?q=${encodeURIComponent(displayOrder.order_no)}${shopSlug ? `&shop=${shopSlug}` : ''}`)
    : ''

  const phoneDigits = branding.shopPhone.replace(/\D/g, '')
  const telHref = phoneDigits ? `tel:${phoneDigits}` : 'tel:08500000000'
  const waHref = phoneDigits
    ? `https://wa.me/90${phoneDigits.slice(-10)}`
    : 'https://wa.me/905000000000'

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-[#05061a] text-white">
      {/* Background gradient blobs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-700/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-80 h-80 bg-violet-700/15 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-blue-700/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col">
        {/* ── Header ── */}
        <header className="border-b border-white/5 bg-white/[0.02] backdrop-blur-sm">
          <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
            {/* Logo */}
            <div className="flex items-center gap-3">
              {branding.shopLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={branding.shopLogo} alt="" className="w-9 h-9 rounded-xl object-contain bg-white/10" />
              ) : (
                <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/30">
                  <span className="text-white font-black text-sm">{branding.shopName.slice(0, 1)}</span>
                </div>
              )}
              <div className="leading-none">
                <span className="font-black text-white text-lg tracking-tight">{branding.shopName}</span>
              </div>
            </div>
            <span className="text-xs text-white/30 hidden sm:block">Servis Takip</span>
          </div>
        </header>

        {/* ── Main ── */}
        <main className="flex-1 flex flex-col items-center justify-start py-12 px-4">
          <div className="w-full max-w-2xl">

            {/* ── Title ── */}
            <div className="text-center mb-10">
              <div className="inline-flex items-center gap-2 bg-sky-500/10 border border-sky-500/20 rounded-full px-4 py-1.5 mb-5">
                <Smartphone size={14} className="text-sky-400" />
                <span className="text-sky-300 text-xs font-semibold tracking-wide uppercase">
                  Cihaz Takip
                </span>
              </div>
              <h1 className="text-4xl font-black text-white mb-3 tracking-tight">
                Servisinizi Takip Edin
              </h1>
              <p className="text-white/50 text-base leading-relaxed max-w-md mx-auto">
                Servisiniz hakkında bilgi almak için takip kodu veya telefon numaranızı girin
              </p>
            </div>

            {/* ── Search Card ── */}
            {!displayOrder && (
              <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-8 shadow-2xl shadow-black/40 backdrop-blur-sm mb-4">
                <label className="block text-sm font-semibold text-white/60 mb-2">
                  Takip Kodu veya Telefon Numarası
                </label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <Search
                      size={18}
                      className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30"
                    />
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                      placeholder="SRV-2026-00123 veya 05xx xxx xx xx"
                      className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/25 text-sm focus:outline-none focus:border-sky-500/60 focus:bg-white/8 transition-all"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    disabled={loading || !query.trim()}
                    className="px-6 py-3.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-colors flex items-center gap-2 text-sm whitespace-nowrap shadow-lg shadow-sky-500/25"
                  >
                    {loading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Sorgulanıyor
                      </>
                    ) : (
                      <>
                        <Search size={16} />
                        Sorgula
                      </>
                    )}
                  </button>
                </div>

                {/* Error */}
                {error && (
                  <div className="mt-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3 text-red-300 text-sm">
                    <span className="text-base">⚠️</span>
                    {error}
                  </div>
                )}

                <p className="text-center text-xs text-white/25 mt-5">
                  Takip kodunuz servis teslim belgenizde yazmaktadır.
                </p>
              </div>
            )}

            {/* ── Result ── */}
            {displayOrder && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">

                {/* Device summary card */}
                <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/40 backdrop-blur-sm">
                  {/* Top row */}
                  <div className="flex items-start justify-between mb-5">
                    <span
                      className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                        STATUS_BADGE[displayOrder.status]?.classes ?? 'bg-white/10 text-white/60'
                      }`}
                    >
                      {STATUS_BADGE[displayOrder.status]?.label ?? PUBLIC_STATUS_LABELS[displayOrder.status] ?? displayOrder.status}
                    </span>
                    <button
                      onClick={() => { setOrder(null); setHistory([]); setQuery('') }}
                      className="flex items-center gap-1.5 text-xs text-white/30 hover:text-white/60 transition-colors"
                    >
                      <RotateCcw size={12} />
                      Yeni Sorgu
                    </button>
                  </div>

                  {/* Device name */}
                  <div className="mb-5">
                    <p className="text-2xl font-black text-white">
                      {displayOrder.device_brand} {displayOrder.device_model}
                    </p>
                    {displayOrder.device_color && (
                      <p className="text-sm text-white/40 mt-0.5">{displayOrder.device_color}</p>
                    )}
                  </div>

                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="bg-white/[0.04] rounded-2xl p-3.5">
                      <p className="text-xs text-white/35 uppercase tracking-wide font-semibold mb-1">
                        Servis No
                      </p>
                      <p className="text-sm font-bold text-white font-mono flex items-center gap-2">
                        {displayOrder.order_no}
                        <button
                          onClick={() => copyToClipboard(displayOrder.order_no)}
                          className="text-white/30 hover:text-white/70 transition-colors"
                        >
                          {copied ? (
                            <CheckCircle size={13} className="text-emerald-400" />
                          ) : (
                            <Copy size={13} />
                          )}
                        </button>
                      </p>
                    </div>
                    <div className="bg-white/[0.04] rounded-2xl p-3.5">
                      <p className="text-xs text-white/35 uppercase tracking-wide font-semibold mb-1">
                        Müşteri
                      </p>
                      <p className="text-sm font-bold text-white truncate">
                        {displayOrder.customers?.full_name ?? '—'}
                      </p>
                    </div>
                    <div className="bg-white/[0.04] rounded-2xl p-3.5">
                      <p className="text-xs text-white/35 uppercase tracking-wide font-semibold mb-1">
                        Kabul Tarihi
                      </p>
                      <p className="text-sm font-bold text-white">
                        {new Date(displayOrder.received_at).toLocaleDateString('tr-TR', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="bg-white/[0.04] rounded-2xl p-3.5">
                      <p className="text-xs text-white/35 uppercase tracking-wide font-semibold mb-1">
                        Tahmini Teslim
                      </p>
                      <p className="text-sm font-bold text-white">
                        {displayOrder.estimated_delivery
                          ? new Date(displayOrder.estimated_delivery).toLocaleDateString('tr-TR', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : 'Belirleniyor...'}
                      </p>
                    </div>
                  </div>

                  {/* Fault description */}
                  <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3.5">
                    <p className="text-xs text-white/35 uppercase tracking-wide font-semibold mb-1">
                      Arıza Açıklaması
                    </p>
                    <p className="text-sm text-white/70 leading-relaxed">{displayOrder.fault_description}</p>
                  </div>

                  {/* Cost */}
                  {(displayOrder.estimated_cost ?? 0) > 0 && (
                    <div className="mt-3 bg-sky-500/10 border border-sky-500/20 rounded-2xl p-3.5 flex items-center justify-between">
                      <p className="text-xs text-sky-300/70 font-semibold uppercase tracking-wide">
                        {displayOrder.actual_cost ? 'Servis Ücreti' : 'Tahmini Ücret'}
                      </p>
                      <p className="text-xl font-black text-sky-300">
                        ₺
                        {(displayOrder.actual_cost ?? displayOrder.estimated_cost ?? 0).toLocaleString('tr-TR', {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                    </div>
                  )}

                  {trackShareUrl && (
                    <div className="mt-4 flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-2xl p-4">
                      <QRCodeSVG value={trackShareUrl} size={72} bgColor="transparent" fgColor="#ffffff" level="M" />
                      <div>
                        <p className="text-xs text-white/40 uppercase tracking-wide font-semibold">Takip QR</p>
                        <p className="text-xs text-white/60 mt-1 break-all">{trackShareUrl}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timeline card */}
                <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-6 shadow-2xl shadow-black/40 backdrop-blur-sm">
                  <h3 className="font-bold text-white/80 mb-5 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <Clock size={15} className="text-sky-400" />
                    Servis Süreci
                  </h3>

                  <div className="space-y-0">
                    {STATUS_STEPS.map((step, idx) => {
                      const isDone = idx < currentStepIdx
                      const isActive = idx === currentStepIdx
                      const isFuture = idx > currentStepIdx
                      const histItem = history.find((h) => h.status === step.key)
                      const isLast = idx === STATUS_STEPS.length - 1

                      return (
                        <div key={step.key} className="flex gap-4">
                          {/* Indicator */}
                          <div className="flex flex-col items-center">
                            <div
                              className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all flex-shrink-0 ${
                                isDone
                                  ? `${step.bgColor} border-transparent text-white shadow-lg`
                                  : isActive
                                  ? `bg-white/5 border-current ${step.color} ring-2 ${step.ringColor} ring-offset-1 ring-offset-[#05061a]`
                                  : 'bg-white/3 border-white/10 text-white/20'
                              }`}
                            >
                              {isDone ? (
                                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                  <path
                                    fillRule="evenodd"
                                    d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              ) : (
                                <span className={isFuture ? 'opacity-30' : ''}>{step.icon}</span>
                              )}
                            </div>
                            {!isLast && (
                              <div
                                className={`w-px flex-1 my-1 min-h-[24px] transition-colors ${
                                  isDone ? `${step.bgColor} opacity-50` : 'bg-white/8'
                                }`}
                              />
                            )}
                          </div>

                          {/* Content */}
                          <div className="pb-5 flex-1 pt-1.5">
                            <p
                              className={`text-sm font-semibold leading-tight ${
                                isDone || isActive ? 'text-white' : 'text-white/25'
                              }`}
                            >
                              {step.label}
                            </p>
                            {histItem && (
                              <p className="text-xs text-white/35 mt-1">
                                {new Date(histItem.created_at).toLocaleString('tr-TR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            )}
                            {isActive && !histItem && (
                              <p className={`text-xs mt-1 animate-pulse ${step.color}`}>
                                ● Şu an bu aşamada
                              </p>
                            )}
                            {histItem?.note && (
                              <p className="text-xs text-white/40 mt-1 italic">{histItem.note}</p>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Contact card */}
                <div className="bg-gradient-to-r from-sky-700/60 to-violet-700/60 border border-sky-500/30 rounded-3xl p-6 backdrop-blur-sm shadow-2xl shadow-sky-500/10">
                  <h3 className="font-bold text-white mb-1 text-sm">Sorularınız mı var?</h3>
                  <p className="text-white/50 text-xs mb-4">
                    Servisinizle ilgili her konuda bize ulaşabilirsiniz.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <a
                      href={telHref}
                      className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl py-3 text-sm font-semibold text-white transition-colors"
                    >
                      <Phone size={15} />
                      {branding.shopPhone || '0850 000 00 00'}
                    </a>
                    <a
                      href={waHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 border border-white/15 rounded-xl py-3 text-sm font-semibold text-white transition-colors"
                    >
                      <ChevronRight size={15} />
                      WhatsApp
                    </a>
                  </div>
                  {branding.shopAddress && (
                    <p className="text-xs text-white/40 mt-3">{branding.shopAddress}</p>
                  )}
                </div>

              </div>
            )}
          </div>
        </main>

        {/* ── Footer ── */}
        <footer className="border-t border-white/5 py-5 text-center">
          <p className="text-xs text-white/20">
            © {new Date().getFullYear()} {branding.shopName} — Servis Takip
          </p>
        </footer>
      </div>
    </div>
  )
}
