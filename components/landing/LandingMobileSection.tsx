'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Smartphone,
  Camera,
  QrCode,
  CheckCircle2,
  Package,
  Wrench,
  Wallet,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

type MobileSectionProps = {
  onOpenDemo?: () => void
}

const MOBILE_FEATURES = [
  {
    icon: Wrench,
    title: 'Bugünkü Saha & Atölye İşleri',
    desc: 'Teknisyen sadece kendi üzerine atanmış cihazları ve öncelik sırasını görür.',
  },
  {
    icon: Package,
    title: 'Anında Parça Ekleme & Barkod',
    desc: 'Kamera ile parça barkodunu okutarak iş emrine saniyeler içinde sarfiyat işler.',
  },
  {
    icon: Camera,
    title: 'Delil Fotoğrafı & Hasar Kaydı',
    desc: 'Cihazın ilk hali ve teslim anı fotoğrafları doğrudan müşteri profiline yüklenir.',
  },
  {
    icon: Wallet,
    title: 'Mobil Kasa & Kapıda Tahsilat',
    desc: 'Saha servis teknisyeni müşterinin yanında nakit veya kredi kartı tahsilatını kaydeder.',
  },
]

export function LandingMobileSection({ onOpenDemo }: MobileSectionProps) {
  const [activeScreen, setActiveScreen] = useState<'isler' | 'parca' | 'foto'>('isler')

  return (
    <section id="mobil" className="py-20 md:py-28 bg-slate-900 text-white border-b border-slate-800 relative overflow-hidden scroll-mt-20">
      {/* Background radial glow */}
      <div className="absolute top-1/2 right-1/4 w-96 h-96 bg-[#0e8fad]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        <div className="grid lg:grid-cols-12 gap-12 items-center">
          
          {/* Left Column: Mobile Value & Feature List */}
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-bold uppercase tracking-wider">
              <Smartphone size={14} />
              <span>AURA MOBILE 2.0 (iOS & Android)</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
              Teknisyeninizin masaya ihtiyacı yok.
            </h2>

            <p className="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
              Servisi bulun, durum değiştirin, parça ekleyin, fotoğraf çekin ve teslim edin. Masabaşı bilgisayara bağımlı kalmadan tüm atölye ve saha operasyonu cebinizde.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 pt-4">
              {MOBILE_FEATURES.map((feat) => {
                const Icon = feat.icon
                return (
                  <div
                    key={feat.title}
                    className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/80 hover:border-cyan-500/40 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-300 flex items-center justify-center mb-2.5">
                      <Icon size={16} />
                    </div>
                    <h3 className="text-sm font-bold text-white mb-1">{feat.title}</h3>
                    <p className="text-xs text-slate-400 leading-relaxed">{feat.desc}</p>
                  </div>
                )
              })}
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={onOpenDemo}
                className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-[#0e8fad] hover:bg-[#0c7a94] text-white font-bold text-sm shadow-lg shadow-cyan-500/20 transition-all hover:scale-[1.02]"
              >
                Mobil Deneyimi Keşfet
                <ArrowRight size={16} />
              </button>
              <span className="text-xs text-slate-400 font-semibold">
                ✓ Çevrimdışı (Offline) Kuyruk Desteği Dahil
              </span>
            </div>
          </div>

          {/* Right Column: Realistic Smartphone Frame Mockup */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-[300px] sm:w-[330px] rounded-[3rem] border-4 border-slate-700 bg-slate-950 p-3 shadow-2xl shadow-cyan-500/10">
              
              {/* Smartphone Inner Screen */}
              <div className="rounded-[2.4rem] overflow-hidden bg-slate-900 border border-slate-800 flex flex-col min-h-[580px]">
                
                {/* Dynamic Island / Notch */}
                <div className="pt-3 pb-2 flex justify-center items-center">
                  <div className="w-24 h-4 rounded-full bg-black flex items-center justify-end px-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  </div>
                </div>

                {/* Mobile Screen Header */}
                <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">AURA MOBILE</p>
                    <p className="text-xs font-bold text-white">Kadıköy Şube · Ahmet T.</p>
                  </div>
                  <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full">
                    Online
                  </span>
                </div>

                {/* Mobile Sub-Screen Selector */}
                <div className="p-2 border-b border-slate-800/80 flex gap-1 bg-slate-950/60">
                  {[
                    { id: 'isler', label: 'İşlerim' },
                    { id: 'parca', label: '+ Parça' },
                    { id: 'foto', label: 'Kamera' },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveScreen(tab.id as typeof activeScreen)}
                      className={`flex-1 py-1 text-[10px] font-bold rounded-lg transition-all ${
                        activeScreen === tab.id
                          ? 'bg-[#0e8fad] text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Screen Content: İşlerim */}
                {activeScreen === 'isler' && (
                  <div className="p-3.5 space-y-2.5 flex-1 overflow-y-auto">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span>Aktif İş Listesi (3)</span>
                      <span className="text-cyan-400">Tümü</span>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 space-y-1.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded">SRV-042</span>
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-950 px-1.5 py-0.5 rounded">Tamirde</span>
                      </div>
                      <p className="text-xs font-bold text-white">iPhone 14 Pro — Ekran & Batarya</p>
                      <p className="text-[10px] text-slate-400">Müşteri: Mehmet Demir</p>
                      <div className="pt-2 flex gap-1.5">
                        <button type="button" className="flex-1 py-1 rounded bg-[#0e8fad] text-[10px] font-bold text-white text-center">
                          + Parça Ekle
                        </button>
                        <button type="button" className="py-1 px-2.5 rounded bg-slate-700 text-[10px] font-bold text-slate-200">
                          QC Test
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-800/90 border border-slate-700 space-y-1.5 shadow-sm">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-950 px-1.5 py-0.5 rounded">SRV-039</span>
                        <span className="text-[9px] font-bold text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded">Hazır</span>
                      </div>
                      <p className="text-xs font-bold text-white">MacBook Air M2 — Klavye</p>
                      <p className="text-[10px] text-slate-400">Kalite kontrol onaylandı</p>
                    </div>
                  </div>
                )}

                {/* Screen Content: Parça */}
                {activeScreen === 'parca' && (
                  <div className="p-3.5 space-y-3 flex-1">
                    <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-center">
                      <QrCode size={36} className="mx-auto text-cyan-400 mb-2" />
                      <p className="text-xs font-bold text-white">Barkod / QR Tarayıcı</p>
                      <p className="text-[10px] text-slate-400">Kamera ile parça barkodunu okutun</p>
                    </div>

                    <div className="space-y-1.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Seçilen Parça:</p>
                      <div className="p-2.5 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-between text-xs">
                        <span className="font-semibold text-white">iPhone 14 Pro OLED</span>
                        <span className="text-cyan-400 font-bold">1 Adet</span>
                      </div>
                    </div>

                    <button type="button" className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs">
                      İş Emrine Sarf Et (Stoktan Düş)
                    </button>
                  </div>
                )}

                {/* Screen Content: Kamera */}
                {activeScreen === 'foto' && (
                  <div className="p-3.5 space-y-3 flex-1 text-center">
                    <div className="p-4 rounded-xl bg-slate-800 border border-slate-700">
                      <Camera size={32} className="mx-auto text-cyan-400 mb-2" />
                      <p className="text-xs font-bold text-white">Delil Fotoğrafı Çekimi</p>
                      <p className="text-[10px] text-slate-400 mt-1">Ön cam hasarı, seri numarası ve kasa çizikleri</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="h-16 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-400">
                        Foto 1 (Ön)
                      </div>
                      <div className="h-16 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-[10px] text-slate-400">
                        Foto 2 (Arka)
                      </div>
                    </div>
                  </div>
                )}

                {/* Bottom App Navigation Bar */}
                <div className="p-2.5 border-t border-slate-800 bg-slate-950 flex items-center justify-around text-slate-400 text-[10px]">
                  <span className="text-cyan-400 font-bold">İşler</span>
                  <span>Kabul</span>
                  <span>Stok</span>
                  <span>Kasa</span>
                </div>

              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
