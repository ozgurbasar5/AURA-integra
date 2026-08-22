'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  ShieldAlert,
  BarChart3,
  Users,
  Building2,
  Lock,
  Activity,
  AlertTriangle,
  CheckCircle2,
  FileText,
} from 'lucide-react'

const ADMIN_CAPABILITIES = [
  {
    icon: BarChart3,
    title: 'Canlı Operasyonel KPI',
    desc: 'Ciro, brüt kâr marjı, ortalama onarım süresi ve şube bazlı performans grafikleri.',
  },
  {
    icon: AlertTriangle,
    title: 'Akıllı Uyarı Sistemi',
    desc: 'Kritik stok seviyeleri, SLA süresi dolmak üzere olan işler ve kasa sapmaları.',
  },
  {
    icon: Users,
    title: 'Kullanıcı & Rol Yönetimi',
    desc: 'Personel yetkilendirmesi, teknisyen performans takibi ve prim hesaplama.',
  },
  {
    icon: Building2,
    title: 'Merkezi Çoklu Şube',
    desc: 'Tüm şubelerin envanterini, kasasını ve servis durumunu tek ekrandan denetleme.',
  },
  {
    icon: Lock,
    title: 'Değiştirilemez Audit Log',
    desc: 'Kim hangi kaydı ne zaman değiştirdi? Her kritik operasyon saniyesiyle loglanır.',
  },
  {
    icon: Activity,
    title: 'Sistem & API Sağlığı',
    desc: 'SMS sağlayıcısı, veritabanı gecikmesi ve yedekleme durumu canlı izlenir.',
  },
]

export function LandingAdminSection() {
  return (
    <section id="admin" className="py-20 md:py-28 bg-[#f8fafc] border-b border-slate-200/80 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldAlert size={14} />
            <span>Admin 2.0 Komuta Merkezi</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">
            İşletmenizin kontrol merkezi.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            <strong className="text-slate-900 font-semibold">Yönetici paneli yalnızca bir ayar ekranı değil;</strong> işletmenin ciro, stok, personel ve denetim nabzını tutan ana kontrol merkezidir.
          </p>
        </div>

        {/* 6 Capabilities Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {ADMIN_CAPABILITIES.map((cap) => {
            const Icon = cap.icon
            return (
              <div
                key={cap.title}
                className="p-5 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-indigo-300 hover:shadow-md transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <Icon size={20} />
                </div>
                <h3 className="text-base font-bold text-slate-900 mb-1.5">{cap.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{cap.desc}</p>
              </div>
            )
          })}
        </div>

        {/* Authentic Admin 2.0 Control Center UI Preview */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                Admin 2.0 Canlı İzleme
              </span>
              <h3 className="text-lg font-black text-slate-900 mt-1">
                Merkezi Yönetici Konsolu & Güvenlik Özeti
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                <CheckCircle2 size={13} /> Sistem Sağlığı: Mükemmel
              </span>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 my-6">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold uppercase text-slate-400">Aktif İş Emri</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">24 Cihaz</p>
              <p className="text-[10px] text-emerald-600 font-semibold mt-1">✓ 19 tanesi SLA süresi içinde</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold uppercase text-slate-400">Ortalama Tamir Süresi</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">3.8 Saat</p>
              <p className="text-[10px] text-sky-600 font-semibold mt-1">Hızlı parça temini ve QC akışı</p>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
              <p className="text-[10px] font-bold uppercase text-slate-400">Audit & Güvenlik Denetimi</p>
              <p className="text-2xl font-black text-slate-900 mt-0.5">%100 İzolasyon</p>
              <p className="text-[10px] text-purple-600 font-semibold mt-1">Row-Level Security aktif</p>
            </div>
          </div>

          {/* Mini Audit Log Preview */}
          <div className="rounded-xl border border-slate-200 overflow-hidden bg-slate-50/50">
            <div className="px-3.5 py-2 bg-slate-100 border-b border-slate-200 text-[11px] font-bold text-slate-700 flex items-center justify-between">
              <span>Son Denetim & İşlem Kayıtları (Audit Trail)</span>
              <span className="text-[10px] font-mono text-slate-400">Canlı Akış</span>
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="px-3.5 py-2 flex items-center justify-between gap-2">
                <span className="text-slate-800 font-semibold">Teknisyen Ahmet K. — SRV-042 için iPhone 14 Pro OLED ekran sarfiyatı yaptı.</span>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">14:32</span>
              </div>
              <div className="px-3.5 py-2 flex items-center justify-between gap-2">
                <span className="text-slate-800 font-semibold">Kasiyer Merve Y. — ₺ 3.450 Kredi Kartı tahsilatı kaydetti ve fiş yazdırdı.</span>
                <span className="text-[10px] font-mono text-slate-400 shrink-0">14:33</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
