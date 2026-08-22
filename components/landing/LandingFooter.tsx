'use client'

import React from 'react'
import Link from 'next/link'
import { AuraLogo } from './AuraLogo'
import { Globe, ArrowUpRight, ShieldCheck } from 'lucide-react'
import { AURA_CORPORATE } from '@/lib/brand-corporate'

export function LandingFooter() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="border-t border-slate-200/80 bg-[#f4f7fb] text-slate-600 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 lg:gap-12 mb-12">
          
          {/* Brand Col */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="inline-block">
              <AuraLogo size="md" variant="dark" product="integra" />
            </Link>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm">
              AURA İntegra — Teknik servis kabulünden atölyeye, stoktan kasaya, müşteriden mobil operasyona kadar tüm işletme süreçlerini tek merkezde birleştiren kurumsal servis platformu.
            </p>
            <div className="pt-2 flex items-center gap-3 text-slate-400">
              <a
                href={AURA_CORPORATE.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-slate-600 hover:text-[#0e8fad] font-semibold transition-colors"
              >
                <Globe size={14} />
                aurabilisim.net
                <ArrowUpRight size={12} />
              </a>
            </div>
          </div>

          {/* Ürün & Modüller */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-slate-900">Ürün & Modüller</p>
            <ul className="space-y-2">
              <li><a href="#servis" className="hover:text-[#0e8fad] transition-colors">Servis & Atölye</a></li>
              <li><a href="#finans" className="hover:text-[#0e8fad] transition-colors">Kasa & Finans 2.0</a></li>
              <li><a href="#mobil" className="hover:text-[#0e8fad] transition-colors">Mobil Teknisyen</a></li>
              <li><a href="#portal" className="hover:text-[#0e8fad] transition-colors">Müşteri Portalı</a></li>
              <li><a href="#admin" className="hover:text-[#0e8fad] transition-colors">Admin 2.0 Komuta</a></li>
            </ul>
          </div>

          {/* Çözümler & Kurumsal */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-slate-900">Kurumsal & Çözüm</p>
            <ul className="space-y-2">
              <li><a href="#nasil-calisir" className="hover:text-[#0e8fad] transition-colors">Nasıl Çalışır?</a></li>
              <li><a href="#paketler" className="hover:text-[#0e8fad] transition-colors">Lisans & Paketler</a></li>
              <li><a href="#kurumsal" className="hover:text-[#0e8fad] transition-colors">AURA Bilişim</a></li>
              <li><Link href="/basvuru" className="hover:text-[#0e8fad] transition-colors">Bayi Başvurusu</Link></li>
              <li><Link href="/login" className="hover:text-[#0e8fad] transition-colors">Giriş Yap</Link></li>
            </ul>
          </div>

          {/* Yasal & Güvenlik */}
          <div className="space-y-3">
            <p className="text-xs font-black uppercase tracking-wider text-slate-900">Yasal & Güvenlik</p>
            <ul className="space-y-2">
              <li><Link href="/gizlilik-politikasi" className="hover:text-[#0e8fad] transition-colors">Gizlilik Politikası</Link></li>
              <li><Link href="/kvkk" className="hover:text-[#0e8fad] transition-colors">KVKK Aydınlatma</Link></li>
              <li><Link href="/kullanim-sartlari" className="hover:text-[#0e8fad] transition-colors">Kullanım Şartları</Link></li>
              <li><a href="#guvenlik" className="hover:text-[#0e8fad] transition-colors">RLS & Veri Güvenliği</a></li>
            </ul>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-slate-500 text-[11px]">
            © {currentYear} {AURA_CORPORATE.name} Tic. Ltd. Şti. Tüm hakları saklıdır.
          </p>
          <div className="flex items-center gap-2 text-[11px] text-slate-400">
            <ShieldCheck size={14} className="text-emerald-600" />
            <span>Bulut Tabanlı Multi-Tenant Mimari</span>
          </div>
        </div>

      </div>
    </footer>
  )
}
