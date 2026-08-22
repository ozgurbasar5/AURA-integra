'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { AuraLogo } from './AuraLogo'

type DemoSectionProps = {
  onOpenDemo?: () => void
}

export function LandingDemoSection({ onOpenDemo }: DemoSectionProps) {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-[#0c5f73] via-[#0e8fad] to-[#1e5f8a] text-white relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15),transparent)] pointer-events-none" />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        
        {/* Logo Mark */}
        <div className="flex justify-center mb-6">
          <AuraLogo size="lg" variant="light" product="integra" />
        </div>

        <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight mb-4">
          AURA İntegra&apos;yı kendi işletmenizde görün.
        </h2>

        <p className="text-base sm:text-lg text-cyan-100 leading-relaxed max-w-2xl mx-auto mb-8">
          Gerçek ürün ekranları üzerinden keşfedin. Uzman ekibimizle birlikte servis, stok ve finans süreçlerinizi tek platformda nasıl birleştirebileceğinizi inceleyin.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8">
          <button
            type="button"
            onClick={onOpenDemo}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-9 py-4 rounded-xl bg-white text-slate-900 font-black text-base shadow-xl hover:bg-slate-50 transition-all hover:scale-[1.03] active:scale-[0.98]"
          >
            Demo Talep Et
            <ArrowRight size={18} className="text-[#0e8fad]" />
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-semibold text-cyan-100">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-cyan-300" />
            15 Dakikalık Canlı Tanıtım
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-cyan-300" />
            Kendi Şubeleriniz İçin Yapılandırma
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 size={14} className="text-cyan-300" />
            Kredi Kartı veya Taahhüt Gerekmez
          </span>
        </div>

      </div>
    </section>
  )
}
