'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import {
  CheckCircle2,
  Globe,
  ArrowRight,
  Shield,
  Zap,
  Building2,
  Sparkles,
} from 'lucide-react'
import { LandingNavbar } from './LandingNavbar'
import { LandingHero2 } from './LandingHero2'
import { LandingTrustStrip } from './LandingTrustStrip'
import { LandingCoreFlow } from './LandingCoreFlow'
import { LandingServiceSection } from './LandingServiceSection'
import { LandingFinanceSection } from './LandingFinanceSection'
import { LandingMobileSection } from './LandingMobileSection'
import { LandingPortalSection } from './LandingPortalSection'
import { LandingAdminSection } from './LandingAdminSection'
import { LandingRealtimeSection } from './LandingRealtimeSection'
import { LandingSecuritySection } from './LandingSecuritySection'
import { LandingRolesSection } from './LandingRolesSection'
import { LandingProcessSection } from './LandingProcessSection'
import { LandingDemoSection } from './LandingDemoSection'
import { LandingFooter } from './LandingFooter'
import { LandingDemoModal } from './LandingDemoModal'
import { AuraLogo } from './AuraLogo'
import type { LandingPlanCard } from '@/lib/landing-plans'
import { AURA_CORPORATE } from '@/lib/brand-corporate'

function fmtPrice(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 0 }).format(n)
}

type Props = {
  plans: LandingPlanCard[]
  trialDays: number
}

function planDesc(level: number) {
  if (level === 1) return 'Stok, POS, müşteri ve alış modülleri.'
  if (level === 2) return 'Teknik servis & atölye katmanı — alt paket dahil.'
  return 'Finans, raporlar ve tam kurumsal modül seti.'
}

export function LandingPageShell({ plans, trialDays }: Props) {
  const [demoModalOpen, setDemoModalOpen] = useState(false)

  const openDemo = () => setDemoModalOpen(true)
  const closeDemo = () => setDemoModalOpen(false)

  return (
    <div className="landing-page min-h-screen font-sans overflow-x-hidden bg-[#f4f7fb] text-slate-900 selection:bg-[#0e8fad] selection:text-white">
      {/* 1 — Sticky Navbar 2.0 */}
      <LandingNavbar onOpenDemo={openDemo} />

      {/* 2, 3, 4 — Hero 2.0 & Authentic Visual Showcase & Micro Copy */}
      <LandingHero2 onOpenDemo={openDemo} />

      {/* 5 — Verified Trust Strip (No Fake Metrics) */}
      <LandingTrustStrip />

      {/* 6 — Core Unified Product Flow */}
      <LandingCoreFlow />

      {/* 7 — Service & Workshop Lifecycle Section */}
      <LandingServiceSection />

      {/* 8 — Finance & Multi-Payment Ledger Section */}
      <LandingFinanceSection />

      {/* 9 — Mobile 2.0 Field Service Section */}
      <LandingMobileSection onOpenDemo={openDemo} />

      {/* 10 — Customer Portal & Digital Tracking Section */}
      <LandingPortalSection />

      {/* 11 — Admin 2.0 Command Center Section */}
      <LandingAdminSection />

      {/* 12 — Realtime Reactive Sync Section */}
      <LandingRealtimeSection />

      {/* 13 — Enterprise Security & RLS Section */}
      <LandingSecuritySection />

      {/* 14 — Role-Based Experience Section */}
      <LandingRolesSection />

      {/* 15 — 5-Step Process & Onboarding Section */}
      <LandingProcessSection />

      {/* Pricing & Cumulative Plan Section */}
      <section id="paketler" className="py-20 md:py-28 bg-white border-b border-slate-200/80 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-[#0c5f73] text-xs font-bold uppercase tracking-wider mb-3">
              <Sparkles size={14} />
              <span>Şeffaf & Kümülatif Lisans</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">
              İşletmenizin ölçeğine uygun paketler
            </h2>
            <p className="text-base text-slate-600 leading-relaxed">
              Tüm paketler bulut tabanlıdır ve anında yükseltilebilir. Gizli ücret veya kurulum maliyeti yoktur.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {plans.map((p) => (
              <div
                key={p.id}
                className={`rounded-2xl p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 relative ${
                  p.popular
                    ? 'bg-white border-2 border-[#0e8fad] shadow-xl shadow-[#0e8fad]/10 ring-4 ring-[#0e8fad]/10'
                    : 'bg-slate-50/70 border border-slate-200 hover:border-slate-300 hover:bg-white hover:shadow-md'
                }`}
              >
                {p.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full bg-[#0e8fad] text-white shadow-sm">
                    En Çok Tercih Edilen
                  </span>
                )}

                <div>
                  <p className="text-xs font-black uppercase tracking-wider text-[#0e8fad] mb-1.5">{p.name}</p>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl sm:text-4xl font-black text-slate-900">{fmtPrice(p.price)}</span>
                    <span className="text-xs font-bold text-slate-500">/ ay</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-6 min-h-[36px]">{planDesc(p.level)}</p>

                  <div className="space-y-2.5 mb-8">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Paket Kapsamı</p>
                    {p.features.slice(0, 6).map((f) => (
                      <div key={f} className="flex items-start gap-2 text-xs font-semibold text-slate-700">
                        <CheckCircle2 size={15} className="text-[#0e8fad] shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-2 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={openDemo}
                    className={`w-full text-center py-3 rounded-xl font-bold text-sm transition-all ${
                      p.popular
                        ? 'bg-[#0e8fad] text-white hover:bg-[#0c7a94] shadow-md shadow-[#0e8fad]/20'
                        : 'border border-slate-300 bg-white text-slate-800 hover:border-[#0e8fad] hover:text-[#0e8fad]'
                    }`}
                  >
                    Demo Talep Et
                  </button>
                  <Link
                    href="/basvuru"
                    className="block text-center text-[11px] font-semibold text-slate-500 hover:text-slate-800 py-1"
                  >
                    Doğrudan Bayi Başvurusu Yap →
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Clarity Guarantee Box */}
          <div className="mt-14 max-w-4xl mx-auto rounded-2xl border border-slate-200 bg-slate-50/80 p-6 sm:p-8">
            <p className="text-xs font-black uppercase tracking-wider text-[#0e8fad] mb-2">
              Kapsam Netliği & Altyapı
            </p>
            <h3 className="text-lg font-black text-slate-900 mb-4">Dahil Olan / Olmayan Yetenekler</h3>
            <div className="grid sm:grid-cols-2 gap-6 text-xs">
              <div className="space-y-2">
                <p className="font-bold text-emerald-800 uppercase tracking-wider">✓ Tam Entegre Dahil:</p>
                <ul className="space-y-2 text-slate-700 font-medium">
                  <li className="flex gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" /> Servis kabul → 12 nokta QC → teslimat zinciri</li>
                  <li className="flex gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" /> Stok envanter, POS, vardiya Z kasası, cari hareketler</li>
                  <li className="flex gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" /> Müşteri takip portalı ve karekodlu fiş sistemi</li>
                  <li className="flex gap-2"><CheckCircle2 size={14} className="text-emerald-600 shrink-0 mt-0.5" /> iOS & Android teknisyen mobil web arayüzü</li>
                </ul>
              </div>
              <div className="space-y-2">
                <p className="font-bold text-slate-500 uppercase tracking-wider">— Altyapı Tercihleri:</p>
                <ul className="space-y-2 text-slate-600 font-medium">
                  <li className="flex gap-2"><span className="text-amber-500 font-bold shrink-0">—</span> e-Fatura GİB: opsiyonel entegratör köprüsü</li>
                  <li className="flex gap-2"><span className="text-amber-500 font-bold shrink-0">—</span> Genel muhasebe defteri değil; operasyonel defter</li>
                  <li className="flex gap-2"><span className="text-amber-500 font-bold shrink-0">—</span> SMS & WhatsApp: NetGSM veya bayi SMS sağlayıcısı</li>
                  <li className="flex gap-2"><span className="text-amber-500 font-bold shrink-0">—</span> RLS korumalı bağımsız tenant veritabanı alanı</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Corporate Heritage Section */}
      <section id="kurumsal" className="py-20 md:py-28 bg-[#f8fafc] border-b border-slate-200/80 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-[#0e8fad] text-xs font-black uppercase tracking-[0.2em] mb-2">Kurumsal Güven</p>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-3">
              {AURA_CORPORATE.name} · {AURA_CORPORATE.tagline}
            </h2>
            <p className="text-xs font-bold text-slate-500 mb-4">{AURA_CORPORATE.city} · İleri Teknoloji Servis ve Mühendislik Üssü</p>
            <p className="text-sm text-slate-600 leading-relaxed mb-4">{AURA_CORPORATE.shortBio}</p>
            <p className="text-sm text-slate-600 leading-relaxed mb-6">{AURA_CORPORATE.integraBridge}</p>

            <ul className="space-y-2.5 mb-8">
              {AURA_CORPORATE.trustPoints.map((point) => (
                <li key={point} className="flex items-start gap-2.5 text-xs font-semibold text-slate-800">
                  <CheckCircle2 size={16} className="text-[#0e8fad] shrink-0 mt-0.5" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>

            <a
              href={AURA_CORPORATE.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-[#0e8fad] hover:text-[#0c7a94] font-bold text-sm"
            >
              <Globe size={16} /> aurabilisim.net kurumsal sitesini ziyaret edin <ArrowRight size={14} />
            </a>
          </div>

          <div className="space-y-4">
            {AURA_CORPORATE.expertise.map((e) => (
              <div key={e.title} className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
                <h3 className="font-bold text-slate-900 text-sm">{e.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{e.desc}</p>
              </div>
            ))}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <Shield size={20} className="text-[#0e8fad] mb-2" />
                <p className="font-bold text-slate-900 text-xs">KVKK Uyumlu</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Uçtan uca veri güvenliği</p>
              </div>
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs">
                <Zap size={20} className="text-[#0e8fad] mb-2" />
                <p className="font-bold text-slate-900 text-xs">Yüksek Hassasiyet</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Mühendislik standardı</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 16 — High Impact Demo Section */}
      <LandingDemoSection onOpenDemo={openDemo} />

      {/* 17 — Footer 2.0 */}
      <LandingFooter />

      {/* Interactive Demo Modal */}
      <LandingDemoModal isOpen={demoModalOpen} onClose={closeDemo} />
    </div>
  )
}
