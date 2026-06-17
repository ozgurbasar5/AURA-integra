'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getTenantBlockMessage, type TenantBlockReason } from '@/lib/subscription'
import { setActiveTenantId } from '@/lib/store'
import { Eye, EyeOff, Loader2, Wrench, Package, BarChart3, ShoppingCart, Shield, Cloud, ArrowRight } from 'lucide-react'
import { AuraLogo } from '@/components/landing/AuraLogo'
import { AURA_CORPORATE } from '@/lib/brand-corporate'

const FEATURES = [
  { icon: Wrench,       label: 'Atölye & Servis',    desc: 'Kanban, parça, teknisyen — sahadan gelen deneyim' },
  { icon: Package,      label: 'Stok & POS',         desc: 'Envanter, satış ve alış tek defterde' },
  { icon: BarChart3,    label: 'Finans & Rapor',     desc: 'Kasa, vardiya ve KPI panelleri' },
  { icon: ShoppingCart, label: 'Bayi Operasyonu',    desc: 'Çok kiracılı admin ve paket yönetimi' },
  { icon: Shield,       label: 'KVKK Uyumlu',        desc: 'Müşteri verileri güvende' },
  { icon: Cloud,        label: 'Bulut Senkron',      desc: '7/24 web erişim, kurulum yok' },
]

export default function LoginForm() {
  const searchParams = useSearchParams()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const [configError, setConfigError] = useState('')
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    try {
      const supabase = createClient()
      supabase.auth.getSession().then(({ data: { session } }: { data: { session: unknown } }) => {
        setHasSession(!!session)
      })
    } catch {
      /* env eksik — build/SSR güvenli */
    }
  }, [])

  useEffect(() => {
    fetch('/api/health/supabase')
      .then(r => r.json())
      .then((data) => {
        if (!data.env?.ok) setConfigError(data.env.message)
        else if (data.env.urlRef && data.env.anonRef && data.env.urlRef !== data.env.anonRef) {
          setConfigError(
            `URL ve anon key farklı projelere ait (URL: ${data.env.urlRef}, anon: ${data.env.anonRef}). ` +
            'Supabase → Settings → API bölümünden ikisini birlikte kopyalayın.'
          )
        } else if (!data.env.serviceRef) {
          setConfigError(
            'SUPABASE_SERVICE_ROLE_KEY eksik — giriş çalışır; admin/bayi oluşturma için service role key ekleyin.'
          )
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const err = searchParams.get('error')
    if (!err) return

    const errorMessages: Record<string, string> = {
      admin_offline: 'Süper admin paneli yalnızca sunucu bağlantısı varken açılabilir.',
      admin_denied: 'Bu hesap süper admin paneline erişemez.',
      service_unavailable: 'Sunucuya ulaşılamıyor. Lütfen daha sonra tekrar deneyin.',
      profile_inactive: getTenantBlockMessage('profile_inactive'),
      no_tenant: getTenantBlockMessage('no_tenant'),
      passive: getTenantBlockMessage('passive'),
      suspended: getTenantBlockMessage('suspended'),
      subscription_expired: getTenantBlockMessage('subscription_expired'),
      payment_overdue: getTenantBlockMessage('payment_overdue'),
    }

    if (errorMessages[err]) {
      setError(errorMessages[err])
      return
    }

    const blockMsg = getTenantBlockMessage(err as TenantBlockReason)
    if (blockMsg) setError(blockMsg)
  }, [searchParams])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ email: email.trim(), password }),
      })

      const json = await res.json()

      if (!res.ok || !json.ok) {
        setError(json.error || 'Giriş başarısız.')
        return
      }

      if (json.tenant_id) setActiveTenantId(json.tenant_id)

      window.location.href = json.redirect || '/dashboard'
    } catch {
      setError('Bağlantı hatası. Sayfayı yenileyip tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-[#e8edf3]">
      {/* ── Sol Panel — AURA Bilişim + İntegra ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12
                      bg-gradient-to-br from-[#0e3d4f] via-[#0e5568] to-[#0e8fad] relative overflow-hidden">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-[-120px] right-[-120px] w-[400px] h-[400px] bg-white/[0.07] rounded-full blur-3xl animate-pulse" style={{ animationDuration: '4s' }} />
          <div className="absolute bottom-[-80px] left-[-80px] w-[300px] h-[300px] bg-blue-400/[0.1] rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-sky-500/[0.05] rounded-full blur-3xl" />
          {/* Grid pattern */}
          <div className="absolute inset-0 opacity-[0.03]" style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, white 1px, transparent 0)`,
            backgroundSize: '40px 40px'
          }} />
        </div>

        {/* Logo */}
        <div className="relative z-10 space-y-4">
          <AuraLogo size="lg" variant="light" product="integra" />
          <a
            href={AURA_CORPORATE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-cyan-200/80 text-xs font-semibold hover:text-white transition-colors"
          >
            {AURA_CORPORATE.name} · {AURA_CORPORATE.tagline}
            <ArrowRight size={12} />
          </a>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] mb-4">
              Bayi panelinize<br />
              <span className="bg-gradient-to-r from-cyan-200 to-sky-100 bg-clip-text text-transparent">
                güvenle giriş yapın.
              </span>
            </h1>
            <p className="text-cyan-100/75 text-base leading-relaxed max-w-md">
              {AURA_CORPORATE.integraBridge}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {AURA_CORPORATE.stats.map((s) => (
              <div key={s.label} className="rounded-xl bg-white/10 border border-white/10 px-3 py-2.5">
                <p className="text-lg font-black text-cyan-200">{s.value}</p>
                <p className="text-[10px] text-cyan-100/60 font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Feature grid */}
          <div className="grid grid-cols-2 gap-3">
            {FEATURES.map((f, i) => (
              <div key={f.label}
                className="group p-3.5 rounded-xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.08] hover:bg-white/[0.12] transition-all duration-300 cursor-default"
                style={{ animationDelay: `${i * 100}ms` }}>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:bg-white/20 transition-colors">
                    <f.icon size={14} className="text-blue-200" />
                  </div>
                  <div>
                    <p className="text-white text-xs font-bold">{f.label}</p>
                    <p className="text-blue-200/50 text-[10px] mt-0.5 leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 flex items-center justify-between gap-4">
          <p className="text-cyan-200/50 text-xs">© 2026 {AURA_CORPORATE.name}</p>
          <div className="flex items-center gap-4 text-xs">
            <a href={AURA_CORPORATE.url} target="_blank" rel="noopener noreferrer" className="text-cyan-200/50 hover:text-white transition-colors">
              aurabilisim.net
            </a>
            <a href="/" className="text-cyan-200/50 hover:text-white transition-colors">
              Ana Sayfa
            </a>
          </div>
        </div>
      </div>

      {/* ── Sağ Panel (Form) ──────────────────────────────── */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-10 bg-[#f4f7fb]">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="mb-10 lg:hidden">
            <AuraLogo size="md" variant="dark" product="integra" />
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Hoş geldiniz 👋</h2>
            <p className="text-slate-500 text-sm mt-1.5">Hesabınıza giriş yapın</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {hasSession && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 text-sm text-blue-900 space-y-2">
                <p className="font-semibold">Zaten giriş yaptınız.</p>
                <div className="flex flex-wrap gap-3">
                  <a href="/admin" className="text-blue-700 font-bold hover:underline">Admin paneli →</a>
                  <a href="/dashboard" className="text-blue-700 font-bold hover:underline">Bayi paneli →</a>
                  <a href="/login?cikis=1" className="text-red-600 font-bold hover:underline">Çıkış yap</a>
                </div>
              </div>
            )}
            {configError && (
              <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3">
                <p className="text-amber-900 text-sm leading-relaxed">{configError}</p>
              </div>
            )}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">E-posta</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="ornek@email.com"
                required
                className={`w-full px-4 py-3 rounded-xl border bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400
                  focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white
                  transition-all duration-200 ${error ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Şifre</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className={`w-full px-4 py-3 pr-11 rounded-xl border bg-slate-50/50 text-sm text-slate-900 placeholder:text-slate-400
                    focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white
                    transition-all duration-200 ${error ? 'border-red-300 bg-red-50/30' : 'border-slate-200'}`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(s => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-0.5"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-50 border border-red-200/80 rounded-xl px-4 py-3 animate-fade-in-up">
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-red-600 text-xs font-bold">!</span>
                </div>
                <p className="text-red-700 text-sm leading-relaxed">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-bold rounded-xl
                transition-all duration-200 shadow-lg shadow-sky-200/50
                disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {loading && <Loader2 size={18} className="animate-spin" />}
              {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-100 text-center space-y-3">
            <p className="text-slate-500 text-sm">
              Henüz hesabınız yok mu?{' '}
              <a href="/basvuru" className="text-blue-600 font-bold hover:text-blue-700 transition-colors">
                Bayi Başvurusu Yapın →
              </a>
            </p>
            <a href="/login?cikis=1" className="block text-slate-400 text-xs hover:text-red-600 transition-colors">
              Oturumu kapat
            </a>
            <a href="/" className="block text-slate-400 text-xs hover:text-slate-600 transition-colors">
              ← Ana Sayfaya Dön
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
