"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ModeToggle } from "@/components/ModeToggle"; // <-- YENİ EKLENDİ
import { 
  Menu, X, Search, ShoppingBag, Wrench, Building2, 
  Home as HomeIcon, LifeBuoy, Info, Phone, HelpCircle, ChevronRight
} from "lucide-react";

export default function Navbar() {
  const [menuAcik, setMenuAcik] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  
  // Scroll takibi
  useEffect(() => {
    const handleScroll = () => {
        setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Yönetim Paneli Kontrolü
  if (pathname?.startsWith("/epanel")) return null;

  const isActive = (path: string) => pathname === path;

  // Link Listesi
  const navLinks = [
    { href: "/", label: "Ana Sayfa", icon: HomeIcon },
    { href: "/destek", label: "Destek", icon: LifeBuoy },
    { href: "/hakkimizda", label: "Hakkımızda", icon: Info },
    { href: "/sss", label: "S.S.S", icon: HelpCircle },
    { href: "/iletisim", label: "İletişim", icon: Phone }
  ];

  return (
    <nav 
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 border-b w-full ${
        scrolled 
          ? "bg-white/90 dark:bg-[#020617]/95 backdrop-blur-xl border-slate-200 dark:border-white/5 h-20 shadow-lg" 
          : "bg-white dark:bg-[#020617] border-transparent h-24"
      } print:hidden`}
    >
      <div className="container mx-auto px-6 h-full flex items-center justify-between relative">
        
        {/* LOGO */}
        <Link href="/" className="flex items-center gap-3.5 group select-none shrink-0 relative z-[102]" onClick={() => setMenuAcik(false)}>
          <div className="relative w-11 h-11 flex items-center justify-center">
              <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full opacity-60 group-hover:opacity-100 group-hover:bg-cyan-400/30 transition-all duration-500"></div>
              <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg relative z-10" fill="none" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="coreGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#22d3ee" /><stop offset="100%" stopColor="#3b82f6" /></linearGradient>
                  <radialGradient id="centerGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%"><stop offset="0%" stopColor="#ffffff" stopOpacity="1" /><stop offset="100%" stopColor="#22d3ee" stopOpacity="0" /></radialGradient>
                </defs>
                {/* Logo renklerini dinamik yaptık (Koyu modda beyaz, Açık modda koyu) */}
                <path d="M 50 12 L 22 40 L 22 52 L 12 52 L 12 35 L 45 2 Z" className="fill-slate-900 dark:fill-white opacity-95 group-hover:fill-cyan-500 transition-colors"/>
                <path d="M 50 88 L 78 60 L 78 48 L 88 48 L 88 65 L 55 98 Z" className="fill-slate-900 dark:fill-white opacity-95 group-hover:fill-cyan-500 transition-colors"/>
                <rect x="36" y="36" width="28" height="28" rx="3" transform="rotate(45 50 50)" fill="url(#coreGradient)" className="group-hover:scale-105 transition-transform duration-300 origin-center outline outline-1 outline-white/20"/>
                <circle cx="50" cy="50" r="5" fill="url(#centerGlow)" className="animate-pulse-slow" />
              </svg>
          </div>
          <div className="flex flex-col justify-center">
              <div className="font-extrabold text-[22px] tracking-tight leading-none text-slate-900 dark:text-white flex items-center gap-1 group-hover:text-cyan-600 dark:group-hover:text-cyan-50 transition-colors">AURA<span className="text-cyan-500 dark:text-cyan-400">BİLİŞİM</span></div>
              <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold tracking-[0.25em] uppercase group-hover:text-cyan-600 dark:group-hover:text-cyan-400/80 transition-colors">TEKNOLOJİ ÜSSÜ</span>
          </div>
        </Link>

        {/* DESKTOP MENÜ (Sadece XL ekranlarda) */}
        <div className="hidden xl:flex items-center gap-8">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href} className={`text-[14px] font-bold transition-all relative py-2 px-1 group ${isActive(link.href) ? "text-cyan-600 dark:text-cyan-400" : "text-slate-600 dark:text-slate-300 hover:text-black dark:hover:text-white"}`}>
                {link.label}
                <span className={`absolute bottom-0 left-0 h-0.5 bg-cyan-600 dark:bg-cyan-400 transition-all duration-300 ${isActive(link.href) ? "w-full" : "w-0 group-hover:w-full"}`}></span>
              </Link>
            ))}
        </div>

        {/* SAĞ TARAF BUTONLARI & MOBİL MENÜ TETİKLEYİCİ */}
        <div className="flex items-center gap-3 shrink-0 relative z-[102]">
            
            {/* --- TOGGLE BUTONU EKLENDİ --- */}
            <ModeToggle />
            {/* ----------------------------- */}

            {/* Masaüstü Butonları */}
            <Link href="/kurumsal-cozumler" className="hidden lg:flex items-center gap-2 bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 hover:from-white hover:to-amber-200 text-black px-5 py-2.5 rounded-xl font-black text-xs transition-all shadow-[0_0_20px_rgba(251,191,36,0.3)] hover:shadow-[0_0_30px_rgba(251,191,36,0.6)] hover:-translate-y-0.5 border border-yellow-300/50 group">
                <Building2 size={16} className="text-black/80 fill-black/10"/> 
                <span className="tracking-wide">KURUMSAL</span>
            </Link>

            <Link href="/cihaz-sorgula" className="hidden lg:flex items-center gap-2 border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-[#0f172a] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl font-bold text-xs transition-all group">
                <Search size={16} className="text-cyan-600 dark:text-cyan-400 group-hover:text-cyan-500 transition-colors"/> <span>CİHAZ SORGULA</span>
            </Link>
            
            <Link href="/magaza" className="hidden lg:flex items-center gap-2 border border-slate-200 dark:border-slate-700/50 bg-slate-100 dark:bg-[#0f172a] hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-5 py-2.5 rounded-xl font-bold text-xs transition-all group">
                <ShoppingBag size={16} className="text-purple-600 dark:text-purple-400 group-hover:text-purple-500 transition-colors"/> <span>MAĞAZA</span>
            </Link>
            
            <Link href="/onarim-talebi" className="hidden md:flex items-center gap-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg shadow-cyan-900/20 hover:-translate-y-0.5 active:scale-95 border border-white/10">
                <Wrench size={16} className="text-white fill-white/20"/> 
                <span>ONARIM BAŞLAT</span>
            </Link>
            
            {/* MOBİL MENÜ BUTONU */}
            <button 
              onClick={() => setMenuAcik(!menuAcik)} 
              className="xl:hidden p-2.5 text-slate-700 dark:text-white bg-slate-100 dark:bg-white/5 rounded-lg border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 active:scale-95 transition-all"
              aria-label="Menüyü Aç/Kapat"
            >
                {menuAcik ? <X size={26} className="text-red-500"/> : <Menu size={26}/>}
            </button>
        </div>
      </div>

      {/* --- MOBİL MENÜ (DROPDOWN TARZI) --- */}
      {menuAcik && (
        <div className="absolute top-full left-0 w-full bg-white dark:bg-[#020617] border-b border-slate-200 dark:border-white/10 shadow-2xl xl:hidden animate-in slide-in-from-top-5 z-40 max-h-[85vh] overflow-y-auto">
            <div className="container mx-auto px-6 py-6 flex flex-col gap-4">
              
              {/* Ana Linkler */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {navLinks.map((item) => (
                    <Link 
                      key={item.href} 
                      href={item.href} 
                      onClick={() => setMenuAcik(false)} 
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                        isActive(item.href) 
                          ? 'bg-cyan-50 dark:bg-cyan-500/10 border-cyan-200 dark:border-cyan-500/30 text-cyan-600 dark:text-cyan-400' 
                          : 'bg-slate-50 dark:bg-[#0f172a] border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                      }`}
                    >
                        <div className="flex items-center gap-4">
                            <item.icon size={20} className={isActive(item.href) ? "text-cyan-600 dark:text-cyan-400" : "text-slate-500 dark:text-slate-500"}/> 
                            <span className="font-bold text-sm">{item.label}</span>
                        </div>
                        <ChevronRight size={16} className="opacity-50"/>
                    </Link>
                  ))}
              </div>

              <div className="h-px w-full bg-slate-200 dark:bg-white/10 my-2"></div>

              {/* Alt Butonlar */}
              <div className="flex flex-col gap-3">
                  <Link href="/kurumsal-cozumler" onClick={() => setMenuAcik(false)} className="w-full flex items-center justify-between bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 text-black px-5 py-4 rounded-xl font-black text-sm shadow-[0_0_15px_rgba(251,191,36,0.3)]">
                      <span className="flex items-center gap-3"><Building2 size={18} className="text-black/80"/> KURUMSAL ÇÖZÜMLER</span>
                      <ChevronRight size={18} className="opacity-60"/>
                  </Link>

                  <div className="grid grid-cols-2 gap-3">
                      <Link href="/cihaz-sorgula" onClick={() => setMenuAcik(false)} className="flex flex-col items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-[#0f172a] text-slate-800 dark:text-white px-3 py-4 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                          <Search size={18} className="text-cyan-600 dark:text-cyan-400"/> CİHAZ SORGULA
                      </Link>
                      
                      <Link href="/magaza" onClick={() => setMenuAcik(false)} className="flex flex-col items-center justify-center gap-2 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-[#0f172a] text-slate-800 dark:text-white px-3 py-4 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors">
                          <ShoppingBag size={18} className="text-purple-600 dark:text-purple-400"/> MAĞAZA
                      </Link>
                  </div>

                  <Link href="/onarim-talebi" onClick={() => setMenuAcik(false)} className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-cyan-600 to-blue-600 text-white px-5 py-4 rounded-xl font-bold text-sm shadow-lg shadow-cyan-900/20">
                      <Wrench size={18}/> HEMEN ONARIM BAŞLAT
                  </Link>
              </div>
            </div>
        </div>
      )}
    </nav>
  );
}