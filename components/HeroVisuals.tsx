"use client";

import { useEffect, useState } from "react";
import { Activity, Zap, ShieldCheck, Wifi, Cpu, Database, Server } from "lucide-react";

export default function HeroVisuals() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="relative w-full h-[500px] md:h-[600px] flex flex-col items-center justify-center overflow-hidden bg-[#020617]">
      
      {/* 1. ARKA PLAN GRID & IŞIK */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:24px_24px]"></div>
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-gradient-to-b from-cyan-500/10 via-transparent to-[#020617] opacity-60"></div>

      {/* 2. MERKEZİ HUD ÇEMBERİ (Mobilde Odak Noktası) */}
      <div className="relative z-10 flex flex-col items-center justify-center mt-[-50px]">
        
        {/* Dönen Halkalar */}
        <div className="relative w-[280px] h-[280px] md:w-[400px] md:h-[400px] flex items-center justify-center">
            {/* Dış Halka */}
            <div className="absolute inset-0 border border-cyan-500/20 rounded-full animate-[spin_10s_linear_infinite]"></div>
            <div className="absolute inset-2 border border-blue-500/20 rounded-full animate-[spin_15s_linear_infinite_reverse] border-dashed"></div>
            <div className="absolute inset-12 border border-cyan-400/10 rounded-full animate-pulse"></div>
            
            {/* Merkez Logo/İkon */}
            <div className="absolute bg-cyan-500/10 w-32 h-32 rounded-full blur-2xl animate-pulse"></div>
            <Cpu size={64} className="text-cyan-400 drop-shadow-[0_0_15px_rgba(34,211,238,0.8)] relative z-20" strokeWidth={1} />
            
            {/* Tarama Efekti */}
            <div className="absolute w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent top-1/2 animate-scan-vertical opacity-50"></div>
        </div>

        {/* Başlık ve Durum */}
        <div className="text-center mt-8 space-y-2 relative z-20">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/50 border border-cyan-500/30 backdrop-blur-md">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
                <span className="text-[10px] font-bold text-cyan-400 tracking-widest uppercase">System Online</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter drop-shadow-2xl">
              AURA <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">OS</span>
            </h1>
            <p className="text-slate-400 text-xs md:text-sm font-mono tracking-[0.2em] uppercase">
              Next Gen Service Architecture
            </p>
        </div>

      </div>

      {/* 3. YAN VERİ PANELLERİ (Dekoratif) */}
      {/* Sol Panel */}
      <div className="absolute left-4 top-1/3 hidden md:flex flex-col gap-4 opacity-50">
         <TechRow label="CPU LOAD" value="12%" icon={Activity} />
         <TechRow label="MEMORY" value="4.2GB" icon={Database} />
         <TechRow label="LATENCY" value="14ms" icon={Wifi} />
      </div>

      {/* Sağ Panel */}
      <div className="absolute right-4 top-1/3 hidden md:flex flex-col gap-4 opacity-50 items-end">
         <TechRow label="SECURITY" value="SECURE" icon={ShieldCheck} align="right"/>
         <TechRow label="POWER" value="STABLE" icon={Zap} align="right"/>
         <TechRow label="UPTIME" value="99.9%" icon={Server} align="right"/>
      </div>

      {/* Mobil İçin Alt Dekorasyon */}
      <div className="absolute bottom-0 w-full h-24 bg-gradient-to-t from-[#020617] to-transparent z-20"></div>

    </div>
  );
}

function TechRow({ label, value, icon: Icon, align = "left" }: any) {
    return (
        <div className={`flex items-center gap-3 ${align === "right" ? "flex-row-reverse text-right" : "text-left"}`}>
            <Icon size={16} className="text-cyan-500/70" />
            <div>
                <div className="text-[8px] text-slate-500 font-bold tracking-wider">{label}</div>
                <div className="text-xs text-cyan-400 font-mono">{value}</div>
            </div>
        </div>
    )
}