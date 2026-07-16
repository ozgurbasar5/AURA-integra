'use client'

import { useState } from 'react'
import Link from 'next/link'
import { requestTourRestart } from '@/lib/onboarding/tour-events'
import {
  Play, ChevronRight, ChevronLeft, BookOpen,
  ClipboardCheck, ShoppingCart, Package, Wrench, Wallet, Store, MessageSquare, Palette,
} from 'lucide-react'

type TourStep = {
  id: string
  title: string
  module: string
  href: string
  icon: React.ReactNode
  summary: string
  bullets: string[]
  tip?: string
}

const STEPS: TourStep[] = [
  {
    id: 'sms',
    title: 'SMS Kurulumu',
    module: 'Bildirimler',
    href: '/dashboard/ayarlar',
    icon: <MessageSquare size={22} />,
    summary: 'Müşteriye otomatik SMS için Netgsm hesabınızı bağlayın. Platform hazır; siz sadece bilgileri girersiniz.',
    bullets: [
      'Netgsm: kurumsal hesap + SMS kredisi + onaylı gönderici başlığı (mağaza adı)',
      'Ayarlar → Entegrasyonlar: Netgsm Kullanıcı, Başlık, Şifre → Kaydet',
      'Ayarlar → Bildirimler: Otomatik SMS ve durum değişimini açın',
      'SMS Test Gönder ile profil telefonunuza deneme mesajı',
      'Hızlı Kabul ile gerçek müşteriye test SMS gönderin',
    ],
    tip: 'WhatsApp otomatik değil (wa.me manuel). Başlık BTK onaysızsa SMS gitmez.',
  },
  {
    id: 'tema',
    title: 'Tema & Görünüm',
    module: 'Ayarlar',
    href: '/dashboard/ayarlar',
    icon: <Palette size={22} />,
    summary: 'Panel rengi, sol menü stili ve köşe yuvarlaklığını özelleştirin.',
    bullets: [
      'Tema rengi: butonlar, hero banner ve aktif menü',
      'Sol panel: Marka Rengi / Koyu Klasik / Açık Panel',
      'Canlı önizleme ile sidebar + içerik görünümü',
      'İsteğe bağlı özel vurgu rengi (color picker)',
    ],
  },
  {
    id: 'kabul',
    title: 'Hızlı Kabul',
    module: 'Teknik Servis',
    href: '/dashboard/kabul',
    icon: <ClipboardCheck size={22} />,
    summary: 'Müşteri cihazını teslim alır, servis numarası oluşur, fiş ve WhatsApp mesajı hazırlanır.',
    bullets: [
      'Müşteri + cihaz bilgisi girilir',
      'Otomatik iş emri numarası (SRV-...)',
      'Servis fişi yazdırılır — şube adı ayarlardan gelir',
      'SMS / WhatsApp ile takip linki gönderilir',
    ],
  },
  {
    id: 'atolye',
    title: 'Atölye',
    module: 'Teknik Servis',
    href: '/dashboard/atolye',
    icon: <Wrench size={22} />,
    summary: 'Tamir süreci, parça kullanımı ve teslim burada yönetilir.',
    bullets: [
      'Durum makinesi: Bekliyor → Tamirde → Teslime Hazır → Teslim',
      'Parça ekleme: stoktan seçilir, stok düşer, maliyet/kâr hesaplanır',
      'Teslimde nakit/kart gelir kasaya ve finansa yansır',
    ],
    tip: 'Uyumlu parçalar cihaz marka/modeline göre filtrelenir.',
  },
  {
    id: 'stok',
    title: 'Stok & Parça',
    module: 'Envanter',
    href: '/dashboard/stok',
    icon: <Package size={22} />,
    summary: 'Yedek parça envanteri. Alış modülünden farklı: burada sarf parça stoku tutulur.',
    bullets: [
      'Yeni parça → otomatik barkod + etiket yazdırma',
      'Stok girişi → maliyet finansa gider olarak düşer',
      'Sayım → kamera barkod + Excel tablosu',
    ],
    tip: 'Alış modülü ikinci el cihaz alımı içindir; Stok yedek parça içindir.',
  },
  {
    id: 'satis',
    title: 'Satış & POS',
    module: 'Satış',
    href: '/dashboard/satis',
    icon: <ShoppingCart size={22} />,
    summary: 'Barkod okutarak veya arayarak satış — otomatik stok düşümü ve kasa girişi.',
    bullets: [
      'Sepete ürün eklenir (stoktan)',
      'Ödeme yöntemi seçilir (nakit/kart/havale)',
      'Satış tamamlanınca: stok −1, gelir +, kâr hesaplanır',
    ],
    tip: 'POS otomatik mantığı: API stok doğrular → satış kaydı → finans işlemi → kasa RPC.',
  },
  {
    id: 'alis',
    title: 'Alış (Cihaz)',
    module: 'Ticaret',
    href: '/dashboard/alis',
    icon: <Store size={22} />,
    summary: 'İkinci el veya toptan cihaz alım kayıtları — vitrin ve satışa hazırlık için.',
    bullets: [
      'Tedarikçiden cihaz alımı kaydedilir',
      'Alış fiyatı ve IMEI takibi',
      'Vitrin modülüne aktarılabilir',
    ],
  },
  {
    id: 'kasa',
    title: 'Kasa & Vardiya',
    module: 'Finans',
    href: '/dashboard/kasa',
    icon: <Wallet size={22} />,
    summary: 'Sabah kasa açılışı, gün içi işlemler ve akşam Z raporu.',
    bullets: [
      'Vardiya aç: sabahki nakit tutarı girilir (önerilen otomatik)',
      'Gün içi: servis, POS, stok girişleri kasaya yansır',
      'Vardiya kapat: sayım + detaylı rapor (teknik/satis/stok)',
    ],
  },
]

export default function HowItWorksPage() {
  const [active, setActive] = useState(0)
  const [playing, setPlaying] = useState(false)
  const step = STEPS[active]

  function startLiveTour() {
    requestTourRestart()
  }

  function next() {
    setActive(i => (i + 1) % STEPS.length)
  }

  function prev() {
    setActive(i => (i - 1 + STEPS.length) % STEPS.length)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-12">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-sky-500 flex items-center gap-1">
            <BookOpen size={14} /> Nasıl Çalışır?
          </p>
          <h1 className="text-2xl font-black text-[var(--text-primary)] mt-1">İnteraktif Modül Rehberi</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-2">
            Her modülün mantığını adım adım öğrenin. Canlı sayfaya geçerek deneyebilirsiniz.
          </p>
        </div>
        <Link href="/dashboard/dokumantasyon" className="text-xs text-sky-600 font-semibold hover:underline shrink-0">
          PDF / Dokümantasyon →
        </Link>
      </div>

      <div className="surface p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-sky-500/20 bg-sky-500/5">
        <div>
          <p className="text-sm font-bold text-[var(--text-primary)]">Canlı panel turu</p>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            Gerçek arayüz üzerinde Hızlı Kabul, Atölye, Stok ve diğer modülleri adım adım keşfedin.
          </p>
        </div>
        <button type="button" onClick={startLiveTour} className="btn-primary text-sm shrink-0 flex items-center gap-2">
          <Play size={14} /> Turu Başlat
        </button>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-[var(--accent)]/20 hero-themed text-white p-6 sm:p-8 min-h-[280px]">
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <div className="absolute top-0 right-0 w-48 h-48 bg-sky-400 rounded-full blur-3xl" />
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center">
              {step.icon}
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase text-sky-300">{step.module}</p>
              <h2 className="text-xl font-black">{step.title}</h2>
            </div>
            <span className="ml-auto text-xs text-slate-400">{active + 1} / {STEPS.length}</span>
          </div>
          <p className="text-sky-100 text-sm leading-relaxed mb-4">{step.summary}</p>
          <ul className="space-y-2 text-sm">
            {step.bullets.map((b, i) => (
              <li
                key={b}
                className={`flex items-start gap-2 transition-all duration-500 ${playing ? 'opacity-100 translate-x-0' : 'opacity-90'}`}
                style={{ transitionDelay: playing ? `${i * 120}ms` : '0ms' }}
              >
                <ChevronRight size={14} className="text-sky-400 shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
          {step.tip && (
            <p className="mt-4 text-xs bg-amber-500/20 border border-amber-400/30 rounded-xl px-3 py-2 text-amber-100">
              💡 {step.tip}
            </p>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setActive(i)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              i === active ? 'text-white' : 'bg-[var(--bg-muted)] text-[var(--text-secondary)] hover:opacity-80'
            }`}
            style={i === active ? { backgroundColor: 'var(--accent)' } : undefined}
          >
            {s.title}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={prev} className="btn-secondary flex items-center gap-1">
          <ChevronLeft size={16} /> Önceki
        </button>
        <button
          type="button"
          onClick={() => { setPlaying(true); next() }}
          className="btn-primary flex items-center gap-1"
        >
          <Play size={16} /> Sonraki Adım
        </button>
        <Link href={step.href} className="btn-secondary flex items-center gap-1 ml-auto border-sky-500/30 text-sky-600">
          Canlı sayfayı aç →
        </Link>
      </div>
    </div>
  )
}
