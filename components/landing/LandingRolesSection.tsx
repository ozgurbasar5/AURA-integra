'use client'

import React from 'react'
import { motion } from 'framer-motion'
import {
  Wrench,
  ShieldCheck,
  Wallet,
  Globe,
  UserCheck,
  CheckCircle2,
} from 'lucide-react'

const ROLES = [
  {
    role: 'Teknisyen',
    headline: 'Bugünkü işlerim',
    desc: 'Atanan cihazlar, arıza teşhis formları, tek tıkla parça ekleme, fotoğraf yükleme ve 12 noktalı kalite kontrol (QC).',
    icon: Wrench,
    color: '#0e8fad',
    items: ['Bugünkü iş listesi', 'Parça sarfiyatı', 'Fotoğraf arşivi', 'QC test onayı'],
  },
  {
    role: 'Yönetici / Patron',
    headline: 'İşletmenin tamamı',
    desc: 'Canlı ciro ve kârlılık grafikleri, tüm şubelerin anlık durumu, personel performans metrikleri ve denetim logları.',
    icon: ShieldCheck,
    color: '#1e40af',
    items: ['Ciro & kâr raporu', 'Şube denetimi', 'Personel primleri', 'Audit log kayıtları'],
  },
  {
    role: 'Kasiyer / Ön Muhasebe',
    headline: 'Kasa ve tahsilatlar',
    desc: 'Hızlı POS satışı, parçalı ödeme (nakit/kredi kartı/havale), vardiya açılış/kapanış Z raporu ve faturalandırma.',
    icon: Wallet,
    color: '#059669',
    items: ['Vardiya & Z raporu', 'Nakit/POS tahsilat', 'Cari hesap takibi', 'Hızlı satış & fatura'],
  },
  {
    role: 'Müşteri',
    headline: 'Servisim ve garantim',
    desc: 'Telefonundan canlı servis durumu, ekspertiz fotoğraf ve fiyat onayı, karekodlu garanti belgesi ve WhatsApp desteği.',
    icon: Globe,
    color: '#7c3aed',
    items: ['Canlı zaman çizelgesi', 'Fiyat & parça onayı', 'Garanti belgesi PDF', 'WhatsApp bildirim'],
  },
]

export function LandingRolesSection() {
  return (
    <section id="roller" className="py-20 md:py-28 bg-white border-b border-slate-200/80 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-[#0c5f73] text-xs font-bold uppercase tracking-wider mb-3">
            <UserCheck size={14} />
            <span>Kişiselleştirilmiş Rol Deneyimi</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">
            Herkes sadece kendi işine odaklanır.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            Karmaşık ve kalabalık menüler yerine; teknisyen, yönetici, kasiyer ve müşteri doğrudan kendisi için tasarlanmış özel ekranlarla çalışır.
          </p>
        </div>

        {/* 4 Role Perspective Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {ROLES.map((r) => {
            const Icon = r.icon
            return (
              <div
                key={r.role}
                className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-white hover:border-slate-300 hover:shadow-lg transition-all flex flex-col justify-between"
              >
                <div>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-2xs"
                    style={{ backgroundColor: `${r.color}15`, color: r.color }}
                  >
                    <Icon size={24} />
                  </div>

                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {r.role}
                  </span>
                  <h3 className="text-lg font-black text-slate-900 mt-1 mb-2">
                    &quot;{r.headline}&quot;
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-5">
                    {r.desc}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-200/60 space-y-2">
                  {r.items.map((item) => (
                    <div key={item} className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                      <CheckCircle2 size={13} style={{ color: r.color }} className="shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </section>
  )
}
