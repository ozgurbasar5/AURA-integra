'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Wallet,
  CreditCard,
  Building,
  ArrowLeftRight,
  FileSpreadsheet,
  CheckCircle2,
  Lock,
  TrendingUp,
} from 'lucide-react'

const FINANCE_PILLARS = [
  {
    icon: Wallet,
    title: 'Nakit Kasa & Vardiya',
    desc: 'Vardiya açılış/kapanış sayımı, Z raporu ve nakit akışının anlık mutabakatı.',
  },
  {
    icon: CreditCard,
    title: 'POS & Çoklu Ödeme',
    desc: 'Tek fişte nakit + kredi kartı bölüşümü, komisyon kesintisi ve banka hesap eşleşmesi.',
  },
  {
    icon: Building,
    title: 'Banka & Havale/EFT',
    desc: 'Cari hesap ödemeleri, tedarikçi transferleri ve banka hesap hareketleri takibi.',
  },
  {
    icon: ArrowLeftRight,
    title: 'Şubeler Arası Transfer',
    desc: 'Merkez ve şubeler arası güvenli kasa ve para transferi onay mekanizması.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Finansal Defter (Ledger)',
    desc: 'Değiştirilemez muhasebe defter kayıtları, kategori bazlı gelir-gider dökümü.',
  },
  {
    icon: TrendingUp,
    title: 'Otomatik Kârlılık Hesabı',
    desc: 'Servis ve satış bazlı parça maliyeti, işçilik ve net brüt marj raporlaması.',
  },
]

export function LandingFinanceSection() {
  return (
    <section id="finans" className="py-20 md:py-28 bg-[#f8fafc] border-b border-slate-200/80 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="grid lg:grid-cols-12 gap-8 items-end mb-14">
          <div className="lg:col-span-8">
            <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3">
              <Wallet size={14} />
              <span>Kasa & Finans 2.0</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">
              Kasanızı vardiyaya değil, gerçek finans hareketlerine bağlayın.
            </h2>
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
              Nakit, POS ve banka hareketlerini tek finansal görünümde yönetin. AURA&apos;nın akıllı defter sistemi sayesinde açık veya fazla veren kasalar tarihe karışır.
            </p>
          </div>
          <div className="lg:col-span-4 flex lg:justify-end">
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs text-xs space-y-1">
              <div className="flex items-center gap-2 font-bold text-slate-800">
                <Lock size={14} className="text-emerald-600" />
                <span>Çift Yönlü Defter Doğrulaması</span>
              </div>
              <p className="text-slate-500 text-[11px]">
                Her gelir ve gider hareketi ilgili iş emri veya satış faturasına zorunlu bağlıdır.
              </p>
            </div>
          </div>
        </div>

        {/* 6 Financial Pillars Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {FINANCE_PILLARS.map((pillar) => {
            const Icon = pillar.icon
            return (
              <div
                key={pillar.title}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Icon size={20} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">{pillar.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{pillar.desc}</p>
              </div>
            )
          })}
        </div>

        {/* Authentic Kasa 2.0 Ledger & Multi-Payment Showcase */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                Canlı Kasa 2.0 Modülü
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                Günlük Kasa Mutabakat & Vardiya Raporu
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="text-slate-500">Vardiya No: #2026-VRD-08</span>
              <span className="px-2.5 py-1 rounded bg-emerald-600 text-white font-bold">Vardiya Açık</span>
            </div>
          </div>

          <div className="grid sm:grid-cols-4 gap-4 my-6">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Devreden Nakit</p>
              <p className="text-lg font-black text-slate-900">₺ 2.500</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Bugün Nakit Girişi</p>
              <p className="text-lg font-black text-emerald-600">+ ₺ 12.350</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Bugün POS / Kredi Kartı</p>
              <p className="text-lg font-black text-sky-600">+ ₺ 28.400</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Güncel Kasa Toplamı</p>
              <p className="text-lg font-black text-slate-900">₺ 43.250</p>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900 font-semibold">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600" />
              <span>Gün sonu raporunda tüm nakit, POS ve havale tutarları banka dökümleriyle %100 örtüşür.</span>
            </div>
            <span className="font-mono text-[11px] text-emerald-700">Fark: ₺ 0.00 (Tam Eşleşme)</span>
          </div>
        </div>

      </div>
    </section>
  )
}
