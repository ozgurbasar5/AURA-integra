'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  Smartphone, Search, Phone, MessageCircle, ArrowLeft, CheckCircle2,
  Clock, Shield, FileText, Bell, Copy, Printer, Check, X,
  AlertTriangle, ChevronRight, Share2, LogOut, RefreshCw, Send,
  Wrench, DollarSign, Home, User
} from 'lucide-react'
import { toast } from 'sonner'
import { formatCurrency } from '@/lib/validators'
import type {
  CustomerPortalDataResponse,
  CustomerSafeOrderDTO,
  CustomerSafeWarrantyDTO,
} from '@/lib/portal-dto'

type TabType = 'home' | 'services' | 'warranty' | 'documents' | 'notifications'

type Props = {
  slug: string
  initialShopName?: string
  initialShopPhone?: string
  initialShopLogo?: string | null
  initialShopAddress?: string | null
}

export default function PortalSelfService({
  slug,
  initialShopName,
  initialShopPhone,
  initialShopLogo,
  initialShopAddress,
}: Props) {
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<CustomerPortalDataResponse | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  // Auth / Verification state
  const [queryInput, setQueryInput] = useState('')
  const [authError, setAuthError] = useState('')

  // Quote modal state
  const [showQuoteModal, setShowQuoteModal] = useState(false)
  const [quoteOrder, setQuoteOrder] = useState<CustomerSafeOrderDTO | null>(null)
  const [submittingDecision, setSubmittingDecision] = useState(false)

  // Warranty claim modal state
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [claimWarranty, setClaimWarranty] = useState<CustomerSafeWarrantyDTO | null>(null)
  const [claimIssue, setClaimIssue] = useState('')
  const [submittingClaim, setSubmittingClaim] = useState(false)

  // Check existing session in localStorage
  useEffect(() => {
    const savedToken = localStorage.getItem(`aura_portal_token_${slug}`)
    if (savedToken) {
      setSessionToken(savedToken)
      void loadPortalData(savedToken)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  async function loadPortalData(token: string) {
    setLoading(true)
    setAuthError('')
    try {
      const res = await fetch(`/api/public/portal/${encodeURIComponent(slug)}/data`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const json = (await res.json()) as CustomerPortalDataResponse
        setData(json)
        if (json.active_order) {
          setSelectedOrderId(json.active_order.id)
        } else if (json.orders.length > 0) {
          setSelectedOrderId(json.orders[0].id)
        }
      } else {
        // Session expired or invalid
        localStorage.removeItem(`aura_portal_token_${slug}`)
        setSessionToken(null)
        setData(null)
      }
    } catch {
      toast.error('Bağlantı hatası oluştu')
    } finally {
      setLoading(false)
    }
  }

  async function handleVerify(e?: React.FormEvent) {
    if (e) e.preventDefault()
    const q = queryInput.trim()
    if (!q) {
      setAuthError('Lütfen servis no, takip kodu veya telefon girin.')
      return
    }

    setLoading(true)
    setAuthError('')
    try {
      const res = await fetch(`/api/public/portal/${encodeURIComponent(slug)}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const json = await res.json()
      if (!res.ok) {
        setAuthError(json.error || 'Doğrulama başarısız.')
        return
      }

      if (json.token) {
        localStorage.setItem(`aura_portal_token_${slug}`, json.token)
        setSessionToken(json.token)
        toast.success('Giriş yapıldı')
        await loadPortalData(json.token)
      }
    } catch {
      setAuthError('Bağlantı kurulamadı. Lütfen tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  function handleLogout() {
    localStorage.removeItem(`aura_portal_token_${slug}`)
    setSessionToken(null)
    setData(null)
    setQueryInput('')
    setActiveTab('home')
    toast.info('Oturum kapatıldı')
  }

  async function handleQuoteDecision(approved: boolean) {
    if (!quoteOrder?.approval_token) {
      toast.error('Onay bağlantısı bulunamadı')
      return
    }

    setSubmittingDecision(true)
    try {
      const res = await fetch(`/api/public/approve/${encodeURIComponent(quoteOrder.approval_token)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ approved }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'İşlem gerçekleştirilemedi')
        return
      }

      toast.success(approved ? 'Onarım teklifi onaylandı' : 'Teklif reddedildi')
      setShowQuoteModal(false)
      if (sessionToken) void loadPortalData(sessionToken)
    } catch {
      toast.error('Bağlantı hatası')
    } finally {
      setSubmittingDecision(false)
    }
  }

  async function handleClaimSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!claimWarranty || !sessionToken) return
    if (claimIssue.trim().length < 5) {
      toast.error('Lütfen sorunu en az 5 karakterle açıklayın')
      return
    }

    setSubmittingClaim(true)
    try {
      const res = await fetch(`/api/public/portal/${encodeURIComponent(slug)}/claim`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({
          warranty_id: claimWarranty.id,
          issue_description: claimIssue.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error || 'Talep oluşturulamadı')
        return
      }

      toast.success(json.message || 'Garanti talebiniz oluşturuldu')
      setShowClaimModal(false)
      setClaimIssue('')
      if (sessionToken) void loadPortalData(sessionToken)
    } catch {
      toast.error('Bağlantı hatası')
    } finally {
      setSubmittingClaim(false)
    }
  }

  const shopName = data?.tenant.name || initialShopName || slug.replace(/-/g, ' ').toUpperCase()
  const shopPhone = data?.tenant.phone || initialShopPhone || ''
  const shopLogo = data?.tenant.logo || initialShopLogo || null
  const shopAddress = data?.tenant.address || initialShopAddress || ''

  const phoneDigits = shopPhone.replace(/\D/g, '')
  const telHref = phoneDigits ? `tel:${phoneDigits}` : undefined
  const waHref = phoneDigits ? `https://wa.me/90${phoneDigits.slice(-10)}` : undefined

  const activeOrder = data?.active_order || null
  const selectedOrder = data?.orders.find(o => o.id === selectedOrderId) || activeOrder

  const unreadNotifsCount = data?.notifications.filter(n => !n.read).length || 0

  const copyOrderNo = (orderNo: string) => {
    void navigator.clipboard?.writeText(orderNo)
    setCopied(true)
    toast.success('Takip kodu kopyalandı')
    setTimeout(() => setCopied(false), 2000)
  }

  const shareOrder = (order: CustomerSafeOrderDTO) => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      void navigator.share({
        title: `${shopName} — Servis Takip`,
        text: `${order.device_brand} ${order.device_model} cihazımın servis durumu: ${order.status_label}`,
        url: window.location.href,
      })
    } else {
      copyOrderNo(order.order_no)
    }
  }

  return (
    <div className="min-h-screen bg-[#05061a] text-white flex flex-col selection:bg-sky-500 selection:text-white">
      {/* Background ambient lighting */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-sky-600/15 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -right-32 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl" />
        <div className="absolute bottom-10 left-1/3 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl" />
      </div>

      {/* ── Top Header ── */}
      <header className="relative z-20 border-b border-white/5 bg-[#05061a]/80 backdrop-blur-md sticky top-0">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {shopLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shopLogo} alt="" className="w-10 h-10 rounded-xl object-contain bg-white/10 shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 to-violet-600 flex items-center justify-center font-black text-base shadow-lg shadow-sky-500/20 shrink-0">
                {shopName.slice(0, 1)}
              </div>
            )}
            <div className="min-w-0">
              <p className="font-bold text-base tracking-tight truncate">{shopName}</p>
              <p className="text-xs text-white/40 truncate">{shopAddress || 'Müşteri Self-Servis Portalı'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {telHref && (
              <a
                href={telHref}
                className="w-10 h-10 sm:w-auto sm:px-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center gap-1.5 text-xs font-semibold text-white/80 transition-colors"
                title="Mağazayı Ara"
              >
                <Phone size={15} className="text-sky-400" />
                <span className="hidden sm:inline">Ara</span>
              </a>
            )}
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 sm:w-auto sm:px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 flex items-center justify-center gap-1.5 text-xs font-semibold text-emerald-300 transition-colors"
                title="WhatsApp Destek"
              >
                <MessageCircle size={15} />
                <span className="hidden sm:inline">WhatsApp</span>
              </a>
            )}
            {sessionToken && (
              <button
                type="button"
                onClick={handleLogout}
                className="w-10 h-10 rounded-xl bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 flex items-center justify-center text-white/60 hover:text-red-300 transition-colors"
                title="Oturumu Kapat"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Desktop Tab Bar */}
        {sessionToken && (
          <div className="hidden md:flex border-t border-white/5 max-w-4xl mx-auto px-4">
            {[
              { id: 'home', label: 'Ana Sayfa', icon: Home },
              { id: 'services', label: 'Servislerim', icon: Wrench, badge: data?.orders.length },
              { id: 'warranty', label: 'Garanti & Destek', icon: Shield, badge: data?.warranties.length },
              { id: 'documents', label: 'Belgeler', icon: FileText },
              { id: 'notifications', label: 'Bildirimler', icon: Bell, badge: unreadNotifsCount, badgeColor: 'bg-amber-500' },
            ].map(t => {
              const Icon = t.icon
              const active = activeTab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as TabType)}
                  className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
                    active
                      ? 'border-sky-400 text-sky-300 bg-sky-500/10'
                      : 'border-transparent text-white/50 hover:text-white hover:bg-white/[0.02]'
                  }`}
                >
                  <Icon size={15} />
                  <span>{t.label}</span>
                  {Boolean(t.badge) && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold text-white ${t.badgeColor || 'bg-white/20'}`}>
                      {t.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </header>

      {/* ── Main Content Area ── */}
      <main className="relative z-10 flex-1 max-w-4xl w-full mx-auto px-4 py-6 pb-28 md:pb-12">
        {!sessionToken ? (
          /* ── Verification / Login Gate ── */
          <div className="max-w-md mx-auto py-10">
            <div className="text-center mb-8">
              <div className="inline-flex w-16 h-16 rounded-3xl bg-gradient-to-br from-sky-500/20 to-violet-500/20 border border-sky-500/30 items-center justify-center mb-4 shadow-xl shadow-sky-500/10">
                <Smartphone size={32} className="text-sky-400" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mb-2">Müşteri Portali</h1>
              <p className="text-sm text-white/50 leading-relaxed">
                Cihazınızın güncel onarım durumunu, onay bekleyen tekliflerinizi ve garantinizi görüntülemek için sorgulayın.
              </p>
            </div>

            <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md shadow-2xl">
              <form onSubmit={handleVerify} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-white/50 mb-2">
                    Servis No / Takip Kodu / IMEI
                  </label>
                  <div className="relative">
                    <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      value={queryInput}
                      onChange={e => setQueryInput(e.target.value)}
                      placeholder="SRV-2026-0001, 26060001 veya IMEI"
                      className="w-full pl-11 pr-4 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/25 text-sm focus:outline-none focus:border-sky-500/60 focus:bg-white/10 transition-all font-mono"
                    />
                  </div>
                </div>

                {authError && (
                  <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-300 text-xs flex items-start gap-2">
                    <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                    <span>{authError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !queryInput.trim()}
                  className="w-full py-3.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 font-bold rounded-2xl text-sm transition-all shadow-lg shadow-sky-600/30 flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Sorgulanıyor...
                    </>
                  ) : (
                    <>
                      <Search size={16} />
                      Sorgula ve Giriş Yap
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-white/5 text-center">
                <p className="text-xs text-white/30">
                  Takip kodunuz servis kabul fişinizde veya SMS bildiriminizde yer almaktadır.
                </p>
              </div>
            </div>
          </div>
        ) : (
          /* ── Authenticated Customer Experience ── */
          <div>
            {/* 1. Tab: Home */}
            {activeTab === 'home' && (
              <div className="space-y-5 animate-in fade-in duration-300">
                {/* Greeting */}
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black">
                      Hoş Geldiniz, <span className="text-sky-300">{data?.customer.name}</span>
                    </h2>
                    <p className="text-xs text-white/40 mt-0.5">
                      Telefon: {data?.customer.phone_masked}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => sessionToken && void loadPortalData(sessionToken)}
                    className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-xs flex items-center gap-1.5"
                    title="Yenile"
                  >
                    <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                    <span className="hidden sm:inline">Yenile</span>
                  </button>
                </div>

                {/* Hero Active Repair Card */}
                {activeOrder ? (
                  <div className="bg-gradient-to-br from-sky-950/40 via-white/[0.04] to-violet-950/30 border border-sky-500/30 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
                    <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300">
                            Aktif Cihazım
                          </span>
                          <span className="font-mono text-xs text-white/50">{activeOrder.order_no}</span>
                        </div>
                        <h3 className="text-2xl font-black tracking-tight">
                          {activeOrder.device_brand} {activeOrder.device_model}
                        </h3>
                        {activeOrder.device_color && (
                          <p className="text-xs text-white/40 mt-0.5">{activeOrder.device_color}</p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="inline-block px-3.5 py-1.5 rounded-xl bg-sky-500/20 border border-sky-400/30 text-sky-200 text-xs font-bold">
                          {activeOrder.status_label}
                        </span>
                        {activeOrder.eta && (
                          <p className="text-[11px] text-white/40 mt-1.5">
                            Tahmini: {new Date(activeOrder.eta).toLocaleDateString('tr-TR')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="my-5 bg-white/5 p-3.5 rounded-2xl border border-white/5">
                      <div className="flex items-center justify-between text-xs text-white/60 mb-2">
                        <span className="font-semibold flex items-center gap-1.5">
                          <Clock size={13} className="text-sky-400" />
                          Süreç Aşaması
                        </span>
                        <span className="font-mono font-bold text-sky-300">
                          {activeOrder.timeline_step_index + 1} / {activeOrder.timeline.length}
                        </span>
                      </div>
                      <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden flex">
                        <div
                          className="bg-gradient-to-r from-sky-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${Math.round(((activeOrder.timeline_step_index + 1) / activeOrder.timeline.length) * 100)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedOrderId(activeOrder.id)
                          setActiveTab('services')
                        }}
                        className="flex-1 min-w-[130px] py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-sky-600/30"
                      >
                        Detayı & Aşamaları Gör <ChevronRight size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => shareOrder(activeOrder)}
                        className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 font-semibold text-xs flex items-center gap-1.5"
                      >
                        <Share2 size={13} /> Paylaş
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-8 text-center">
                    <Smartphone size={36} className="mx-auto text-white/20 mb-3" />
                    <p className="font-bold text-base">Aktif onarımda cihazınız bulunmuyor</p>
                    <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto">
                      Yeni bir servis kaydı oluşturduğunuzda aşamaları buradan anlık olarak takip edebilirsiniz.
                    </p>
                  </div>
                )}

                {/* Pending Quote Action Alert */}
                {activeOrder?.approval_status === 'pending' && (
                  <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/40 rounded-3xl p-5 shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-amber-500/30 border border-amber-500/50 flex items-center justify-center shrink-0">
                        <DollarSign size={20} className="text-amber-300" />
                      </div>
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/30 text-amber-200">
                          Onay Bekliyor
                        </span>
                        <h4 className="font-black text-base mt-1 text-white">Onarım Fiyat Teklifi Hazır</h4>
                        <p className="text-xs text-white/70 mt-0.5">
                          Tutar:{' '}
                          <span className="font-bold text-amber-300">
                            {formatCurrency(activeOrder.quote.grand_total)}
                          </span>
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setQuoteOrder(activeOrder)
                        setShowQuoteModal(true)
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-amber-500/20"
                    >
                      Teklifi İncele & Yanıtla <ChevronRight size={14} />
                    </button>
                  </div>
                )}

                {/* Quick Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Payment Card */}
                  <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                          <DollarSign size={16} className="text-emerald-400" />
                        </div>
                        <span className="font-bold text-sm">Ödeme Durumu</span>
                      </div>
                      {activeOrder?.payment.status === 'paid' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300">
                          Ödendi
                        </span>
                      ) : activeOrder?.payment.status === 'partial' ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300">
                          Kısmi Ödendi
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-white/10 text-white/50">
                          Ödeme Bekliyor
                        </span>
                      )}
                    </div>

                    <p className="text-2xl font-black text-white">
                      {activeOrder ? formatCurrency(activeOrder.payment.remaining_amount) : '₺0,00'}
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      {activeOrder?.payment.remaining_amount === 0
                        ? 'Tüm servis ücretleri ödendi.'
                        : 'Cihazınızı teslim alırken veya Havale/EFT ile ödeyebilirsiniz.'}
                    </p>
                  </div>

                  {/* Warranty Summary Card */}
                  <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-xl bg-violet-500/20 flex items-center justify-center">
                          <Shield size={16} className="text-violet-400" />
                        </div>
                        <span className="font-bold text-sm">Garanti Kapsamı</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setActiveTab('warranty')}
                        className="text-xs text-sky-400 hover:underline"
                      >
                        Tümünü Gör
                      </button>
                    </div>

                    <p className="text-2xl font-black text-white">
                      {data?.warranties.filter(w => w.status === 'aktif').length || 0}{' '}
                      <span className="text-sm font-semibold text-white/50">Aktif Garanti</span>
                    </p>
                    <p className="text-xs text-white/40 mt-1">
                      Onarımı tamamlanan cihazlarınız resmi servis garantisi altındadır.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* 2. Tab: Services */}
            {activeTab === 'services' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {/* Order Selector Chips */}
                {data && data.orders.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {data.orders.map(o => (
                      <button
                        key={o.id}
                        type="button"
                        onClick={() => setSelectedOrderId(o.id)}
                        className={`px-4 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition-all border ${
                          selectedOrder?.id === o.id
                            ? 'bg-sky-500/20 border-sky-500 text-sky-200'
                            : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
                        }`}
                      >
                        {o.device_brand} {o.device_model} ({o.order_no})
                      </button>
                    ))}
                  </div>
                )}

                {selectedOrder ? (
                  <div className="space-y-5">
                    {/* Selected Order Master Card */}
                    <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-6 shadow-xl">
                      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-5">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-bold text-sky-300">
                              {selectedOrder.order_no}
                            </span>
                            <button
                              type="button"
                              onClick={() => copyOrderNo(selectedOrder.order_no)}
                              className="text-white/30 hover:text-white"
                              title="Kopyala"
                            >
                              <Copy size={13} />
                            </button>
                          </div>
                          <h3 className="text-2xl font-black">
                            {selectedOrder.device_brand} {selectedOrder.device_model}
                          </h3>
                          {selectedOrder.imei && (
                            <p className="text-xs text-white/40 font-mono mt-1">IMEI: {selectedOrder.imei}</p>
                          )}
                        </div>

                        <span className="px-3.5 py-1.5 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-200 text-xs font-bold">
                          {selectedOrder.status_label}
                        </span>
                      </div>

                      {/* Details Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-5 text-xs">
                        <div className="bg-white/5 p-3 rounded-2xl">
                          <p className="text-white/40 uppercase font-bold text-[10px] mb-1">Kabul Tarihi</p>
                          <p className="font-semibold text-white">
                            {new Date(selectedOrder.created_at).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-2xl">
                          <p className="text-white/40 uppercase font-bold text-[10px] mb-1">Tahmini Teslim</p>
                          <p className="font-semibold text-white">
                            {selectedOrder.eta
                              ? new Date(selectedOrder.eta).toLocaleDateString('tr-TR')
                              : 'Belirtilmedi'}
                          </p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-2xl">
                          <p className="text-white/40 uppercase font-bold text-[10px] mb-1">Servis Ücreti</p>
                          <p className="font-bold text-sky-300 text-sm">
                            {formatCurrency(selectedOrder.quote.grand_total)}
                          </p>
                        </div>
                        <div className="bg-white/5 p-3 rounded-2xl">
                          <p className="text-white/40 uppercase font-bold text-[10px] mb-1">Ödeme Durumu</p>
                          <p className="font-semibold text-emerald-400">
                            {selectedOrder.payment.status === 'paid' ? 'Ödendi' : 'Bekliyor'}
                          </p>
                        </div>
                      </div>

                      {/* Fault description */}
                      <div className="bg-white/5 p-4 rounded-2xl">
                        <p className="text-[10px] uppercase font-bold text-white/40 mb-1">Arıza & Şikayet</p>
                        <p className="text-xs text-white/70 leading-relaxed">{selectedOrder.fault_description}</p>
                      </div>

                      {/* Actions row */}
                      <div className="flex flex-wrap gap-2.5 mt-5">
                        <a
                          href={`/api/public/portal/${encodeURIComponent(slug)}/document?type=service_form&id=${selectedOrder.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 min-w-[140px] py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Printer size={13} /> Servis Formu (PDF)
                        </a>
                        {selectedOrder.approval_status === 'pending' && (
                          <button
                            type="button"
                            onClick={() => {
                              setQuoteOrder(selectedOrder)
                              setShowQuoteModal(true)
                            }}
                            className="flex-1 min-w-[140px] py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <DollarSign size={13} /> Teklifi Yanıtla
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Timeline Card */}
                    <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-6 shadow-xl">
                      <h4 className="font-bold text-sm mb-6 flex items-center gap-2">
                        <Clock size={16} className="text-sky-400" />
                        Canlı Onarım Süreci
                      </h4>

                      <div className="space-y-0">
                        {selectedOrder.timeline.map((step, idx) => {
                          const isLast = idx === selectedOrder.timeline.length - 1
                          return (
                            <div key={step.key} className="flex gap-4">
                              <div className="flex flex-col items-center">
                                <div
                                  className={`w-9 h-9 rounded-full flex items-center justify-center text-sm transition-all shrink-0 ${
                                    step.current
                                      ? 'bg-sky-500 ring-4 ring-sky-500/30 text-white font-bold'
                                      : step.completed
                                      ? 'bg-emerald-500/80 text-white'
                                      : 'bg-white/5 border border-white/10 text-white/20'
                                  }`}
                                >
                                  {step.completed && !step.current ? (
                                    <CheckCircle2 size={16} />
                                  ) : (
                                    <span>{step.icon}</span>
                                  )}
                                </div>
                                {!isLast && (
                                  <div
                                    className={`w-0.5 flex-1 min-h-[28px] my-1 ${
                                      step.completed ? 'bg-emerald-500/50' : 'bg-white/10'
                                    }`}
                                  />
                                )}
                              </div>

                              <div className="pb-6 flex-1 pt-1">
                                <p
                                  className={`text-sm font-bold ${
                                    step.current
                                      ? 'text-sky-300'
                                      : step.completed
                                      ? 'text-white'
                                      : 'text-white/30'
                                  }`}
                                >
                                  {step.label}
                                </p>
                                {step.timestamp && (
                                  <p className="text-[11px] text-white/40 mt-0.5">
                                    {new Date(step.timestamp).toLocaleString('tr-TR', {
                                      day: '2-digit',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit',
                                    })}
                                  </p>
                                )}
                                {step.note && (
                                  <p className="text-xs text-white/50 mt-1 bg-white/5 rounded-xl p-2.5 inline-block">
                                    {step.note}
                                  </p>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-center text-white/40 py-10">Servis kaydı bulunamadı</p>
                )}
              </div>
            )}

            {/* 3. Tab: Warranty */}
            {activeTab === 'warranty' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-black">Garanti & Sertifikalar</h3>
                    <p className="text-xs text-white/40 mt-0.5">
                      Onarımı tamamlanan cihazlarınız için aktif garanti kayıtları
                    </p>
                  </div>
                </div>

                {data && data.warranties.length > 0 ? (
                  <div className="space-y-4">
                    {data.warranties.map(w => (
                      <div
                        key={w.id}
                        className="bg-white/[0.04] border border-white/10 rounded-3xl p-6 shadow-xl"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-4 mb-4">
                          <div>
                            <h4 className="text-lg font-black">{w.device_brand} {w.device_model}</h4>
                            {w.imei && <p className="text-xs text-white/40 font-mono mt-0.5">IMEI: {w.imei}</p>}
                          </div>
                          <div className="text-right">
                            {w.status === 'aktif' ? (
                              <span className="px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 text-xs font-bold">
                                {w.days_remaining} Gün Kaldı
                              </span>
                            ) : (
                              <span className="px-3 py-1 rounded-xl bg-white/10 text-white/40 text-xs font-bold">
                                Süresi Doldu
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs mb-4">
                          <div className="bg-white/5 p-3 rounded-2xl">
                            <p className="text-white/40 uppercase font-bold text-[10px] mb-1">Başlangıç</p>
                            <p className="font-semibold text-white">
                              {new Date(w.start_date).toLocaleDateString('tr-TR')}
                            </p>
                          </div>
                          <div className="bg-white/5 p-3 rounded-2xl">
                            <p className="text-white/40 uppercase font-bold text-[10px] mb-1">Bitiş</p>
                            <p className="font-semibold text-white">
                              {new Date(w.end_date).toLocaleDateString('tr-TR')} ({w.warranty_months} Ay)
                            </p>
                          </div>
                        </div>

                        <div className="mb-4">
                          <p className="text-[10px] uppercase font-bold text-white/40 mb-1.5">
                            Kapsamdaki Parçalar
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {w.covered_parts.map((p, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-200 text-[11px] font-semibold"
                              >
                                {p}
                              </span>
                            ))}
                          </div>
                        </div>

                        {w.claim_status === 'beklemede' && (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-xs text-amber-300 mb-4">
                            ⏳ Bu garanti için açık bir arıza talebiniz bulunmaktadır. Teknik ekibimiz incelemektedir.
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2.5 pt-2">
                          <a
                            href={`/api/public/portal/${encodeURIComponent(slug)}/document?type=warranty&id=${w.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="flex-1 min-w-[130px] py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                          >
                            <Printer size={13} /> Garanti Belgesi (PDF)
                          </a>
                          {w.status === 'aktif' && w.claim_status !== 'beklemede' && (
                            <button
                              type="button"
                              onClick={() => {
                                setClaimWarranty(w)
                                setShowClaimModal(true)
                              }}
                              className="flex-1 min-w-[130px] py-2.5 px-4 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-sky-600/20"
                            >
                              <Wrench size={13} /> Garanti Talebi Oluştur
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-8 text-center">
                    <Shield size={36} className="mx-auto text-white/20 mb-3" />
                    <p className="font-bold text-base">Kayıtlı garanti belgeniz bulunamadı</p>
                    <p className="text-xs text-white/40 mt-1 max-w-sm mx-auto">
                      Servisiniz tamamlandıktan sonra garanti sertifikanız otomatik olarak bu alanda listelenecektir.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 4. Tab: Documents */}
            {activeTab === 'documents' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-xl font-black">Resmi Belgelerim</h3>
                  <p className="text-xs text-white/40 mt-0.5">
                    Servis teslim fişleri, fiyat teklifleri ve garanti sertifikalarınızı yazdırabilir veya indirebilirsiniz.
                  </p>
                </div>

                <div className="space-y-3">
                  {data?.orders.map(o => (
                    <div
                      key={`doc-order-${o.id}`}
                      className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-sky-500/20 flex items-center justify-center shrink-0">
                          <FileText size={18} className="text-sky-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">Servis Kabul Formu</p>
                          <p className="text-xs text-white/40 truncate">
                            {o.device_brand} {o.device_model} ({o.order_no})
                          </p>
                        </div>
                      </div>
                      <a
                        href={`/api/public/portal/${encodeURIComponent(slug)}/document?type=service_form&id=${o.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 shrink-0"
                      >
                        <Printer size={13} /> Yazdır / PDF
                      </a>
                    </div>
                  ))}

                  {data?.warranties.map(w => (
                    <div
                      key={`doc-warr-${w.id}`}
                      className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                          <Shield size={18} className="text-emerald-400" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-sm truncate">Resmi Garanti Sertifikası</p>
                          <p className="text-xs text-white/40 truncate">
                            {w.device_brand} {w.device_model} ({w.warranty_months} Ay)
                          </p>
                        </div>
                      </div>
                      <a
                        href={`/api/public/portal/${encodeURIComponent(slug)}/document?type=warranty&id=${w.id}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold text-white flex items-center gap-1.5 shrink-0"
                      >
                        <Printer size={13} /> Yazdır / PDF
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 5. Tab: Notifications & Profile */}
            {activeTab === 'notifications' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h3 className="text-xl font-black">Bildirimler & Profil</h3>
                  <p className="text-xs text-white/40 mt-0.5">
                    Servis durumu güncellemeleri ve hesap bilgileriniz
                  </p>
                </div>

                {/* Profile Summary Card */}
                <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-2xl bg-sky-500/20 flex items-center justify-center font-bold text-lg text-sky-300">
                      {data?.customer.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="font-black text-base">{data?.customer.name}</h4>
                      <p className="text-xs text-white/40">{data?.customer.phone_masked}</p>
                    </div>
                  </div>
                  <div className="text-xs text-white/50 flex items-center gap-2">
                    <CheckCircle2 size={14} className="text-emerald-400" />
                    <span>KVKK Açık Rıza Durumu: {data?.customer.kvkk_consented ? 'Onaylı' : 'Standart'}</span>
                  </div>
                </div>

                {/* Notifications List */}
                <div className="space-y-3">
                  <h4 className="font-bold text-sm text-white/70">Durum Bildirimleri</h4>
                  {data && data.notifications.length > 0 ? (
                    data.notifications.map(n => (
                      <div
                        key={n.id}
                        onClick={() => {
                          setActiveTab(n.target_tab)
                          if (n.target_id) setSelectedOrderId(n.target_id)
                        }}
                        className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-3 ${
                          !n.read
                            ? 'bg-sky-950/30 border-sky-500/40 hover:bg-sky-950/50'
                            : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]'
                        }`}
                      >
                        <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0 mt-0.5">
                          <Bell size={15} className={!n.read ? 'text-sky-400' : 'text-white/40'} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <p className="font-bold text-sm">{n.title}</p>
                            <span className="text-[10px] text-white/30 shrink-0">
                              {new Date(n.created_at).toLocaleDateString('tr-TR')}
                            </span>
                          </div>
                          <p className="text-xs text-white/60 mt-1">{n.message}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-white/30 py-6 text-xs">Yeni bildirim bulunmuyor</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* ── Mobile Bottom Navigation Bar (Fixed) ── */}
      {sessionToken && (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#05061a]/95 backdrop-blur-xl border-t border-white/10 px-2 py-2 safe-area-bottom">
          <div className="flex items-center justify-around">
            {[
              { id: 'home', label: 'Ana Sayfa', icon: Home },
              { id: 'services', label: 'Servisler', icon: Wrench, badge: data?.orders.length },
              { id: 'warranty', label: 'Garanti', icon: Shield, badge: data?.warranties.length },
              { id: 'documents', label: 'Belgeler', icon: FileText },
              { id: 'notifications', label: 'Bildirim', icon: Bell, badge: unreadNotifsCount, badgeColor: 'bg-amber-500' },
            ].map(t => {
              const Icon = t.icon
              const active = activeTab === t.id
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveTab(t.id as TabType)}
                  className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-2xl transition-all relative ${
                    active ? 'text-sky-400 font-bold' : 'text-white/40 hover:text-white/70'
                  }`}
                >
                  <div className="relative">
                    <Icon size={20} />
                    {Boolean(t.badge) && (
                      <span className={`absolute -top-1.5 -right-2 text-[9px] px-1 rounded-full font-bold text-white ${t.badgeColor || 'bg-sky-600'}`}>
                        {t.badge}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] mt-1 tracking-tight">{t.label}</span>
                </button>
              )
            })}
          </div>
        </nav>
      )}

      {/* ── Quote Approval Modal Dialog ── */}
      {showQuoteModal && quoteOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b0f2a] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                  Onarım Teklifi
                </span>
                <h3 className="text-xl font-black mt-1">
                  {quoteOrder.device_brand} {quoteOrder.device_model}
                </h3>
                <p className="text-xs text-white/40 font-mono mt-0.5">{quoteOrder.order_no}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowQuoteModal(false)}
                className="p-1 rounded-lg text-white/40 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="bg-white/[0.04] border border-white/5 rounded-2xl p-4 space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-white/50">Yedek Parça Tutarı</span>
                <span className="font-semibold text-white">
                  {formatCurrency(quoteOrder.quote.parts_total)}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/50">İşçilik & Servis Hizmeti</span>
                <span className="font-semibold text-white">
                  {formatCurrency(quoteOrder.quote.labor_total)}
                </span>
              </div>
              {quoteOrder.quote.tax_total > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-white/50">KDV</span>
                  <span className="font-semibold text-white">
                    {formatCurrency(quoteOrder.quote.tax_total)}
                  </span>
                </div>
              )}
              <div className="border-t border-white/10 pt-3 flex justify-between items-center">
                <span className="font-bold text-sm text-white">Genel Toplam</span>
                <span className="font-black text-xl text-sky-300">
                  {formatCurrency(quoteOrder.quote.grand_total)}
                </span>
              </div>
            </div>

            {quoteOrder.quote.description && (
              <div className="bg-sky-500/10 border border-sky-500/20 rounded-2xl p-3.5 text-xs text-sky-200">
                <p className="font-bold text-[10px] uppercase tracking-wider mb-1">Açıklama</p>
                <p>{quoteOrder.quote.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                disabled={submittingDecision}
                onClick={() => handleQuoteDecision(false)}
                className="py-3 rounded-2xl border border-red-500/40 text-red-300 font-bold text-xs hover:bg-red-500/10 transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <X size={15} /> Reddet
              </button>
              <button
                type="button"
                disabled={submittingDecision}
                onClick={() => handleQuoteDecision(true)}
                className="py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-lg shadow-emerald-600/30"
              >
                <Check size={15} /> Onayla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Warranty Claim Modal Dialog ── */}
      {showClaimModal && claimWarranty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0b0f2a] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-500/20 text-sky-300">
                  Garanti Talebi
                </span>
                <h3 className="text-xl font-black mt-1">
                  {claimWarranty.device_brand} {claimWarranty.device_model}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowClaimModal(false)}
                className="p-1 rounded-lg text-white/40 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleClaimSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-white/60 mb-1.5">
                  Yaşadığınız Sorun / Arıza Açıklaması
                </label>
                <textarea
                  rows={4}
                  value={claimIssue}
                  onChange={e => setClaimIssue(e.target.value)}
                  placeholder="Cihazınızda oluşan sorunu detaylıca açıklayınız..."
                  className="w-full p-3.5 bg-white/5 border border-white/10 rounded-2xl text-xs text-white placeholder:text-white/25 focus:outline-none focus:border-sky-500 transition-all resize-none"
                />
              </div>

              <div className="p-3 bg-white/5 rounded-2xl text-[11px] text-white/40">
                ℹ️ Garanti talebiniz iletildiğinde servis ekibimiz durumu değerlendirip sizi arayacak veya SMS gönderecektir.
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowClaimModal(false)}
                  className="flex-1 py-3 rounded-2xl border border-white/10 text-white/60 font-bold text-xs hover:bg-white/5"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={submittingClaim || claimIssue.trim().length < 5}
                  className="flex-1 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-lg shadow-sky-600/30"
                >
                  {submittingClaim ? <RefreshCw size={14} className="animate-spin" /> : <Send size={14} />}
                  Talebi Gönder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
