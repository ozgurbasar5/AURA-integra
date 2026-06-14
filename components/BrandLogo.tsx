import React from "react";

interface LogoProps {
  className?: string; // Ekstra stil eklemek için
  variant?: "icon" | "full" | "watermark"; // Sadece ikon mu, yazılı mı, yoksa filigran mı?
}

export default function BrandLogo({ className = "", variant = "full" }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none group ${className}`}>
      
      {/* --- İKON KISMI (Değişmez İmza) --- */}
      <div className="relative w-10 h-10 shrink-0">
        {/* Arkadaki Glow (Sadece 'icon' ve 'full' modunda aktif) */}
        {variant !== "watermark" && (
            <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
        )}

        <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={variant === "watermark" ? "#fff" : "#22d3ee"} stopOpacity={variant === "watermark" ? "0.8" : "1"} />
                <stop offset="100%" stopColor={variant === "watermark" ? "#ccc" : "#3b82f6"} stopOpacity={variant === "watermark" ? "0.8" : "1"} />
              </linearGradient>
            </defs>

            {/* Dış Kalkanlar */}
            <path d="M 50 12 L 22 40 L 22 52 L 12 52 L 12 35 L 45 2 Z" fill={variant === "watermark" ? "#fff" : "#fff"} className={variant === "watermark" ? "opacity-50" : "opacity-95"}/>
            <path d="M 50 88 L 78 60 L 78 48 L 88 48 L 88 65 L 55 98 Z" fill={variant === "watermark" ? "#fff" : "#fff"} className={variant === "watermark" ? "opacity-50" : "opacity-95"}/>
            
            {/* Merkez Çekirdek */}
            <rect 
              x="36" y="36" width="28" height="28" rx="3" 
              transform="rotate(45 50 50)" 
              fill="url(#brandGradient)"
              className="group-hover:scale-105 transition-transform duration-300 origin-center"
            />
            
            {/* Devre Yolları */}
            <rect x="24" y="42" width="8" height="1.5" fill="url(#brandGradient)"/>
            <rect x="24" y="46" width="5" height="1.5" fill="url(#brandGradient)"/>
            <rect x="68" y="56.5" width="8" height="1.5" fill="url(#brandGradient)"/>
            <rect x="71" y="52.5" width="5" height="1.5" fill="url(#brandGradient)"/>
        </svg>
      </div>

      {/* --- YAZI KISMI (Tipografi İmzası) --- */}
      {variant === "full" && (
          <div className="flex flex-col justify-center">
            <div className="font-extrabold text-xl tracking-tight leading-none text-white flex items-center gap-1">
                AURA<span className="text-cyan-400">BİLİŞİM</span>
            </div>
            <span className="text-[9px] text-slate-400 font-bold tracking-[0.3em] uppercase group-hover:text-cyan-400/80 transition-colors">
                TEKNOLOJİ ÜSSÜ
            </span>
          </div>
      )}
    </div>
  );
}