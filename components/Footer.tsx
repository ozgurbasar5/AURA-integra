"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  MapPin, Phone, Info, Instagram, Twitter, Facebook, ArrowRight,
  ShieldCheck, Lock, Briefcase 
} from "lucide-react";

export default function Footer() {
  const pathname = usePathname();

  // Panel veya Login sayfalarında Footer'ı gizle
  if (pathname?.startsWith("/epanel") || pathname?.startsWith("/business") || pathname === "/login" || pathname === "/kurumsal/login") {
    return null;
  }

  return (
    <footer className="bg-[#020617] border-t border-white/5 pt-20 pb-10 mt-20 relative z-10">
      
      {/* --- NEON EFEKTLERİ --- */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_20px_rgba(6,182,212,0.8)]"></div>
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-16">
            
            {/* 1. SÜTUN: LOGO & HAKKINDA */}
            <div className="col-span-1 md:col-span-1">
                <Link href="/" className="flex items-center gap-3.5 mb-6 group select-none">
                    <div className="relative w-11 h-11 flex items-center justify-center">
                        <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full opacity-60 group-hover:opacity-100 group-hover:bg-cyan-400/30 transition-all duration-500"></div>
                        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg relative z-10" fill="none">
                          <defs>
                            <linearGradient id="footerCoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                              <stop offset="0%" stopColor="#22d3ee" />
                              <stop offset="100%" stopColor="#3b82f6" />
                            </linearGradient>
                            <radialGradient id="footerCenterGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                              <stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                              <stop offset="100%" stopColor="#22d3ee" stopOpacity="0" />
                            </radialGradient>
                          </defs>
                          <path d="M 50 12 L 22 40 L 22 52 L 12 52 L 12 35 L 45 2 Z" fill="#fff" className="opacity-95 group-hover:fill-cyan-50 transition-colors"/>
                          <path d="M 50 88 L 78 60 L 78 48 L 88 48 L 88 65 L 55 98 Z" fill="#fff" className="opacity-95 group-hover:fill-cyan-50 transition-colors"/>
                          <rect x="36" y="36" width="28" height="28" rx="3" transform="rotate(45 50 50)" fill="url(#footerCoreGradient)" className="group-hover:scale-105 transition-transform duration-300 origin-center outline outline-1 outline-white/20"/>
                          <circle cx="50" cy="50" r="5" fill="url(#footerCenterGlow)" className="animate-pulse-slow"/>
                          <rect x="24" y="42" width="8" height="1.5" fill="url(#footerCoreGradient)" className="group-hover:opacity-100 opacity-80 transition-opacity"/>
                          <rect x="24" y="46" width="5" height="1.5" fill="url(#footerCoreGradient)" className="group-hover:opacity-100 opacity-80 transition-opacity"/>
                          <rect x="68" y="56.5" width="8" height="1.5" fill="url(#footerCoreGradient)" className="group-hover:opacity-100 opacity-80 transition-opacity"/>
                          <rect x="71" y="52.5" width="5" height="1.5" fill="url(#footerCoreGradient)" className="group-hover:opacity-100 opacity-80 transition-opacity"/>
                        </svg>
                    </div>
                    <div className="flex flex-col justify-center">
                        <div className="font-extrabold text-[22px] tracking-tight leading-none text-white flex items-center gap-1 group-hover:text-cyan-50 transition-colors">AURA<span className="text-cyan-400">BİLİŞİM</span></div>
                        <span className="text-[9px] text-slate-400 font-bold tracking-[0.25em] uppercase group-hover:text-cyan-400/80 transition-colors">TEKNOLOJİ ÜSSÜ</span>
                    </div>
                </Link>

                <p className="text-sm text-slate-500 leading-relaxed mb-6">Teknolojiniz için laboratuvar standartlarında onarım merkezi. <strong className="text-slate-300">Güvenilir, hızlı ve garantili</strong> çözümler üretiyoruz.</p>
                
                <div className="flex gap-4">
                    <a href="#" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:bg-cyan-600 hover:text-white transition-all"><Instagram size={18}/></a>
                    <a href="#" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:bg-cyan-600 hover:text-white transition-all"><Twitter size={18}/></a>
                    <a href="#" className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-slate-400 hover:bg-cyan-600 hover:text-white transition-all"><Facebook size={18}/></a>
                </div>
            </div>
            
            {/* 2. SÜTUN: KURUMSAL */}
            <div>
                <div className="flex items-center gap-2 mb-6 border-l-2 border-cyan-500 pl-3"><h4 className="font-bold text-white uppercase tracking-wider text-sm">KURUMSAL</h4></div>
                <ul className="space-y-4 text-sm text-slate-500">
                    <li><Link href="/hakkimizda" className="hover:text-cyan-400 transition-colors flex items-center gap-2"><ArrowRight size={12}/> Hikayemiz & Biyografi</Link></li>
                    <li><Link href="/dna" className="hover:text-cyan-400 transition-colors flex items-center gap-2"><ArrowRight size={12}/> Logo Anlamı (DNA)</Link></li>
                    <li><Link href="/cihaz-sorgula" className="hover:text-cyan-400 transition-colors flex items-center gap-2"><ArrowRight size={12}/> Cihaz Sorgula</Link></li>
                    <li><Link href="/iletisim" className="hover:text-cyan-400 transition-colors flex items-center gap-2"><ArrowRight size={12}/> İletişim & Ulaşım</Link></li>
                </ul>
            </div>

            {/* 3. SÜTUN: HİZMETLER */}
            <div>
                <div className="flex items-center gap-2 mb-6 border-l-2 border-purple-500 pl-3"><h4 className="font-bold text-white uppercase tracking-wider text-sm">Hizmetlerimiz</h4></div>
                <ul className="space-y-4 text-sm text-slate-500">
                    <li><Link href="/hizmetler/telefon" className="hover:text-purple-400 transition-colors flex items-center gap-2"><ArrowRight size={12}/> iPhone Onarım</Link></li>
                    <li><Link href="/hizmetler/robot" className="hover:text-purple-400 transition-colors flex items-center gap-2"><ArrowRight size={12}/> Robot Süpürge Bakım</Link></li>
                    <li><Link href="/hizmetler/bilgisayar" className="hover:text-purple-400 transition-colors flex items-center gap-2"><ArrowRight size={12}/> Gaming Laptop Servis</Link></li>
                    <li><Link href="/hizmetler/veri-kurtarma" className="hover:text-purple-400 transition-colors flex items-center gap-2"><ArrowRight size={12}/> Veri Kurtarma</Link></li>
                </ul>
            </div>

            {/* 4. SÜTUN: İLETİŞİM */}
            <div>
                <div className="flex items-center gap-2 mb-6 border-l-2 border-green-500 pl-3"><h4 className="font-bold text-white uppercase tracking-wider text-sm">İletişim</h4></div>
                <ul className="space-y-5 text-sm text-slate-500">
                    <li className="flex items-start gap-3"><div className="p-2 bg-slate-800 rounded-lg text-slate-300 shrink-0"><MapPin size={16}/></div><span>Beylikdüzü / İstanbul <br/> (Teknoloji Laboratuvarı)</span></li>
                    <li className="flex items-center gap-3"><div className="p-2 bg-slate-800 rounded-lg text-slate-300 shrink-0"><Phone size={16}/></div><span>0539 632 14 29</span></li>
                    <li className="flex items-center gap-3"><div className="p-2 bg-slate-800 rounded-lg text-slate-300 shrink-0"><Info size={16}/></div><span>destek@aurabilisim.com</span></li>
                </ul>
            </div>
        </div>

        {/* ALT BAR */}
        <div className="border-t border-white/5 pt-10 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-slate-600 font-medium">
            <p>&copy; {new Date().getFullYear()} Aura Bilişim Teknolojileri. Tüm hakları saklıdır.</p>
            <div className="flex flex-wrap justify-center gap-6 items-center">
                <Link href="/gizlilik-politikasi" className="hover:text-white transition-colors">Gizlilik Politikası</Link>
                <Link href="/kullanim-sartlari" className="hover:text-white transition-colors">Kullanım Şartları</Link>
                <Link href="/kvkk" className="flex items-center gap-1 hover:text-white transition-colors">
                    <ShieldCheck size={12}/> KVKK Aydınlatma Metni
                </Link>
                
                {/* Personel Girişi */}
                <Link href="/login" className="flex items-center gap-2 text-cyan-500 hover:text-cyan-400 bg-cyan-500/10 px-3 py-1.5 rounded-full transition-all hover:bg-cyan-500/20 ml-2">
                    <Lock size={12}/> Personel Girişi
                </Link>

                {/* YENİ EKLENEN BAYİ PORTAL */}
                <Link href="/kurumsal/login" className="flex items-center gap-2 text-orange-400 hover:text-orange-300 bg-orange-500/10 px-3 py-1.5 rounded-full transition-all hover:bg-orange-500/20">
                    <Briefcase size={12}/> Bayi Portal
                </Link>
            </div>
        </div>
      </div>
    </footer>
  );
}