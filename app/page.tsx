import Link from 'next/link'

// ─── Static Data ───────────────────────────────────────────────────────────────
const MODULES = [
  {
    icon: '🔧',
    title: 'Teknik Servis',
    desc: 'Gelen cihazdan teslime 24 durumlu state machine ile tam kontrol.',
    features: [
      'Teknisyen atama + parça akışı',
      'Yedek cihaz yönetimi (3 seviye)',
      'Müşteri SMS onay token akışı',
      'Intake / garanti / makbuz PDF',
    ],
  },
  {
    icon: '🔄',
    title: 'Alış-Satış (2.El & Sıfır)',
    desc: 'IMEI sorgulama, KVKK sözleşme otomatik, POS entegre.',
    features: [
      '2.el cihaz alım wizard (4 adım)',
      'IMEI sorgu & kayıp/çalıntı kontrolü',
      'Sözleşme PDF + SHA-256 hash',
      'POS + kasa/banka entegre',
    ],
  },
  {
    icon: '📦',
    title: 'Stok & Tedarik',
    desc: 'Şube bazlı stok, tedarikçi, sipariş ve envanter sayımı.',
    features: [
      'Parça siparişi (kısmi alım destekli)',
      'Şubeler arası transfer',
      'Tedarikçi iade + hurda parça çıkarımı',
      'ZPL etiket + QR kod',
    ],
  },
  {
    icon: '💰',
    title: 'Finans & Muhasebe',
    desc: 'TDHP hesap planı, KDV beyanı, çek, dönem kapanış.',
    features: [
      'Otomatik fiş üretimi (Satış/Servis/İade)',
      'KDV beyanı 391/191 + ödeme',
      'Çek girişi/ciro/takas/iade',
      'Yıl başı açılış muhasebesi',
    ],
  },
  {
    icon: '👤',
    title: 'Müşteri Portalı',
    desc: 'Müşteriniz servisini kendi portalinden takip etsin.',
    features: [
      'İsim / telefon ile sorgulama',
      'Servis durumu takibi',
      'WhatsApp bildirim entegrasyonu',
      'Garanti PDF indirme',
    ],
  },
  {
    icon: '📊',
    title: 'Raporlar & Dashboard',
    desc: 'Gerçek zamanlı KPI, marka/teknisyen/cihaz raporları.',
    features: [
      'Günlük/haftalık/aylık dönem raporları',
      'Marka istatistikleri, teknisyen performans',
      'Kasa/banka bakiye, ciro 12 ay grafik',
      'Excel / PDF dışa aktarım',
    ],
  },
]

const PLANS = [
  {
    name: 'Deneme',
    price: 'Ücretsiz',
    period: '30 gün',
    desc: 'Tüm özellikleri risksiz deneyin.',
    popular: false,
    features: ['Tüm modüller (30 gün)', '1 kullanıcı', 'E-posta destek', 'Veri dışa aktarım'],
    cta: 'Ücretsiz Başla',
  },
  {
    name: 'Profesyonel',
    price: '₺1.490',
    period: 'aylık',
    desc: 'Büyüyen teknik servis işletmeleri için.',
    popular: true,
    features: ['Tüm modüller', '5 kullanıcı', 'Öncelikli destek', 'API erişimi', 'Özel raporlar'],
    cta: 'Hemen Başvur',
  },
  {
    name: 'Kurumsal',
    price: '₺2.990',
    period: 'aylık',
    desc: 'Çok şubeli büyük işletmeler için.',
    popular: false,
    features: [
      'Tüm modüller',
      'Sınırsız kullanıcı',
      '7/24 telefon destek',
      'Özel entegrasyon',
      'SLA garantisi',
      'Çoklu şube',
    ],
    cta: 'Teklif Al',
  },
]

const NAV_LINKS = [
  { href: '#ozellikler', label: 'Özellikler' },
  { href: '#fiyatlar', label: 'Fiyatlar' },
  { href: '/basvuru', label: 'Bayi Başvuru' },
]

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans overflow-x-hidden">

      {/* ══ NAVBAR ══════════════════════════════════════════════════════ */}
      <nav className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src="/logocad.svg"
              width={44}
              height={44}
              alt="AURA Bilişim Logo"
              className="w-11 h-11 object-contain"
              style={{ filter: 'none' }}
            />
            <div>
              <p className="font-black text-base text-slate-900 leading-none tracking-tight">
                AURA <span className="text-blue-600">BİLİŞİM</span>
              </p>
              <p className="text-[10px] text-slate-400 leading-none mt-0.5 tracking-wide">
                Teknik Servis ERP
              </p>
            </div>
          </div>

          {/* Links */}
          <div className="hidden md:flex items-center gap-7">
            {NAV_LINKS.map(l => (
              <a key={l.href} href={l.href}
                className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
                {l.label}
              </a>
            ))}
          </div>

          {/* CTA */}
          <div className="flex items-center gap-3">
            <Link href="/login"
              className="text-sm font-medium text-slate-600 hover:text-blue-600 transition-colors">
              Giriş Yap
            </Link>
            <Link href="/basvuru"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-all shadow-md shadow-blue-600/20">
              Ücretsiz Dene
            </Link>
          </div>
        </div>
      </nav>

      {/* ══ HERO ════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-white pt-20 pb-32">
        {/* subtle grid */}
        <div className="absolute inset-0 hero-grid-bg opacity-60 pointer-events-none" />
        {/* blue glow */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-100/60 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* LEFT */}
            <div className="space-y-8">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-full text-blue-700 text-xs font-semibold">
                <span className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                Türkiye&apos;nin Teknik Servis ERP Çözümü
              </div>

              {/* H1 */}
              <div>
                <h1 className="text-5xl md:text-6xl font-black leading-[1.08] text-slate-900 mb-3 tracking-tight">
                  Teknik Servisi<br />
                  <span className="text-blue-600">Geleceğe Taşıyın</span>
                </h1>
                <p className="text-slate-500 text-lg leading-relaxed max-w-xl mt-4">
                  Servis takibinden stok yönetimine, POS&apos;tan finansal raporlamaya —
                  <strong className="text-slate-800"> tek platformda tam kontrol.</strong>
                </p>
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/basvuru"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-600/25 text-base">
                  30 Gün Ücretsiz Başla
                  <span>→</span>
                </Link>
                <a href="#ozellikler"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-slate-200 hover:border-blue-300 text-slate-700 hover:text-blue-600 font-semibold rounded-xl transition-all text-base">
                  Özellikleri İncele
                </a>
              </div>

              {/* Key value props */}
              <div className="flex flex-wrap gap-4 pt-2">
                {[
                  { icon: '✓', text: 'Kurulum gerektirmez' },
                  { icon: '✓', text: '30 gün ücretsiz' },
                  { icon: '✓', text: 'Türk teknik desteği' },
                ].map(p => (
                  <div key={p.text} className="flex items-center gap-2 text-sm text-slate-600">
                    <span className="text-blue-600 font-bold">{p.icon}</span>
                    {p.text}
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — Dashboard Mockup (light) */}
            <div className="relative lg:block hidden">
              {/* Floating cards */}
              <div className="absolute -left-6 top-8 z-20 animate-float-slow">
                <div className="bg-white border border-green-200 rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2.5 whitespace-nowrap">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full flex-shrink-0" />
                  <div>
                    <p className="text-green-700 text-xs font-semibold">✅ Servis Tamamlandı</p>
                    <p className="text-slate-400 text-[10px]">iPhone 15 Pro · Az önce</p>
                  </div>
                </div>
              </div>

              <div className="absolute -right-4 bottom-16 z-20 animate-float-medium">
                <div className="bg-white border border-orange-200 rounded-xl px-4 py-2.5 shadow-lg flex items-center gap-2.5 whitespace-nowrap">
                  <span className="text-lg">📦</span>
                  <div>
                    <p className="text-orange-700 text-xs font-semibold">Kritik Stok Uyarısı</p>
                    <p className="text-slate-400 text-[10px]">Batarya Samsung A54 · 2 adet kaldı</p>
                  </div>
                </div>
              </div>

              {/* Main dashboard card */}
              <div className="bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden">
                {/* Titlebar */}
                <div className="bg-slate-50 px-4 py-3 flex items-center gap-2 border-b border-slate-200">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 bg-slate-200/60 rounded-md h-5 mx-2 flex items-center px-2">
                    <span className="text-slate-400 text-[10px]">aura.erp · Dashboard</span>
                  </div>
                </div>

                <div className="flex h-64">
                  {/* Sidebar */}
                  <div className="w-12 bg-slate-50 flex flex-col items-center py-4 gap-3 border-r border-slate-200">
                    {['🏠', '🔧', '📦', '💰', '📊'].map((icon, i) => (
                      <div key={i}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm cursor-pointer transition-colors ${i === 0 ? 'bg-blue-600 text-white' : 'hover:bg-slate-200'}`}>
                        {icon}
                      </div>
                    ))}
                  </div>

                  {/* Content */}
                  <div className="flex-1 p-4 overflow-hidden">
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      {[
                        { label: 'Bekleyen', val: '12', color: 'text-amber-600' },
                        { label: 'İşlemde', val: '8', color: 'text-blue-600' },
                        { label: 'Tamamlandı', val: '34', color: 'text-green-600' },
                      ].map(s => (
                        <div key={s.label} className="bg-slate-50 border border-slate-200 rounded-lg p-2 text-center">
                          <p className={`text-xl font-black ${s.color}`}>{s.val}</p>
                          <p className="text-[9px] text-slate-400">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-1.5">
                      {[
                        { job: 'JOB-001', device: 'iPhone 15 Pro', status: 'İşlemde', col: 'text-blue-600 bg-blue-50' },
                        { job: 'JOB-002', device: 'Samsung A54', status: 'Parça Bek.', col: 'text-orange-600 bg-orange-50' },
                        { job: 'JOB-003', device: 'MacBook Pro', status: 'Tamamlandı', col: 'text-green-600 bg-green-50' },
                      ].map(r => (
                        <div key={r.job} className="flex items-center justify-between bg-slate-50 rounded-lg px-2.5 py-1.5">
                          <span className="text-[10px] text-slate-400 font-mono">{r.job}</span>
                          <span className="text-[10px] text-slate-700 font-medium">{r.device}</span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${r.col}`}>{r.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ══ MODÜLLER ════════════════════════════════════════════════════ */}
      <section id="ozellikler" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-blue-600 text-sm font-semibold uppercase tracking-widest mb-3">Özellikler</p>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Her şey tek platformda</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">
              Teknik servis işletmenizin ihtiyaç duyduğu tüm araçlar — birbiriyle entegre, eksiksiz çalışır.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {MODULES.map(m => (
              <div key={m.title}
                className="group p-6 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-lg hover:shadow-blue-50 transition-all duration-300">
                <div className="text-3xl mb-4">{m.icon}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{m.title}</h3>
                <p className="text-sm text-slate-500 mb-4 leading-relaxed">{m.desc}</p>
                <ul className="space-y-2">
                  {m.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ FİYATLAR ════════════════════════════════════════════════════ */}
      <section id="fiyatlar" className="py-24 bg-slate-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-blue-600 text-sm font-semibold uppercase tracking-widest mb-3">Fiyatlandırma</p>
            <h2 className="text-4xl font-black text-slate-900 mb-4">Şeffaf fiyat, sürpriz yok</h2>
            <p className="text-slate-500 text-lg">30 gün ücretsiz deneyin — kredi kartı gerekmez.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {PLANS.map(p => (
              <div key={p.name}
                className={`relative rounded-2xl p-8 flex flex-col ${
                  p.popular
                    ? 'bg-blue-600 text-white shadow-2xl shadow-blue-600/30 scale-[1.03]'
                    : 'bg-white border border-slate-200'
                }`}>
                {p.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                    <span className="bg-amber-400 text-amber-900 text-xs font-black px-4 py-1.5 rounded-full shadow-md">
                      ⭐ EN POPÜLER
                    </span>
                  </div>
                )}
                <div className="mb-6">
                  <p className={`text-sm font-bold uppercase tracking-widest mb-1 ${p.popular ? 'text-blue-200' : 'text-blue-600'}`}>
                    {p.name}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className={`text-4xl font-black ${p.popular ? 'text-white' : 'text-slate-900'}`}>
                      {p.price}
                    </span>
                    <span className={`text-sm ${p.popular ? 'text-blue-200' : 'text-slate-400'}`}>
                      / {p.period}
                    </span>
                  </div>
                  <p className={`text-sm mt-2 ${p.popular ? 'text-blue-100' : 'text-slate-500'}`}>{p.desc}</p>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {p.features.map(f => (
                    <li key={f} className="flex items-center gap-2.5 text-sm">
                      <span className={`text-base ${p.popular ? 'text-blue-200' : 'text-blue-500'}`}>✓</span>
                      <span className={p.popular ? 'text-blue-100' : 'text-slate-600'}>{f}</span>
                    </li>
                  ))}
                </ul>
                <Link href="/basvuru"
                  className={`block text-center py-3 rounded-xl font-bold transition-all ${
                    p.popular
                      ? 'bg-white text-blue-600 hover:bg-blue-50 shadow-lg'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}>
                  {p.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA BANNER ══════════════════════════════════════════════════ */}
      <section className="py-24 bg-blue-600">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <img src="/logocad.svg" width={64} height={64} alt="AURA" className="mx-auto mb-6 w-16 h-16 object-contain brightness-0 invert" />
          <h2 className="text-4xl font-black text-white mb-4">
            Bayinizi hemen açın
          </h2>
          <p className="text-blue-100 text-lg mb-8 max-w-2xl mx-auto">
            AURA İntegra ile teknik servis işletmenizi dijitalleştirin.
            30 gün boyunca tüm özelliklere ücretsiz erişin.
          </p>
          <Link href="/basvuru"
            className="inline-flex items-center gap-2 px-10 py-4 bg-white text-blue-600 font-black rounded-xl hover:bg-blue-50 transition-all shadow-xl text-lg">
            Ücretsiz Başvur →
          </Link>
        </div>
      </section>

      {/* ══ FOOTER ══════════════════════════════════════════════════════ */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <img src="/logocad.svg" width={36} height={36} alt="AURA"
                className="w-9 h-9 object-contain brightness-0 invert opacity-70" />
              <div>
                <p className="font-bold text-white">AURA BİLİŞİM</p>
                <p className="text-xs text-slate-500">aurabilisim.net</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-6 text-sm">
              {NAV_LINKS.map(l => (
                <a key={l.href} href={l.href} className="hover:text-white transition-colors">{l.label}</a>
              ))}
              <Link href="/login" className="hover:text-white transition-colors">Giriş Yap</Link>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm text-slate-500">© 2026 AURA Bilişim</p>
              <p className="text-xs text-slate-600 mt-0.5">Tüm hakları saklıdır.</p>
            </div>
          </div>
        </div>
      </footer>

    </div>
  )
}
