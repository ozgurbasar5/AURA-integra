'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Building2,
  Users,
  Wrench,
  Globe,
  BarChart3,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react'

const PROCESS_STEPS = [
  {
    step: '01',
    title: 'İşletmeni Tanımla',
    desc: 'Şirket bilgilerinizi, şubelerinizi ve servis kategorilerinizi sisteme girin.',
    icon: Building2,
  },
  {
    step: '02',
    title: 'Ekibini Oluştur',
    desc: 'Teknisyen, kasiyer ve şube yöneticisi hesaplarını yetki matrisiyle açın.',
    icon: Users,
  },
  {
    step: '03',
    title: 'Servis, Stok & Finansı Kullan',
    desc: 'Cihaz kabul edin, stoktan parçaları sarf edin ve kasa hareketlerini başlatın.',
    icon: Wrench,
  },
  {
    step: '04',
    title: 'Müşteriye Portalı Aç',
    desc: 'Özel slug bağlantınızı müşterilerle paylaşarak canlı takip imkânı sunun.',
    icon: Globe,
  },
  {
    step: '05',
    title: 'Tek Merkezden Yönet',
    desc: 'Admin panelinden tüm şubelerin cirosunu, kârlılığını ve performansını izleyin.',
    icon: BarChart3,
  },
]

export function LandingProcessSection() {
  return (
    <section id="nasil-calisir" className="py-20 md:py-28 bg-[#f8fafc] border-b border-slate-200/80 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0e8fad] mb-2">
            Kolay Kurulum & Başlangıç
          </p>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">
            5 Adımda AURA İntegra&apos;ya Geçiş
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Haftalarca süren karmaşık ERP kurulumları yerine dakikalar içinde bulut tabanlı altyapınızı canlıya alın.
          </p>
        </div>

        {/* 5 Steps Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {PROCESS_STEPS.map((s, idx) => {
            const Icon = s.icon
            return (
              <div
                key={s.step}
                className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-[#0e8fad]/40 hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-mono text-xl font-black text-[#0e8fad]">
                      {s.step}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-cyan-50 text-[#0e8fad] flex items-center justify-center">
                      <Icon size={16} />
                    </div>
                  </div>
                  <h3 className="text-sm font-black text-slate-900 mb-1.5">{s.title}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{s.desc}</p>
                </div>

                <div className="pt-3 mt-4 border-t border-slate-100 flex items-center gap-1 text-[10px] font-bold text-emerald-600">
                  <CheckCircle2 size={12} />
                  <span>Hazır Şablon</span>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
