'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  ShieldCheck,
  Lock,
  Server,
  FileCheck,
  Key,
  CheckCircle2,
} from 'lucide-react'

const SECURITY_ITEMS = [
  {
    icon: Lock,
    title: 'Row-Level Security (RLS)',
    desc: 'Veritabanı seviyesinde her işletmenin verisi diğer bayilerden kesin ve deliksiz olarak izole edilir.',
  },
  {
    icon: Server,
    title: 'Tenant İzolasyonu',
    desc: 'Her bayi kendi şubelerini, personelini, müşterilerini ve finansal verilerini bağımsız yönetir.',
  },
  {
    icon: Key,
    title: 'Rol Tabanlı Yetkilendirme (RBAC)',
    desc: 'Teknisyen sadece kendi işlerini, kasiyer kasayı, yönetici ise tüm işletme raporlarını görebilir.',
  },
  {
    icon: FileCheck,
    title: 'Değiştirilemez Denetim İzi (Audit)',
    desc: 'Fiyat değişiklikleri, servis durumu iptalleri ve kasa hareketleri saniyesi saniyesine kayıt altına alınır.',
  },
]

export function LandingSecuritySection() {
  return (
    <section id="guvenlik" className="py-20 md:py-28 bg-[#f8fafc] border-b border-slate-200/80 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold uppercase tracking-wider mb-3">
            <ShieldCheck size={14} />
            <span>Kurumsal Güvenlik & Gizlilik</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">
            Her işletmenin verisi kendi alanında.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            AURA İntegra çok kiracılı (multi-tenant) bulut mimarisi, banka seviyesinde şifreleme ve KVKK uyumlu altyapısıyla işletmenizin ticari sırlarını ve müşteri verilerini en yüksek standartta korur.
          </p>
        </div>

        {/* 4 Security Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {SECURITY_ITEMS.map((item) => {
            const Icon = item.icon
            return (
              <div
                key={item.title}
                className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs hover:border-emerald-300 hover:shadow-md transition-all group flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <Icon size={20} />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
                <div className="pt-4 mt-4 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-bold text-emerald-600">
                  <CheckCircle2 size={13} />
                  <span>Doğrulanmış Güvenlik</span>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
