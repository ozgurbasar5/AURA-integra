'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2 } from 'lucide-react'
import { AuraLogo } from '@/components/landing/AuraLogo'
import { AURA_CORPORATE } from '@/lib/brand-corporate'
import { getPlanLevel } from '@/lib/plan-tiers'
import TurnstileWidget, { type TurnstileHandle } from '@/components/TurnstileWidget'

// ─── TYPES ─────────────────────────────────────────────────────────────────────
type ServiceType = 'cep_telefonu' | 'robot_supurge' | 'akilli_saat' | 'bilgisayar'
type PlanType = 'deneme' | 'stok_satis' | 'teknik_servis' | 'finans'
type MonthlyService = '<10' | '10-50' | '50-100' | '100+'

interface FormData {
  firma_adi: string
  yetkili_adi: string
  email: string
  telefon: string
  sehir: string
  servis_turleri: ServiceType[]
  aylik_servis: MonthlyService | ''
  paket: PlanType | ''
  mesaj: string
  kvkk: boolean
}

interface FormErrors {
  firma_adi?: string
  yetkili_adi?: string
  email?: string
  telefon?: string
  servis_turleri?: string
  aylik_servis?: string
  paket?: string
  kvkk?: string
}

const PLAN_KEY_BY_LEVEL: Record<number, PlanType> = {
  1: 'stok_satis',
  2: 'teknik_servis',
  3: 'finans',
}

const DEFAULT_PLAN_OPTIONS: { value: PlanType; label: string; price: string; tag?: string }[] = [
  { value: 'deneme', label: '30 Gün Deneme', price: 'Ücretsiz', tag: 'Önerilen' },
  { value: 'stok_satis', label: 'Stok & Satış', price: '₺450/ay' },
  { value: 'teknik_servis', label: 'Teknik Servis', price: '₺750/ay', tag: 'Vitrin' },
  { value: 'finans', label: 'Finans & Analitik', price: '₺1.200/ay' },
]

// ─── SUCCESS SCREEN ────────────────────────────────────────────────────────────
function SuccessScreen({ firmaAdi }: { firmaAdi: string }) {
  return (
    <div className="landing-page min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Animated checkmark */}
        <div className="flex justify-center mb-8">
          <div className="relative w-24 h-24">
            <div
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, #dcfce7, #bbf7d0)',
                animation: 'scaleIn 0.5s ease-out',
              }}
            >
              <svg
                className="w-12 h-12 text-emerald-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
                style={{ animation: 'drawCheck 0.6s 0.3s ease-out both' }}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </div>
        </div>

        <style>{`
          @keyframes scaleIn {
            from { transform: scale(0); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
          @keyframes drawCheck {
            from { stroke-dashoffset: 100; opacity: 0; }
            to { stroke-dashoffset: 0; opacity: 1; }
          }
        `}</style>

        <h1 className="text-2xl font-extrabold text-slate-900 mb-3">
          Başvurunuz Alındı! 🎉
        </h1>
        <p className="text-slate-600 mb-2">
          <span className="font-semibold text-slate-800">{firmaAdi}</span> için başvurunuzu başarıyla aldık.
        </p>
        <p className="text-slate-500 text-sm mb-8">
          Uzman ekibimiz <strong>24 saat içinde</strong> sizinle iletişime geçecek ve
          kurulum sürecini birlikte planlayacağız.
        </p>

        <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 mb-8 text-left">
          <h3 className="text-sm font-bold text-slate-700 mb-3">Sonraki adımlar:</h3>
          <ul className="space-y-2.5">
            {[
              'E-posta adresinize onay maili gönderildi',
              '24 saat içinde uzmanımız sizi arayacak',
              '30 günlük deneme hesabınız oluşturulacak',
            ].map((step, i) => (
              <li key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-600 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/"
            className="flex-1 py-3 px-6 text-sm font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all text-center"
          >
            ← Ana Sayfaya Dön
          </Link>
          <Link
            href="/login"
            className="flex-1 py-3 px-6 text-sm font-semibold text-white bg-sky-600 rounded-xl hover:bg-sky-500 shadow-sm shadow-sky-200 transition-all text-center"
          >
            Giriş Yap
          </Link>
        </div>
      </div>
    </div>
  )
}

// ─── MAIN FORM ─────────────────────────────────────────────────────────────────
export default function BasvuruPage() {
  const [form, setForm] = useState<FormData>({
    firma_adi: '',
    yetkili_adi: '',
    email: '',
    telefon: '',
    sehir: '',
    servis_turleri: [],
    aylik_servis: '',
    paket: '',
    mesaj: '',
    kvkk: false,
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileSiteKey, setTurnstileSiteKey] = useState('')
  const [captchaRequired, setCaptchaRequired] = useState(false)
  const [captchaMisconfigured, setCaptchaMisconfigured] = useState(false)
  const [captchaConfigLoading, setCaptchaConfigLoading] = useState(true)
  const [turnstileLoadError, setTurnstileLoadError] = useState(false)
  const turnstileRef = useRef<TurnstileHandle>(null)
  const [trialDays, setTrialDays] = useState(30)
  const [planOptions, setPlanOptions] = useState(DEFAULT_PLAN_OPTIONS)

  useEffect(() => {
    fetch('/api/public/turnstile-config')
      .then((r) => r.json())
      .then((json: { siteKey?: string; required?: boolean; misconfigured?: boolean }) => {
        setCaptchaRequired(Boolean(json.required))
        setCaptchaMisconfigured(Boolean(json.misconfigured))
        if (json.siteKey?.trim()) setTurnstileSiteKey(json.siteKey.trim())
      })
      .catch(() => setTurnstileLoadError(true))
      .finally(() => setCaptchaConfigLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/public/plans')
      .then((r) => r.json())
      .then((json) => {
        const trial = Number(json.trialDays) || 30
        setTrialDays(trial)
        const rows = json.data as Array<{ name: string; price: number; is_active: boolean }> | undefined
        if (!rows?.length) return

        const opts: typeof DEFAULT_PLAN_OPTIONS = [
          { value: 'deneme', label: `${trial} Gün Deneme`, price: 'Ücretsiz', tag: 'Önerilen' },
        ]
        for (const p of rows) {
          const level = getPlanLevel(p.name)
          const key = PLAN_KEY_BY_LEVEL[level]
          if (!key || opts.some((o) => o.value === key)) continue
          opts.push({
            value: key,
            label: p.name,
            price: `₺${Number(p.price).toLocaleString('tr-TR')}/ay`,
            tag: p.is_active ? 'Vitrin' : undefined,
          })
        }
        if (opts.length >= 2) setPlanOptions(opts)
      })
      .catch(() => {})
  }, [])

  // ── Validation ──────────────────────────────────────────────────────────────
  function validate(): boolean {
    const e: FormErrors = {}

    if (!form.firma_adi.trim()) e.firma_adi = 'Firma adı zorunludur'
    if (!form.yetkili_adi.trim()) e.yetkili_adi = 'Yetkili adı zorunludur'
    if (!form.email.trim()) {
      e.email = 'E-posta zorunludur'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Geçerli bir e-posta girin'
    }
    if (!form.telefon.trim()) {
      e.telefon = 'Telefon zorunludur'
    } else if (!/^[0-9+\s()-]{10,15}$/.test(form.telefon.trim())) {
      e.telefon = 'Geçerli bir telefon numarası girin'
    }
    if (form.servis_turleri.length === 0) e.servis_turleri = 'En az bir servis türü seçin'
    if (!form.aylik_servis) e.aylik_servis = 'Lütfen bir aralık seçin'
    if (!form.paket) e.paket = 'Lütfen bir paket seçin'
    if (!form.kvkk) e.kvkk = 'KVKK onayı zorunludur'

    setErrors(e)
    return Object.keys(e).length === 0
  }

  // ── Handlers ────────────────────────────────────────────────────────────────
  function handleText(field: keyof FormData, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  function handleServiceToggle(type: ServiceType) {
    setForm(prev => {
      const current = prev.servis_turleri
      const updated = current.includes(type)
        ? current.filter(t => t !== type)
        : [...current, type]
      return { ...prev, servis_turleri: updated }
    })
    if (errors.servis_turleri) setErrors(prev => ({ ...prev, servis_turleri: undefined }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitError('')

    if (!validate()) return

    if (captchaConfigLoading) {
      setSubmitError('Güvenlik doğrulaması yükleniyor, lütfen bekleyin.')
      return
    }
    if (captchaMisconfigured) {
      setSubmitError('CAPTCHA yapılandırması eksik. Site yöneticisine bildirin (TURNSTILE site key).')
      return
    }
    if (captchaRequired && !turnstileToken) {
      setSubmitError('Güvenlik doğrulamasını tamamlayın (aşağıdaki kutuyu bekleyin).')
      return
    }
    if (captchaRequired && turnstileLoadError) {
      setSubmitError('Güvenlik doğrulaması yüklenemedi. Sayfayı yenileyip tekrar deneyin.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/basvuru', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, turnstile_token: turnstileToken }),
      })

      const data = await res.json().catch(() => ({}))
      if (!res.ok || data.success === false) {
        if (captchaRequired) turnstileRef.current?.reset()
        throw new Error(data.error || 'Gönderim başarısız oldu')
      }

      setSubmitted(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Beklenmedik bir hata oluştu')
    } finally {
      setLoading(false)
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────
  if (submitted) return <SuccessScreen firmaAdi={form.firma_adi} />

  // ── Input helpers ───────────────────────────────────────────────────────────
  const inputBase = (error?: string) =>
    `w-full border rounded-xl px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-all focus:ring-2 ${
      error
        ? 'border-red-300 bg-red-50 focus:ring-red-100 focus:border-red-400'
        : 'border-slate-200 bg-white focus:ring-sky-100 focus:border-sky-400'
    }`

  const serviceOptions: { value: ServiceType; label: string; icon: string }[] = [
    { value: 'cep_telefonu', label: 'Cep Telefonu', icon: '📱' },
    { value: 'robot_supurge', label: 'Robot Süpürge', icon: '🤖' },
    { value: 'akilli_saat', label: 'Akıllı Saat', icon: '⌚' },
    { value: 'bilgisayar', label: 'Bilgisayar', icon: '💻' },
  ]

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="landing-page min-h-screen" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      <nav className="landing-nav sticky top-0 z-40 border-b backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 h-[4rem] flex items-center justify-between">
          <Link href="/"><AuraLogo size="sm" variant="dark" product="integra" /></Link>
          <div className="flex items-center gap-4">
            <a href={AURA_CORPORATE.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-[var(--landing-muted)] hover:text-[var(--landing-accent)] hidden sm:inline">
              aurabilisim.net
            </a>
            <Link href="/login" className="text-sm font-semibold text-[var(--landing-accent)]">
              Giriş →
            </Link>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-10 grid lg:grid-cols-[minmax(0,1fr)_380px] gap-8 items-start">
        {/* Sol — kurumsal güven */}
        <aside className="hidden lg:block space-y-4 sticky top-24">
          <div className="landing-card p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--landing-accent)] mb-2">{AURA_CORPORATE.tagline}</p>
            <h2 className="text-xl font-black text-[var(--landing-text)] mb-3">{AURA_CORPORATE.name}</h2>
            <p className="text-sm text-[var(--landing-muted)] leading-relaxed mb-4">{AURA_CORPORATE.shortBio}</p>
            <ul className="space-y-2 mb-4">
              {AURA_CORPORATE.trustPoints.map((t) => (
                <li key={t} className="flex gap-2 text-xs text-[var(--landing-muted)]">
                  <CheckCircle2 size={14} className="text-[var(--landing-accent)] shrink-0 mt-0.5" />
                  {t}
                </li>
              ))}
            </ul>
            <a href={AURA_CORPORATE.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--landing-accent)] hover:opacity-80">
              aurabilisim.net <ArrowRight size={14} />
            </a>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {AURA_CORPORATE.stats.map((s) => (
              <div key={s.label} className="landing-stat rounded-xl border px-3 py-2.5">
                <p className="text-lg font-black text-[#0c5f73]">{s.value}</p>
                <p className="text-[10px] text-[var(--landing-muted)] font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </aside>

        <div className="min-w-0">
          <div className="text-center lg:text-left mb-8">
            <span className="landing-tag mb-3 inline-block">{trialDays} gün ücretsiz deneme</span>
            <h1 className="text-2xl sm:text-3xl font-black text-[var(--landing-text)] mb-2">Bayi Başvuru Formu</h1>
            <p className="text-sm text-[var(--landing-muted)] max-w-lg mx-auto lg:mx-0">
              {AURA_CORPORATE.product} demo hesabı için formu doldurun; ekibimiz 24 saat içinde dönüş yapar.
            </p>
          </div>
        <div className="landing-card overflow-hidden">

          {/* Form header */}
          <div className="border-b border-slate-100 px-8 py-5 bg-slate-50">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-sky-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">Başvuru Bilgileri</p>
                <p className="text-xs text-slate-500">* işaretli alanlar zorunludur</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="px-8 py-8 space-y-6">

            {/* ── Firma & Yetkili ── */}
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Firma Adı *
                </label>
                <input
                  type="text"
                  placeholder="Örn: Koç Teknik Servis"
                  value={form.firma_adi}
                  onChange={e => handleText('firma_adi', e.target.value)}
                  className={inputBase(errors.firma_adi)}
                />
                {errors.firma_adi && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    {errors.firma_adi}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Yetkili Adı *
                </label>
                <input
                  type="text"
                  placeholder="Adınız Soyadınız"
                  value={form.yetkili_adi}
                  onChange={e => handleText('yetkili_adi', e.target.value)}
                  className={inputBase(errors.yetkili_adi)}
                />
                {errors.yetkili_adi && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    {errors.yetkili_adi}
                  </p>
                )}
              </div>
            </div>

            {/* ── E-posta & Telefon ── */}
            <div className="grid sm:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  E-posta *
                </label>
                <input
                  type="email"
                  placeholder="ornek@firma.com"
                  value={form.email}
                  onChange={e => handleText('email', e.target.value)}
                  className={inputBase(errors.email)}
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    {errors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Telefon *
                </label>
                <input
                  type="tel"
                  placeholder="0532 000 00 00"
                  value={form.telefon}
                  onChange={e => handleText('telefon', e.target.value)}
                  className={inputBase(errors.telefon)}
                />
                {errors.telefon && (
                  <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                    <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                    {errors.telefon}
                  </p>
                )}
              </div>
            </div>

            {/* ── Şehir ── */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Şehir
              </label>
              <input
                type="text"
                placeholder="İstanbul, Ankara, İzmir..."
                value={form.sehir}
                onChange={e => handleText('sehir', e.target.value)}
                className={inputBase()}
              />
            </div>

            {/* ── Servis Türleri ── */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                Servis Türleri *
              </label>
              <p className="text-xs text-slate-400 mb-3">Hangi cihazlara servis veriyorsunuz?</p>
              <div className="grid sm:grid-cols-2 gap-2.5">
                {serviceOptions.map((opt) => {
                  const checked = form.servis_turleri.includes(opt.value)
                  return (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                        checked
                          ? 'border-sky-300 bg-sky-50'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleServiceToggle(opt.value)}
                        className="sr-only"
                      />
                      <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                        checked ? 'border-sky-500 bg-sky-500' : 'border-slate-300'
                      }`}>
                        {checked && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className="text-lg">{opt.icon}</span>
                      <span className={`text-sm font-medium ${checked ? 'text-sky-700' : 'text-slate-700'}`}>
                        {opt.label}
                      </span>
                    </label>
                  )
                })}
              </div>
              {errors.servis_turleri && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {errors.servis_turleri}
                </p>
              )}
            </div>

            {/* ── Aylık Servis Sayısı ── */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Aylık Tahmini Servis Sayısı *
              </label>
              <select
                value={form.aylik_servis}
                onChange={e => {
                  setForm(prev => ({ ...prev, aylik_servis: e.target.value as MonthlyService | '' }))
                  if (errors.aylik_servis) setErrors(prev => ({ ...prev, aylik_servis: undefined }))
                }}
                className={inputBase(errors.aylik_servis)}
              >
                <option value="">-- Seçiniz --</option>
                <option value="<10">10'dan az</option>
                <option value="10-50">10 – 50 servis</option>
                <option value="50-100">50 – 100 servis</option>
                <option value="100+">100+ servis</option>
              </select>
              {errors.aylik_servis && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {errors.aylik_servis}
                </p>
              )}
            </div>

            {/* ── Paket Seçimi ── */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                İlgilendiğiniz Paket *
              </label>
              <div className="space-y-2.5">
                {planOptions.map((plan) => {
                  const selected = form.paket === plan.value
                  return (
                    <label
                      key={plan.value}
                      className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${
                        selected
                          ? 'border-sky-400 bg-sky-50 shadow-sm shadow-sky-100'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="paket"
                          value={plan.value}
                          checked={selected}
                          onChange={() => {
                            setForm(prev => ({ ...prev, paket: plan.value }))
                            if (errors.paket) setErrors(prev => ({ ...prev, paket: undefined }))
                          }}
                          className="sr-only"
                        />
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                          selected ? 'border-sky-500' : 'border-slate-300'
                        }`}>
                          {selected && <div className="w-2.5 h-2.5 rounded-full bg-sky-500" />}
                        </div>
                        <div>
                          <p className={`text-sm font-semibold ${selected ? 'text-sky-900' : 'text-slate-800'}`}>
                            {plan.label}
                            {plan.tag && (
                              <span className="ml-2 text-xs px-1.5 py-0.5 bg-sky-600 text-white rounded-full font-semibold">
                                {plan.tag}
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${selected ? 'text-sky-700' : 'text-slate-600'}`}>
                        {plan.price}
                      </span>
                    </label>
                  )
                })}
              </div>
              {errors.paket && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {errors.paket}
                </p>
              )}
            </div>

            {/* ── Mesaj ── */}
            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                Mesajınız <span className="text-slate-400 normal-case font-normal">(opsiyonel)</span>
              </label>
              <textarea
                rows={3}
                placeholder="Özel ihtiyaçlarınız veya sorularınız varsa buraya yazabilirsiniz..."
                value={form.mesaj}
                onChange={e => handleText('mesaj', e.target.value)}
                className={`${inputBase()} resize-none`}
              />
            </div>

            {/* ── KVKK ── */}
            <div>
              <label className={`flex items-start gap-3 cursor-pointer p-4 rounded-xl border transition-all ${
                form.kvkk ? 'border-sky-200 bg-sky-50' : errors.kvkk ? 'border-red-200 bg-red-50' : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}>
                <input
                  type="checkbox"
                  checked={form.kvkk}
                  onChange={e => {
                    setForm(prev => ({ ...prev, kvkk: e.target.checked }))
                    if (errors.kvkk) setErrors(prev => ({ ...prev, kvkk: undefined }))
                  }}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-all ${
                  form.kvkk ? 'border-sky-500 bg-sky-500' : errors.kvkk ? 'border-red-400' : 'border-slate-300'
                }`}>
                  {form.kvkk && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="text-sm text-slate-600 leading-relaxed">
                  <strong className="text-slate-800">KVKK Onay: </strong>
                  Kişisel verilerimin AURA İntegra tarafından 6698 sayılı KVKK kapsamında işlenmesini,{' '}
                  <a href="#" className="text-sky-600 hover:underline" onClick={e => e.stopPropagation()}>
                    Gizlilik Politikası
                  </a>
                  'nı ve{' '}
                  <a href="#" className="text-sky-600 hover:underline" onClick={e => e.stopPropagation()}>
                    Kullanım Şartları
                  </a>
                  'nı okuduğumu ve kabul ettiğimi onaylıyorum. *
                </span>
              </label>
              {errors.kvkk && (
                <p className="text-xs text-red-500 mt-1.5 flex items-center gap-1">
                  <svg className="w-3 h-3 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
                  {errors.kvkk}
                </p>
              )}
            </div>

            {captchaConfigLoading && captchaRequired && (
              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50/80 p-4 text-xs text-slate-500">
                Güvenlik doğrulaması yükleniyor…
              </div>
            )}

            {captchaMisconfigured && (
              <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
                CAPTCHA site key Vercel ortam değişkenlerinde tanımlı değil.{' '}
                <code className="font-mono">NEXT_PUBLIC_TURNSTILE_SITE_KEY</code> veya{' '}
                <code className="font-mono">TURNSTILE_SITE_KEY</code> ekleyip redeploy edin.
              </div>
            )}

            {turnstileSiteKey ? (
              <TurnstileWidget
                ref={turnstileRef}
                siteKey={turnstileSiteKey}
                onToken={setTurnstileToken}
                onError={() => setTurnstileLoadError(true)}
                onExpire={() => setTurnstileToken('')}
              />
            ) : null}

            {/* ── Submit Error ── */}
            {submitError && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200">
                <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-semibold text-red-800">Gönderim hatası</p>
                  <p className="text-xs text-red-600 mt-0.5">{submitError}</p>
                </div>
              </div>
            )}

            {/* ── Submit Button ── */}
            <button
              type="submit"
              disabled={loading || captchaConfigLoading || captchaMisconfigured || (captchaRequired && !turnstileToken)}
              className="w-full py-4 px-6 rounded-xl text-base font-bold text-white bg-[var(--landing-accent)] hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed shadow-md transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Gönderiliyor...
                </>
              ) : (
                <>
                  Başvuruyu Gönder
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </>
              )}
            </button>

            {/* Bottom note */}
            <p className="text-center text-xs text-slate-400">
              🔒 Verileriniz güvende. Spam yapmıyoruz.{' '}
              <Link href="/" className="text-sky-500 hover:underline">
                Ana Sayfaya Dön
              </Link>
            </p>

          </form>
        </div>
        </div>
      </div>

      <footer className="text-center py-6 text-xs text-[var(--landing-muted)] border-t border-[var(--landing-border)] landing-surface">
        © 2026 {AURA_CORPORATE.name} ·{' '}
        <a href={AURA_CORPORATE.url} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--landing-accent)]">aurabilisim.net</a>
        {' · '}
        <Link href="/" className="hover:text-[var(--landing-accent)]">Ana Sayfa</Link>
      </footer>

    </div>
  )
}
