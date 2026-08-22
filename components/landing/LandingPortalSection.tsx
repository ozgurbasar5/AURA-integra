'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Globe,
  CheckCircle2,
  FileCheck,
  ShieldCheck,
  MessageCircle,
  QrCode,
  ArrowRight,
  Download,
} from 'lucide-react'
import Link from 'next/link'

const PORTAL_FEATURES = [
  {
    icon: Globe,
    title: 'Özel Slug Bağlantısı',
    desc: 'integra.aurabilisim.net/portal/servisiniz adresiyle bayinize özel markalı deneyim.',
  },
  {
    icon: CheckCircle2,
    title: 'Dijital Teklif Onayı',
    desc: 'Müşteri değişecek parçayı ve fiyatı telefonundan inceleyip tek tıkla onaylar.',
  },
  {
    icon: ShieldCheck,
    title: 'Garanti Sertifikası & Belge',
    desc: 'Karekodlu garanti belgesini PDF olarak indirir, garanti süresini anlık sorgular.',
  },
  {
    icon: MessageCircle,
    title: 'Otomatik WhatsApp & SMS',
    desc: 'Cihaz kabulü, parça onayı ve teslime hazır bildirimleri anında müşteriye ulaşır.',
  },
]

export function LandingPortalSection() {
  return (
    <section id="portal" className="py-20 md:py-28 bg-white border-b border-slate-200/80 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-[#0c5f73] text-xs font-bold uppercase tracking-wider mb-3">
            <Globe size={14} />
            <span>Müşteri Takip & Onay Portalı</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">
            Müşteriniz de sürecin içinde.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Müşteri telefon başında sizi aramak yerine servisinin durumunu, yapılan işlemleri, fotoğraf ve garanti belgesini kendi ekranında canlı görebilir.
          </p>
        </div>

        {/* 2-Column Showcase */}
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          
          {/* Left: Interactive Portal Preview Card */}
          <div className="lg:col-span-6">
            <div className="rounded-3xl border border-slate-200 bg-slate-900 text-white p-6 sm:p-7 shadow-xl shadow-slate-900/10 space-y-5">
              
              {/* Header */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#0e8fad] text-white flex items-center justify-center font-black text-sm">
                    AT
                  </div>
                  <div>
                    <h3 className="font-bold text-sm text-white">Atlas Teknik Servis</h3>
                    <p className="text-[11px] text-cyan-400 font-mono">portal/atlas-teknik</p>
                  </div>
                </div>
                <span className="text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2.5 py-1 rounded-full">
                  Canlı Takip
                </span>
              </div>

              {/* Service Tracking ID */}
              <div className="p-4 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase font-bold text-slate-400">Servis Numarası</p>
                  <p className="text-sm font-mono font-black text-white">SRV-2026-0042</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Cihaz</p>
                  <p className="text-xs font-bold text-slate-200">iPhone 14 Pro 128GB</p>
                </div>
              </div>

              {/* Live Timeline */}
              <div className="space-y-3 pl-2">
                {[
                  { label: 'Cihaz Kabul Edildi', desc: '14.05.2026 10:30 · QR fiş oluşturuldu', done: true },
                  { label: 'Arıza Tespiti & Teklif', desc: 'Orijinal Ekran Değişimi — Müşteri Onayladı', done: true },
                  { label: 'Onarım & Kalite Kontrol (QC)', desc: '12 Nokta testleri tamamlandı', done: true },
                  { label: 'Cihaz Teslime Hazır', desc: 'Servisimizden teslim alabilirsiniz', active: true },
                ].map((step, idx) => (
                  <div key={idx} className="flex items-start gap-3 relative">
                    <div
                      className={`w-3.5 h-3.5 rounded-full mt-1 shrink-0 ${
                        step.done
                          ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
                          : step.active
                            ? 'bg-cyan-400 animate-ping'
                            : 'bg-slate-700'
                      }`}
                    />
                    <div>
                      <p className="text-xs font-bold text-white">{step.label}</p>
                      <p className="text-[11px] text-slate-400">{step.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Action Buttons inside Portal */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap gap-2.5">
                <button
                  type="button"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
                >
                  <MessageCircle size={14} />
                  WhatsApp Destek
                </button>
                <button
                  type="button"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-colors"
                >
                  <Download size={14} />
                  Garanti Belgesi PDF
                </button>
              </div>

            </div>
          </div>

          {/* Right: Feature Benefits List */}
          <div className="lg:col-span-6 space-y-4">
            {PORTAL_FEATURES.map((feat) => {
              const Icon = feat.icon
              return (
                <div
                  key={feat.title}
                  className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:border-[#0e8fad]/40 hover:shadow-md transition-all group"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#0e8fad]/10 text-[#0e8fad] flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                      <Icon size={20} />
                    </div>
                    <div>
                      <h4 className="text-base font-bold text-slate-900">{feat.title}</h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="pt-2">
              <Link
                href="/portal/aura-demo"
                className="inline-flex items-center gap-2 text-sm font-bold text-[#0e8fad] hover:text-[#0c7a94] hover:underline"
              >
                Canlı Demo Portalını İncele: /portal/aura-demo
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
