import Link from 'next/link'
import {
  Wrench, ShoppingCart, Wallet, Users, BarChart3, Cloud,
  ArrowRight, CheckCircle2, Building2, Globe, Shield, Zap,
  Layers, RefreshCw, Headphones,
} from 'lucide-react'
import { AuraLogo } from '@/components/landing/AuraLogo'
import { fmtPrice, getLandingPlans, type LandingPlanCard } from '@/lib/landing-plans'
import { AURA_CORPORATE, INTEGRA_STATS } from '@/lib/brand-corporate'

const MODULES = [
  { icon: Wrench, title: 'Teknik Servis & Atölye', desc: 'Kabul, kanban, parça, QC ve teknisyen atama — uçtan uca servis yönetimi.', tags: ['Kanban', 'Parça stok', 'SMS onay'] },
  { icon: ShoppingCart, title: 'Stok & Satış (POS)', desc: 'Envanter, POS, alış ve kampanya — tek envanter defteri.', tags: ['POS', 'Alış→stok', 'Kritik uyarı'] },
  { icon: Wallet, title: 'Finans & Kasa', desc: 'Vardiya bazlı kasa, gün sonu raporu ve gelir-gider takibi.', tags: ['Vardiya Z', 'Kasa sync', 'KDV özeti'] },
  { icon: Users, title: 'Müşteri Portalı', desc: 'Slug bazlı online takip; bayi feature flag ile yönetim.', tags: ['Portal', 'Takip linki', 'Bildirim'] },
  { icon: BarChart3, title: 'Dashboard & Raporlar', desc: 'Canlı KPI, trend grafikleri ve operasyon özeti.', tags: ['7g grafik', 'Remote KPI', 'Export'] },
  { icon: Cloud, title: 'Çok Kiracılı Admin', desc: 'Bayi, paket, başvuru ve sağlık paneli — SaaS operasyonu.', tags: ['Bayi CRUD', 'Audit', 'Feature flags'] },
]

const STEPS = [
  { n: '01', title: 'Başvuru & Onay', desc: 'Bayi formu admin paneline düşer; deneme hesabınız açılır.' },
  { n: '02', title: 'Kurulum & Eğitim', desc: 'Bulut erişim — kurulum yok. Veri aktarımı ve kısa onboarding.' },
  { n: '03', title: 'Canlı Operasyon', desc: 'Stok, servis ve finans aynı gün senkron çalışmaya başlar.' },
]

const NAV = [
  { href: '#cozumler', label: 'Çözümler' },
  { href: '#nasil-calisir', label: 'Süreç' },
  { href: '#paketler', label: 'Paketler' },
  { href: '#kurumsal', label: 'Kurumsal' },
  { href: '/basvuru', label: 'Bayi Başvuru' },
]

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
          <nav className="hidden md:flex items-center gap-7">
            {NAV.map((l) => (
              <a key={l.href} href={l.href} className="text-sm font-semibold text-[var(--landing-muted)] hover:text-[var(--landing-accent)] transition-colors">
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

      {/* Hero */}
      <section className="relative pt-14 pb-20 md:pt-20 md:pb-28 landing-surface overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_30%_0%,rgba(14,143,173,0.09),transparent)] pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-5 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <a
              href={CORPORATE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#a5d8e8] bg-[#e8f6fa] text-[#0c5f73] text-xs font-semibold mb-6 hover:bg-[#d4f0f7] transition-colors"
            >
              <Building2 size={14} />
              AURA Bilişim · {AURA_CORPORATE.tagline}
              <ArrowRight size={12} />
            </a>
            <h1 className="text-4xl sm:text-5xl font-black leading-[1.1] tracking-tight mb-5">
              <span className="block text-[var(--landing-text)]">Premium entegrasyon,</span>
              <span className="block hero-gradient-text mt-1">uçtan uca işletme yönetimi</span>
            </h1>
            <p className="text-base text-[var(--landing-muted)] leading-relaxed mb-8 max-w-lg">
              <strong className="text-[var(--landing-text)] font-semibold">AURA İntegra</strong> — bayi ve servis
              noktaları için stok, servis, finans ve müşteri portalını tek bulut platformunda birleştirir.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mb-10">
              <Link href="/basvuru" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[var(--landing-accent)] text-white font-bold hover:opacity-95 shadow-lg">
                {trialDays} Gün Ücretsiz Dene <ArrowRight size={18} />
              </Link>
              <a href="#cozumler" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] text-[var(--landing-text)] font-semibold hover:border-[var(--landing-accent)]">
                Çözümleri Keşfet
              </a>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {trust.map((t) => (
                <div key={t.label} className="landing-stat rounded-xl border px-4 py-3">
                  <p className="text-xl font-black text-[#0c5f73]">{t.value}</p>
                  <p className="text-[11px] text-[var(--landing-muted)] font-semibold mt-0.5">{t.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Dashboard mockup */}
          <div className="relative">
            <div className="absolute -inset-3 bg-gradient-to-br from-[#b8dce8]/50 to-[#94c5d8]/30 rounded-3xl blur-xl" />
            <div className="landing-card relative overflow-hidden">
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--landing-border)] bg-[#eef3f8]">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="ml-2 text-[10px] text-[var(--landing-muted)] font-mono">integra.aurabilisim.net</span>
              </div>
              <div className="p-5 grid grid-cols-3 gap-3">
                {[
                  { label: 'Bugün Ciro', val: '₺18.420' },
                  { label: 'Aktif Servis', val: '24' },
                  { label: 'Kasa', val: '₺42.8K' },
                ].map((k) => (
                  <div key={k.label} className="rounded-lg bg-[#eef3f8] border border-[var(--landing-border)] p-3">
                    <p className="text-[9px] uppercase tracking-wider text-[var(--landing-muted)] font-bold">{k.label}</p>
                    <p className="text-lg font-black text-[#0c5f73] mt-0.5">{k.val}</p>
                  </div>
                ))}
              </div>
              <div className="px-5 pb-5">
                <div className="h-20 rounded-lg bg-[#eef3f8] border border-[var(--landing-border)] flex items-end gap-1 px-2 pb-1.5">
                  {[35, 55, 40, 70, 50, 85, 65, 90, 60].map((h, i) => (
                    <div key={i} className="flex-1 rounded-t bg-gradient-to-t from-[#0e8fad] to-[#5ec4db]" style={{ height: `${h}%` }} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Modules */}
      <section id="cozumler" className="py-20 border-t border-[var(--landing-border)]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-[var(--landing-accent)] text-xs font-bold uppercase tracking-[0.2em] mb-2">Çözümler</p>
            <h2 className="text-3xl md:text-4xl font-black text-[var(--landing-text)] mb-3">Modüler entegrasyon platformu</h2>
            <p className="text-[var(--landing-muted)] max-w-xl mx-auto">Her modül aynı veri modelinde — stok, servis ve finans birbirini besler.</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {MODULES.map((m) => (
              <article key={m.title} className="landing-card p-5 transition-all duration-300 group">
                <div className="w-10 h-10 rounded-lg bg-[var(--landing-accent-soft)] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <m.icon size={20} className="text-[var(--landing-accent)]" />
                </div>
                <h3 className="text-base font-bold text-[var(--landing-text)] mb-1.5">{m.title}</h3>
                <p className="text-sm text-[var(--landing-muted)] leading-relaxed mb-3">{m.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {m.tags.map((tag) => (
                    <span key={tag} className="landing-tag">{tag}</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="nasil-calisir" className="py-20 landing-surface border-t border-[var(--landing-border)]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-[var(--landing-accent)] text-xs font-bold uppercase tracking-[0.2em] mb-2">Süreç</p>
            <h2 className="text-3xl font-black text-[var(--landing-text)]">3 adımda canlıya geçin</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            {STEPS.map((s) => (
              <div key={s.n} className="landing-card p-6">
                <span className="text-3xl font-black text-[var(--landing-accent-soft)]">{s.n}</span>
                <h3 className="text-lg font-bold text-[var(--landing-text)] mt-2 mb-2">{s.title}</h3>
                <p className="text-sm text-[var(--landing-muted)]">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations strip */}
      <section className="py-14 border-t border-[var(--landing-border)]">
        <div className="max-w-6xl mx-auto px-5 grid sm:grid-cols-3 gap-6">
          {[
            { icon: Layers, title: 'Tek veri modeli', desc: 'Stok hareketi finansı, servis parçayı otomatik günceller.' },
            { icon: RefreshCw, title: 'Bulut senkron', desc: 'Çok kiracılı yapı — bayi verisi izole, merkezden yönetilir.' },
            { icon: Headphones, title: 'Admin + destek', desc: 'Paket, başvuru ve bayi operasyonu tek komuta merkezinde.' },
          ].map((item) => (
            <div key={item.title} className="flex gap-4 items-start">
              <div className="w-10 h-10 rounded-lg bg-[var(--landing-accent-soft)] flex items-center justify-center shrink-0">
                <item.icon size={20} className="text-[var(--landing-accent)]" />
              </div>
              <div>
                <p className="font-bold text-[var(--landing-text)] text-sm">{item.title}</p>
                <p className="text-xs text-[var(--landing-muted)] mt-1">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Corporate */}
      <section id="kurumsal" className="py-20 landing-surface border-t border-[var(--landing-border)]">
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

      {/* Pricing — admin ayarlardan */}
      <section id="paketler" className="py-20 border-t border-[var(--landing-border)]">
        <div className="max-w-6xl mx-auto px-5">
          <div className="text-center mb-12">
            <p className="text-[var(--landing-accent)] text-xs font-bold uppercase tracking-[0.2em] mb-2">Paketler</p>
            <h2 className="text-3xl md:text-4xl font-black text-[var(--landing-text)] mb-2">Kümülatif lisans modeli</h2>
            <p className="text-[var(--landing-muted)] text-sm">
              Fiyat ve özellikler <strong className="text-[var(--landing-text)]">Admin → Ayarlar → Paket Yönetimi</strong> üzerinden güncellenir.
            </p>
          </div>
          <PricingGrid trialDays={trialDays} plans={plans} />
        </div>
      </section>

      {/* CTA */}
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
            {NAV.map((l) => (
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
