'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  RefreshCw,
  Database,
  Smartphone,
  Layers,
  CheckCircle2,
  Zap,
  ArrowRight,
  Server,
  Globe,
  Wallet,
} from 'lucide-react'

const SYNC_CHAIN = [
  {
    step: 1,
    title: '1. Teknisyen Durumu Günceller',
    detail: 'Teknisyen mobilde "Tamir Tamamlandı & QC Geçti" butonuna basar.',
    icon: Smartphone,
    color: '#0e8fad',
  },
  {
    step: 2,
    title: '2. Veritabanı Eşzamanlı İşler',
    detail: 'Kullanılan yedek parça stoktan düşer, işçilik maliyeti iş emrine işlenir.',
    icon: Database,
    color: '#2563eb',
  },
  {
    step: 3,
    title: '3. Kasa & Muhasebe Hazırlanır',
    detail: 'Kasaya teslime hazır tahsilat kalemi ve fatura taslağı düşer.',
    icon: Wallet,
    color: '#059669',
  },
  {
    step: 4,
    title: '4. Müşteri Portalına Canlı Yansır',
    detail: 'Müşteriye SMS gider ve takip portalında "Cihazınız Teslime Hazır" durumu açılır.',
    icon: Globe,
    color: '#7c3aed',
  },
]

export function LandingRealtimeSection() {
  const [activeStep, setActiveStep] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveStep((s) => (s + 1) % SYNC_CHAIN.length)
    }, 3200)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="py-20 md:py-28 bg-white border-b border-slate-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-[#0c5f73] text-xs font-bold uppercase tracking-wider mb-3">
            <Zap size={14} />
            <span>Gerçek Zamanlı Reaktif Mimari</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">
            Bir işlem, sistemin tamamına yansır.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Tek bir eylem gerçekleştiğinde tüm birimler aynı saniyede güncellenir.
            Atölye, stok, kasa, müşteri ve yönetici her zaman aynı gerçeği görür.
          </p>
        </div>

        {/* Sync Chain Grid */}
        <div className="grid md:grid-cols-4 gap-4 mb-10">
          {SYNC_CHAIN.map((item, idx) => {
            const Icon = item.icon
            const isCurrent = idx === activeStep
            return (
              <div
                key={item.step}
                onClick={() => setActiveStep(idx)}
                className={`p-5 rounded-2xl border cursor-pointer transition-all duration-300 ${
                  isCurrent
                    ? 'bg-slate-900 text-white border-cyan-400 shadow-xl shadow-cyan-500/10 scale-[1.02]'
                    : 'bg-slate-50 text-slate-800 border-slate-200/80 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold ${
                      isCurrent ? 'bg-cyan-500/20 text-cyan-300' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    <Icon size={18} />
                  </div>
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      isCurrent ? 'bg-cyan-900 text-cyan-300' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    Adım 0{item.step}
                  </span>
                </div>
                <h3 className="text-sm font-black mb-1.5 leading-snug">{item.title}</h3>
                <p className={`text-xs leading-relaxed ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}>
                  {item.detail}
                </p>
              </div>
            )
          })}
        </div>

        {/* Value Callout Banner */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-cyan-50 via-sky-50 to-blue-50 border border-cyan-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-700">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-[#0e8fad] shrink-0" />
            <span>
              Manuel veri aktarımı, akşamları dosya kapatma veya Excel tablolarını birleştirme zahmetine son verin.
            </span>
          </div>
          <span className="shrink-0 px-3 py-1.5 rounded-lg bg-white border border-cyan-200 text-[#0c5f73] font-bold shadow-2xs">
            0 Sn Gecikme · Tam Senkronizasyon
          </span>
        </div>

      </div>
    </section>
  )
}
