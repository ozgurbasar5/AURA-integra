'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Wrench,
  Package,
  Wallet,
  Users,
  Globe,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Sparkles,
} from 'lucide-react'

const FLOW_NODES = [
  {
    id: 'servis',
    title: '1. Servis & Atölye',
    shortLabel: 'SERVİS',
    icon: Wrench,
    color: '#0e8fad',
    action: 'Cihaz kabul edildi, arıza teşhisi yapıldı, iş emri ve QR fiş basıldı.',
    triggers: 'Stoktan parça rezerve edilir · Tahmini bütçe müşteriye iletilir.',
    badge: 'Kabul & Atölye',
  },
  {
    id: 'stok',
    title: '2. Stok & Envanter',
    shortLabel: 'STOK',
    icon: Package,
    color: '#d97706',
    action: 'Kullanılan ekran ve batarya stok defterinden otomatik düşüldü.',
    triggers: 'Kritik stok kontrolü yapıldı · Parça maliyeti iş emrine işlendi.',
    badge: 'Otomatik Düşüm',
  },
  {
    id: 'kasa',
    title: '3. Kasa & Finans',
    shortLabel: 'KASA',
    icon: Wallet,
    color: '#059669',
    action: 'Tahsilat (Nakit/POS/Havale) kasaya işlendi ve vardiya güncellendi.',
    triggers: 'Net kârlılık hesaplandı · Gün sonu mutabakatına anında eklendi.',
    badge: 'Anlık Ledger',
  },
  {
    id: 'musteri',
    title: '4. Müşteri & CRM',
    shortLabel: 'MÜŞTERİ',
    icon: Users,
    color: '#7c3aed',
    action: 'Müşteri profiline cihaz geçmişi, garanti süresi ve fatura bağlandı.',
    triggers: 'Otomatik SMS ve WhatsApp durum bilgilendirmesi tetiklendi.',
    badge: 'CRM Geçmişi',
  },
  {
    id: 'portal',
    title: '5. Müşteri Portalı',
    shortLabel: 'PORTAL',
    icon: Globe,
    color: '#0284c7',
    action: 'Müşteri kendi slug bağlantısıyla cihaz durumunu canlı takip etti.',
    triggers: 'Ekspertiz teklifini dijital onayladı · Garanti belgesini indirdi.',
    badge: 'Canlı Takip',
  },
  {
    id: 'yonetim',
    title: '6. Yönetim & Admin',
    shortLabel: 'YÖNETİM',
    icon: ShieldAlert,
    color: '#1e40af',
    action: 'Tüm şubeler ve teknisyen performansları merkezi dashboarda yansıdı.',
    triggers: 'Audit log kaydedildi · Operasyonel KPI grafikleri anında yenilendi.',
    badge: 'Merkezi Komuta',
  },
]

export function LandingCoreFlow() {
  const [activeStep, setActiveStep] = useState(0)

  const activeNode = FLOW_NODES[activeStep]

  return (
    <section id="akis" className="py-20 md:py-28 bg-[#f8fafc] border-b border-slate-200/80 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles size={14} />
            <span>Kesintisiz Veri Akışı</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">
            İşletmenizin tüm operasyonu tek akışta.
          </h2>
          <p className="text-base text-slate-600 leading-relaxed">
            Tek bir işlemle servis, stok, kasa, müşteri, portal ve yönetim modülleri senkronize çalışır.
            Ayrı programlar, elle veri aktarımı veya Excel tablolarına gerek kalmaz.
          </p>
        </div>

        {/* Pipeline Navigation Bar */}
        <div className="relative mb-10 p-2 sm:p-3 rounded-2xl bg-white border border-slate-200 shadow-sm overflow-x-auto">
          <div className="flex items-center justify-between min-w-[620px] gap-2">
            {FLOW_NODES.map((node, idx) => {
              const Icon = node.icon
              const isActive = idx === activeStep
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => setActiveStep(idx)}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 rounded-xl font-bold text-xs transition-all ${
                    isActive
                      ? 'bg-slate-900 text-white shadow-md'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-cyan-400' : 'text-slate-400'} />
                  <span>{node.shortLabel}</span>
                  {idx < FLOW_NODES.length - 1 && (
                    <ArrowRight size={12} className="ml-auto text-slate-300 hidden md:inline" />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {/* Interactive Event Detail Box */}
        <div className="grid lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Active Step Showcase */}
          <div className="lg:col-span-7 rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between gap-4 mb-4">
                <span
                  className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider"
                  style={{ backgroundColor: `${activeNode.color}15`, color: activeNode.color }}
                >
                  {activeNode.badge}
                </span>
                <span className="text-xs font-mono font-bold text-slate-400">
                  Adım {activeStep + 1} / {FLOW_NODES.length}
                </span>
              </div>

              <h3 className="text-2xl font-black text-slate-900 mb-3">
                {activeNode.title}
              </h3>

              <div className="space-y-4 my-6">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 font-bold text-sm">
                    1
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Gerçekleşen Operasyon</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeNode.action}</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-cyan-50/60 border border-cyan-100 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-cyan-100 text-cyan-800 flex items-center justify-center shrink-0 font-bold text-sm">
                    2
                  </div>
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-cyan-800">Otomatik Tetiklenen Sistem Olayı</p>
                    <p className="text-sm font-semibold text-slate-800 mt-0.5">{activeNode.triggers}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                <RefreshCw size={13} className="text-[#0e8fad]" />
                Sıfır Çift Giriş Garantisi
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveStep((s) => (s > 0 ? s - 1 : FLOW_NODES.length - 1))}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Önceki
                </button>
                <button
                  type="button"
                  onClick={() => setActiveStep((s) => (s < FLOW_NODES.length - 1 ? s + 1 : 0))}
                  className="px-3 py-1.5 rounded-lg bg-[#0e8fad] text-white text-xs font-bold hover:bg-[#0c7a94]"
                >
                  Sonraki Adım
                </button>
              </div>
            </div>
          </div>

          {/* Flow Benefits Grid */}
          <div className="lg:col-span-5 grid grid-cols-1 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Tek Veri Modeli</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Cihaz, müşteri, parça ve finans tek bir kimlik üzerinden takip edilir. Veri tutarsızlığı yaşanmaz.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Otomatik Maliyetlendirme</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  İş emrine eklenen her parça stok alış fiyatıyla net kârlılığı otomatik hesaplar.
                </p>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs flex items-start gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <CheckCircle2 size={20} />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Müşteri Şeffaflığı</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Müşteri servis aşamalarını, fotoğraf ve fiyat onayını telefonundan anlık olarak görür.
                </p>
              </div>
            </div>
          </div>

        </div>

      </div>
    </section>
  )
}
