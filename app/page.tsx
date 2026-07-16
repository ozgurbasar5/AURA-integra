import Link from 'next/link'
import {
  ArrowRight, CheckCircle2, Globe, Shield, Zap,
} from 'lucide-react'
import { AuraLogo } from '@/components/landing/AuraLogo'
import { fmtPrice, getLandingPlans, type LandingPlanCard } from '@/lib/landing-plans'
import { AURA_CORPORATE, INTEGRA_STATS } from '@/lib/brand-corporate'
import { LANDING_NAV } from '@/lib/landing-modules'
import LandingHeroSection from '@/components/landing/LandingHeroSection'
import LandingFeatureExplorer from '@/components/landing/LandingFeatureExplorer'
import LandingBentoGrid from '@/components/landing/LandingBentoGrid'
import LandingDataFlow from '@/components/landing/LandingDataFlow'
import LandingProcessSteps from '@/components/landing/LandingProcessSteps'
import LandingPortalShowcase from '@/components/landing/LandingPortalShowcase'

const CORPORATE_URL = AURA_CORPORATE.url

function planDesc(level: number) {
  if (level === 1) return 'Stok, POS, müşteri ve alış modülleri.'
  if (level === 2) return 'Teknik servis katmanı — alt paket dahil.'
  return 'Finans, raporlar ve tam modül seti.'
}

function PricingGrid({ trialDays, plans }: { trialDays: number; plans: LandingPlanCard[] }) {
  const cards = [
    {
      name: `${trialDays} Gün Deneme`,
      price: 'Ücretsiz',
      period: 'tüm modüller',
      desc: 'Risk almadan keşfedin.',
      popular: false,
      features: ['Tüm modüller', '1 şube', 'E-posta destek', 'Veri aktarımı'],
      cta: 'Başvur',
    },
    ...plans.map((p) => ({
      name: p.name,
      price: fmtPrice(p.price),
      period: 'aylık',
      desc: planDesc(p.level),
      popular: p.popular,
      features: p.features.slice(0, 6),
      cta: 'Başvuru Yap',
    })),
  ]

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
      {cards.map((p) => (
        <div
          key={p.name}
          className={`landing-card relative p-6 flex flex-col transition-all duration-300 ${
            p.popular ? 'ring-2 ring-[var(--landing-accent)] ring-offset-2 ring-offset-[var(--landing-surface)]' : ''
          }`}
        >
          {p.popular && (
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-black px-3 py-0.5 rounded-full bg-[var(--landing-accent)] text-white">
              VİTRİN
            </span>
          )}
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--landing-accent)] mb-1">{p.name}</p>
          <p className="text-3xl font-black text-[var(--landing-text)]">{p.price}</p>
          <p className="text-xs text-[var(--landing-muted)] mb-1">/ {p.period}</p>
          <p className="text-sm text-[var(--landing-muted)] mb-5 min-h-[40px]">{p.desc}</p>
          <ul className="space-y-2 flex-1 mb-6">
            {p.features.map((f) => (
              <li key={f} className="flex items-start gap-2 text-xs text-[var(--landing-muted)]">
                <CheckCircle2 size={14} className="text-[var(--landing-accent)] shrink-0 mt-0.5" />
                {f}
              </li>
            ))}
          </ul>
          <Link
            href="/basvuru"
            className={`block text-center py-2.5 rounded-lg font-bold text-sm transition-all ${
              p.popular
                ? 'bg-[var(--landing-accent)] text-white hover:opacity-90'
                : 'border border-[var(--landing-border)] text-[var(--landing-text)] hover:border-[var(--landing-accent)] hover:text-[var(--landing-accent)]'
            }`}
          >
            {p.cta}
          </Link>
        </div>
      ))}
    </div>
  )
}

export default async function HomePage() {
  const { trialDays, plans } = await getLandingPlans()

  const trust = [
    ...AURA_CORPORATE.stats.slice(0, 2),
    { value: `${trialDays} gün`, label: 'Ücretsiz deneme' },
    INTEGRA_STATS[0],
  ]

  return (
    <div className="landing-page min-h-screen font-sans overflow-x-hidden">

      <header className="landing-nav sticky top-0 z-50 border-b backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-5 h-[4.25rem] flex items-center justify-between gap-4">
          <Link href="/" className="shrink-0">
            <AuraLogo size="md" variant="dark" product="integra" />
          </Link>
          <nav className="hidden lg:flex items-center gap-6">
            {LANDING_NAV.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-semibold text-[var(--landing-muted)] hover:text-[var(--landing-accent)] transition-colors whitespace-nowrap">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/login" className="text-sm font-semibold text-[var(--landing-muted)] hover:text-[var(--landing-text)] hidden sm:inline">
              Giriş
            </Link>
            <Link href="/basvuru" className="px-4 py-2 rounded-lg bg-[var(--landing-accent)] text-white text-sm font-bold hover:opacity-90 shadow-md">
              Demo Başvur
            </Link>
          </div>
        </div>
      </header>

      <LandingHeroSection trialDays={trialDays} trust={trust} />
      <LandingBentoGrid />
      <LandingFeatureExplorer />
      <LandingDataFlow />
      <LandingPortalShowcase />
      <LandingProcessSteps />

      {/* Corporate */}
      <section id="kurumsal" className="py-20 landing-surface border-t border-[var(--landing-border)] scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5 grid lg:grid-cols-2 gap-10 items-start">
          <div>
            <p className="text-[var(--landing-accent)] text-xs font-bold uppercase tracking-[0.2em] mb-2">Kurumsal</p>
            <h2 className="text-3xl font-black text-[var(--landing-text)] mb-2">
              {AURA_CORPORATE.name} · {AURA_CORPORATE.tagline}
            </h2>
            <p className="text-xs font-semibold text-[var(--landing-muted)] mb-4">{AURA_CORPORATE.city} · High-End Teknik Servis</p>
            <p className="text-[var(--landing-muted)] leading-relaxed mb-4">{AURA_CORPORATE.shortBio}</p>
            <p className="text-[var(--landing-muted)] leading-relaxed mb-6 text-sm">{AURA_CORPORATE.integraBridge}</p>
            <ul className="space-y-2.5 mb-8">
              {AURA_CORPORATE.trustPoints.map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-[var(--landing-text)]">
                  <CheckCircle2 size={16} className="text-[var(--landing-accent)] shrink-0 mt-0.5" />
                  {item}
                </li>
              ))}
            </ul>
            <a href={CORPORATE_URL} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-[var(--landing-accent)] font-semibold text-sm hover:opacity-80">
              <Globe size={16} /> aurabilisim.net <ArrowRight size={14} />
            </a>
          </div>
          <div className="space-y-3">
            {AURA_CORPORATE.expertise.map((e) => (
              <div key={e.title} className="landing-card p-4">
                <p className="font-bold text-[var(--landing-text)] text-sm">{e.title}</p>
                <p className="text-xs text-[var(--landing-muted)] mt-1">{e.desc}</p>
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-1">
              {[
                { icon: Shield, title: 'KVKK uyumlu', desc: 'Veri güvenliği' },
                { icon: Zap, title: '6 ay garanti', desc: 'Servis standardı' },
              ].map((c) => (
                <div key={c.title} className="landing-card p-4">
                  <c.icon size={18} className="text-[var(--landing-accent)] mb-2" />
                  <p className="font-bold text-[var(--landing-text)] text-sm">{c.title}</p>
                  <p className="text-xs text-[var(--landing-muted)] mt-0.5">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section id="paketler" className="py-20 border-t border-[var(--landing-border)] scroll-mt-20">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-[var(--landing-accent)] text-xs font-bold uppercase tracking-[0.2em] mb-2">Paketler</p>
            <h2 className="text-3xl md:text-4xl font-black text-[var(--landing-text)] mb-2">Kümülatif lisans modeli</h2>
            <p className="text-[var(--landing-muted)] text-sm">
              Fiyat ve özellikler <strong className="text-[var(--landing-text)]">Admin → Ayarlar → Paket Yönetimi</strong> üzerinden güncellenir.
            </p>
          </div>
          <PricingGrid trialDays={trialDays} plans={plans} />

          <div className="mt-12 max-w-3xl mx-auto rounded-2xl border border-[var(--landing-border)] bg-[var(--landing-surface)] p-6">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--landing-accent)] mb-2">Kapsam netliği</p>
            <h3 className="text-lg font-black text-[var(--landing-text)] mb-3">Dahil / dahil değil</h3>
            <div className="grid sm:grid-cols-2 gap-4 text-sm">
              <ul className="space-y-2 text-[var(--landing-muted)]">
                <li className="flex gap-2"><CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" /> Servis kabul → atölye → teslim</li>
                <li className="flex gap-2"><CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" /> Stok, POS, kasa vardiyası, cari</li>
                <li className="flex gap-2"><CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" /> Alış / tedarik / sayım</li>
                <li className="flex gap-2"><CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" /> Raporlar & gün sonu (Paket 3)</li>
              </ul>
              <ul className="space-y-2 text-[var(--landing-muted)]">
                <li className="flex gap-2"><span className="text-amber-500 font-bold shrink-0">—</span> e-Fatura GİB: opsiyonel entegratör (NES/Logo)</li>
                <li className="flex gap-2"><span className="text-amber-500 font-bold shrink-0">—</span> Muhasebe defteri / e-Defter değil</li>
                <li className="flex gap-2"><span className="text-amber-500 font-bold shrink-0">—</span> SMS & WhatsApp: bayi ayarına bağlı</li>
                <li className="flex gap-2"><span className="text-amber-500 font-bold shrink-0">—</span> Pazaryeri / e-ticaret yok</li>
              </ul>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/basvuru" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--landing-accent)] text-white text-sm font-bold">
                Demo / bayi başvurusu <ArrowRight size={14} />
              </Link>
              <Link href="/login" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-[var(--landing-border)] text-sm font-bold text-[var(--landing-text)]">
                Giriş yap
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 border-t border-[var(--landing-border)] bg-gradient-to-br from-[#0e8fad] to-[#1e5f8a]">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <AuraLogo size="lg" variant="light" product="integra" className="justify-center mb-6" />
          <h2 className="text-2xl md:text-3xl font-black text-white mb-3">Bayi ağınıza entegre edin</h2>
          <p className="text-[#bae6fd] mb-6 text-sm">Başvurunuz admin paneline iletilir; onay sonrası deneme hesabınız açılır.</p>
          <Link href="/basvuru" className="inline-flex items-center gap-2 px-8 py-3.5 rounded-xl bg-white text-[var(--landing-text)] font-black hover:bg-[#f0f9ff] shadow-lg">
            Bayi Başvurusu <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[var(--landing-border)] py-10 landing-surface">
        <div className="max-w-6xl mx-auto px-5 flex flex-col md:flex-row items-center justify-between gap-5">
          <AuraLogo size="md" variant="dark" product="integra" />
          <div className="flex flex-wrap justify-center gap-5 text-sm text-[var(--landing-muted)]">
            {LANDING_NAV.map((l) => (
              <a key={l.href} href={l.href} className="hover:text-[var(--landing-accent)]">{l.label}</a>
            ))}
            <Link href="/login" className="hover:text-[var(--landing-accent)]">Giriş</Link>
            <a href={CORPORATE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-[var(--landing-accent)]">aurabilisim.net</a>
          </div>
          <p className="text-xs text-[var(--landing-muted)]">© 2026 AURA Bilişim Tic. Ltd. Şti.</p>
        </div>
      </footer>
    </div>
  )
}
