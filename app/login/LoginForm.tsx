'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getTenantBlockMessage, type TenantBlockReason } from '@/lib/subscription'
import { Eye, EyeOff, Loader2, Wrench, Package, BarChart3, ShoppingCart, Shield, Zap } from 'lucide-react'

const FEATURES = [
  { icon: Wrench,       label: 'Atölye Yönetimi',   desc: 'Servis süreçlerini uçtan uca yönetin' },
  { icon: Package,      label: 'Stok Takibi',        desc: 'Parça ve ürün envanterinizi kontrol edin' },
  { icon: BarChart3,    label: 'Gelir Raporları',     desc: 'Gerçek zamanlı finansal analizler' },
  { icon: ShoppingCart,  label: 'POS Satış',          desc: 'Hızlı satış ve kâr marjı takibi' },
  { icon: Shield,       label: 'KVKK Uyumlu',        desc: 'Müşteri verileri güvende' },
  { icon: Zap,          label: 'Yapay Zeka',          desc: 'AI destekli arıza teşhisi' },
]

export default function LoginForm() {
  const supabase = createClient()
  const searchParams = useSearchParams()

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const [configError, setConfigError] = useState('')
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setHasSession(!!session)
    })
  }, [supabase.auth])

  useEffect(() => {
    fetch('/api/health/supabase')
      .then(r => r.json())
      .then((data) => {
        if (!data.env?.ok) setConfigError(data.env.message)
        else if (!data.matchesIntegra) {
          setConfigError(
            `Yanlış Supabase projesi! Beklenen: dipyrdidkvljojkyaqmd (İNTEGRA), sizin: ${data.env.urlRef}. ` +
            'Settings → API\'den URL + anon + service_role key\'i birlikte yapıştırın.'
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

      window.location.href = json.redirect || '/dashboard'
    } catch {
      setError('Bağlantı hatası. Sayfayı yenileyip tekrar deneyin.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* ── Sol Panel — Feature Showcase ─────────────────────────── */}
      <div className="hidden lg:flex lg:w-[55%] flex-col justify-between p-12
                      bg-gradient-to-br from-slate-900 via-slate-800 to-sky-900 relative overflow-hidden">
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
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/10">
              <img src="/logocad.svg" width={28} height={28} alt="AURA Logo"
                className="w-7 h-7 object-contain" />
            </div>
            <div>
              <p className="text-white font-black text-xl tracking-tight">AURA <span className="text-blue-200">BİLİŞİM</span></p>
              <p className="text-blue-200/60 text-[10px] font-semibold uppercase tracking-widest">Teknik Servis ERP</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 space-y-8">
          <div>
            <h1 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] mb-4">
              Servisinizi<br />
              <span className="bg-gradient-to-r from-blue-200 to-violet-200 bg-clip-text text-transparent">
                dijitale taşıyın.
              </span>
            </h1>
            <p className="text-blue-100/70 text-base leading-relaxed max-w-md">
              Servis takibinden stok yönetimine, POS&apos;tan raporlamaya — hepsini tek platformda yönetin.
            </p>
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
        <div className="relative z-10 flex items-center justify-between">
          <p className="text-blue-200/40 text-xs">© 2026 AURA Bilişim. Tüm hakları saklıdır.</p>
          <a href="/" className="text-blue-200/40 text-xs hover:text-white transition-colors">
            ← Ana Sayfaya Dön
          </a>
        </div>
      </div>

      {/* ── Sağ Panel (Form) ──────────────────────────────── */}
      <div className="w-full lg:w-[45%] flex items-center justify-center p-6 sm:p-10 bg-white">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-sky-600 flex items-center justify-center shadow-lg shadow-blue-200">
              <img src="/logocad.svg" width={24} height={24} alt="AURA" className="w-6 h-6 object-contain" />
            </div>
            <div>
              <p className="text-slate-900 font-black text-lg">AURA <span className="text-blue-600">BİLİŞİM</span></p>
              <p className="text-slate-400 text-[10px] font-semibold uppercase tracking-wider">Teknik Servis ERP</p>
            </div>
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
