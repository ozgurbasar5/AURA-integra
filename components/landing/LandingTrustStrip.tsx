'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Building2,
  Zap,
  Smartphone,
  ShieldCheck,
  Globe,
  UserCheck,
} from 'lucide-react'

const TRUST_CAPABILITIES = [
  {
    icon: Building2,
    title: 'Çoklu Şube & Bayi',
    desc: 'Merkezi franchise ve bağımsız lokasyon yönetimi',
    color: '#0e8fad',
  },
  {
    icon: Zap,
    title: 'Gerçek Zamanlı Senkron',
    desc: 'Tek işlemde servis, stok, kasa ve portal güncellemesi',
    color: '#2563eb',
  },
  {
    icon: Smartphone,
    title: 'Mobil Saha Operasyonu',
    desc: 'Masaya bağımsız teknisyen arayüzü ve parça ekleme',
    color: '#7c3aed',
  },
  {
    icon: ShieldCheck,
    title: 'RLS & Tenant İzolasyonu',
    desc: 'Her işletmenin verisi kendi şifreli alanında izole',
    color: '#059669',
  },
  {
    icon: Globe,
    title: 'Müşteri Takip Portalı',
    desc: '7/24 canlı cihaz durumu, ekspertiz onayı ve QR fiş',
    color: '#0284c7',
  },
  {
    icon: UserCheck,
    title: '5 Kademeli Rol Matrisi',
    desc: 'Teknisyen, Kasiyer, Satış, Yönetici ve Super Admin',
    color: '#ea580c',
  },
]

export function LandingTrustStrip() {
  return (
    <section className="py-12 border-y border-slate-200/80 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-[#0e8fad] mb-1">
            Kurumsal Standartlar
          </p>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900">
            Doğrulanabilir Çekirdek Altyapı Yetenekleri
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {TRUST_CAPABILITIES.map((cap, idx) => {
            const Icon = cap.icon
            return (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: idx * 0.05 }}
                className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-[#0e8fad]/40 hover:shadow-md transition-all group flex flex-col items-center text-center"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-110 shadow-2xs"
                  style={{ backgroundColor: `${cap.color}15`, color: cap.color }}
                >
                  <Icon size={20} />
                </div>
                <h3 className="text-xs font-black text-slate-900 mb-1 leading-snug">
                  {cap.title}
                </h3>
                <p className="text-[11px] text-slate-500 leading-tight">
                  {cap.desc}
                </p>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
