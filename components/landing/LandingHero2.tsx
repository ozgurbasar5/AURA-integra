'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  Wrench,
  Wallet,
  Smartphone,
  Shield,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
} from 'lucide-react'

type HeroProps = {
  onOpenDemo?: () => void
}

const FEATURE_PILLS = [
  'Servis',
  'Stok',
  'Kasa & Finans',
  'Mobil',
  'Müşteri Portalı',
  'Yönetim',
]

const PREVIEW_TABS = [
  { id: 'kasa', label: 'Kasa & Finans 2.0', icon: Wallet },
  { id: 'atolye', label: 'Atölye & Servis', icon: Wrench },
  { id: 'mobil', label: 'Mobil Teknisyen', icon: Smartphone },
]

export function LandingHero2({ onOpenDemo }: HeroProps) {
  const [activeTab, setActiveTab] = useState<'kasa' | 'atolye' | 'mobil'>('kasa')

  return (
    <section className="relative pt-8 pb-16 md:pt-14 md:pb-24 overflow-hidden bg-gradient-to-b from-[#f4f7fb] via-[#eef4f9] to-[#f4f7fb]">
      {/* Background ambient lighting */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-15%,rgba(14,143,173,0.15),transparent)] pointer-events-none" />
      <div className="absolute top-1/4 right-0 w-[500px] h-[500px] bg-[#0e8fad]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-0 w-[400px] h-[400px] bg-[#2563eb]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Core Value Proposition */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="lg:col-span-6 text-center lg:text-left"
          >
            {/* Platform Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-50 border border-cyan-200/80 text-[#0c5f73] text-xs font-bold mb-6 shadow-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#0e8fad]" />
              </span>
              <span>AURA İNTEGRA 2.0 · Kurumsal Servis İşletim Platformu</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl lg:text-[3.25rem] font-black text-slate-900 leading-[1.12] tracking-tight mb-5">
              Servis işletmenizin tamamını{' '}
              <span className="bg-gradient-to-r from-[#0e8fad] via-[#0284c7] to-[#2563eb] bg-clip-text text-transparent">
                tek merkezden
              </span>{' '}
              yönetin.
            </h1>

            {/* Subtitle */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-8 max-w-2xl mx-auto lg:mx-0">
              Servis kabulünden atölyeye, stoktan kasaya, müşteriden mobil operasyona kadar tüm süreç AURA İntegra&apos;da birbirine bağlı çalışır.
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 mb-8">
              <button
                id="hero-demo-button"
                type="button"
                onClick={onOpenDemo}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-[#0e8fad] hover:bg-[#0c7a94] text-white font-black text-base shadow-lg shadow-[#0e8fad]/25 hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Demo Talep Et
                <ArrowRight size={18} />
              </button>

              <a
                href="#akis"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl border border-slate-300 bg-white/80 hover:bg-white text-slate-800 font-bold text-base hover:border-[#0e8fad] hover:text-[#0e8fad] shadow-xs transition-all"
              >
                <Eye size={18} />
                AURA&apos;yı Keşfet
              </a>
            </div>

            {/* Micro Feature Line (Checkmarks) */}
            <div className="pt-4 border-t border-slate-200/80">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                Entegre Çekirdek Modüller
              </p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-2">
                {FEATURE_PILLS.map((pill) => (
                  <span
                    key={pill}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 bg-white/70 border border-slate-200/90 px-2.5 py-1 rounded-lg shadow-2xs"
                  >
                    <CheckCircle2 size={13} className="text-[#0e8fad] shrink-0" />
                    {pill}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Right Column: Authentic Composite Visual Showcase */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.65, delay: 0.15 }}
            className="lg:col-span-6 relative"
          >
            {/* Ambient glow behind preview */}
            <div className="absolute -inset-4 bg-gradient-to-tr from-[#0e8fad]/15 via-cyan-500/10 to-[#2563eb]/15 rounded-3xl blur-2xl pointer-events-none" />

            {/* Floating Live Badge Top Right */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="absolute -top-3 right-4 sm:-right-2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 text-white border border-slate-700 text-[11px] font-bold shadow-lg backdrop-blur-md"
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>DEMO VERİSİ</span>
            </motion.div>

            {/* Outer Mockup Shell */}
            <div className="relative rounded-2xl border border-slate-300/80 bg-white shadow-2xl overflow-hidden">
              
              {/* Browser / Application Top Bar */}
              <div className="px-4 py-3 bg-slate-100/90 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span className="ml-2 font-mono text-[11px] font-semibold text-slate-500 hidden sm:inline">
                    integra.aurabilisim.net
                  </span>
                </div>

                {/* Tab Switcher */}
                <div className="flex items-center gap-1 bg-slate-200/80 p-0.5 rounded-lg">
                  {PREVIEW_TABS.map((tab) => {
                    const Icon = tab.icon
                    const isSelected = activeTab === tab.id
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id as typeof activeTab)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        <Icon size={12} className={isSelected ? 'text-[#0e8fad]' : 'text-slate-500'} />
                        <span className="hidden sm:inline">{tab.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Tab 1: Kasa & Finans 2.0 Screen */}
              {activeTab === 'kasa' && (
                <div className="p-5 sm:p-6 bg-slate-50/50 space-y-4 text-xs font-sans">
                  {/* Top Stats Bar */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nakit Kasası</p>
                      <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">₺ 14.850</p>
                      <span className="inline-block mt-1 text-[9px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Vardiya Aktif
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">POS / Kredi Kartı</p>
                      <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">₺ 28.400</p>
                      <span className="inline-block mt-1 text-[9px] font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">
                        12 İşlem Sync
                      </span>
                    </div>

                    <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Banka / Havale</p>
                      <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">₺ 9.600</p>
                      <span className="inline-block mt-1 text-[9px] font-bold text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                        Cari Eşleşti
                      </span>
                    </div>
                  </div>

                  {/* Transaction Ledger Table */}
                  <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs">
                    <div className="px-3.5 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-xs">Son Kasa & Finans Hareketleri</span>
                      <span className="text-[10px] text-slate-400 font-mono">Bugün · Otomatik Mutabakat</span>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {[
                        { time: '14:32', type: 'Servis Teslim', desc: 'iPhone 13 Ekran + Batarya (SRV-042)', method: 'Kredi Kartı', amount: '+ ₺3.450', color: 'text-emerald-600' },
                        { time: '13:48', type: 'Hızlı Satış', desc: 'Type-C Şarj Adaptörü 67W', method: 'Nakit', amount: '+ ₺650', color: 'text-emerald-600' },
                        { time: '12:15', type: 'Parça Tedarik', desc: 'Toptan Ekran Alımı (Fatura #882)', method: 'Havale', amount: '- ₺8.200', color: 'text-rose-600' },
                      ].map((item, idx) => (
                        <div key={idx} className="px-3.5 py-2.5 flex items-center justify-between gap-2 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="text-[10px] font-mono text-slate-400 shrink-0">{item.time}</span>
                            <div className="min-w-0">
                              <p className="font-bold text-slate-800 truncate">{item.desc}</p>
                              <p className="text-[10px] text-slate-400">{item.type} · {item.method}</p>
                            </div>
                          </div>
                          <span className={`font-black font-mono shrink-0 ${item.color}`}>
                            {item.amount}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Atölye & Servis Screen */}
              {activeTab === 'atolye' && (
                <div className="p-5 sm:p-6 bg-slate-50/50 space-y-4 text-xs font-sans">
                  {/* Kanban Columns Preview */}
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                        <span>Kabul / Teşhis (2)</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1.5">
                        <span className="text-[9px] font-mono font-bold text-sky-600 bg-sky-50 px-1.5 py-0.5 rounded">SRV-048</span>
                        <p className="font-bold text-slate-800">Samsung S23 Ultra</p>
                        <p className="text-[10px] text-slate-500">Sıvı teması · Ön inceleme</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-amber-600">
                        <span>Tamirde / Parça (3)</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border-2 border-amber-200 shadow-2xs space-y-1.5">
                        <span className="text-[9px] font-mono font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">SRV-042</span>
                        <p className="font-bold text-slate-800">MacBook Air M2</p>
                        <p className="text-[10px] text-slate-500">Orijinal Klavye Değişimi</p>
                        <div className="pt-1 flex items-center justify-between text-[9px] text-slate-400 font-semibold">
                          <span>Teknisyen: Ahmet K.</span>
                          <span className="text-amber-600 font-bold">%80</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-bold text-emerald-600">
                        <span>QC & Teslime Hazır (4)</span>
                      </div>
                      <div className="p-3 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-1.5">
                        <span className="text-[9px] font-mono font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">SRV-039</span>
                        <p className="font-bold text-slate-800">iPad Pro 11&quot;</p>
                        <p className="text-[10px] text-emerald-600 font-semibold">✓ Kalite Kontrol Geçti</p>
                      </div>
                    </div>
                  </div>

                  {/* Checklist Bar */}
                  <div className="p-3 rounded-xl bg-cyan-50/70 border border-cyan-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 size={16} className="text-[#0e8fad]" />
                      <span className="font-bold text-slate-800 text-[11px]">Canlı Durum: SMS & WhatsApp portal bağlantısı müşteriye iletildi.</span>
                    </div>
                    <span className="text-[10px] font-bold text-[#0e8fad]">Portal Canlı</span>
                  </div>
                </div>
              )}

              {/* Tab 3: Mobil Teknisyen Screen */}
              {activeTab === 'mobil' && (
                <div className="p-5 sm:p-6 bg-slate-50/50 space-y-4 text-xs font-sans">
                  <div className="max-w-md mx-auto rounded-2xl border-2 border-slate-300 bg-slate-900 text-white p-4 shadow-xl space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                      <div>
                        <p className="text-[10px] font-bold text-cyan-400">AURA MOBILE 2.0</p>
                        <p className="font-bold text-sm">Bugünkü Saha & Atölye İşleri</p>
                      </div>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                        Online Sync
                      </span>
                    </div>

                    <div className="space-y-2">
                      <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-100">iPhone 14 Pro — Ekran Değişimi</p>
                          <p className="text-[10px] text-slate-400">Müşteri: Mehmet Demir · Kadıköy Şube</p>
                        </div>
                        <span className="text-[10px] font-bold bg-[#0e8fad] text-white px-2.5 py-1 rounded-lg">
                          + Parça Ekle
                        </span>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-100">Dyson V15 — Motor Bakımı</p>
                          <p className="text-[10px] text-slate-400">Fotoğraf: 4 Delil Yüklendi</p>
                        </div>
                        <span className="text-[10px] font-bold bg-emerald-600 text-white px-2.5 py-1 rounded-lg">
                          Teslim Et
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Bottom Micro Status Line */}
              <div className="px-4 py-2.5 bg-slate-100 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-semibold">
                <div className="flex items-center gap-1.5">
                  <RefreshCw size={12} className="text-[#0e8fad]" />
                  <span>Tek veri tabanı · Tüm modüller canlı senkron</span>
                </div>
                <div className="flex items-center gap-3 font-mono text-[10px]">
                  <span>RLS: Aktif</span>
                  <span>Şube: 01-Merkez</span>
                </div>
              </div>
            </div>

            {/* Bottom floating micro card */}
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="mt-3 p-3 rounded-xl bg-white/95 border border-slate-200/90 shadow-md backdrop-blur-md flex items-center justify-between text-xs"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                  ✓
                </div>
                <div>
                  <p className="font-bold text-slate-900">Tek Olay → 5 Modül Güncellenir</p>
                  <p className="text-[10px] text-slate-500">Parça eklendiğinde stok düşer, kasa maliyeti hesaplanır, portal yenilenir.</p>
                </div>
              </div>
              <span className="hidden sm:inline-block text-[10px] font-bold text-[#0e8fad] bg-cyan-50 px-2 py-1 rounded">
                Sıfır Çift Kayıt
              </span>
            </motion.div>

          </motion.div>
        </div>
      </div>
    </section>
  )
}
