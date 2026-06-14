"use client";
import { useState, useRef, useEffect } from "react";
import { MoveHorizontal } from "lucide-react";

interface BeforeAfterProps {
  beforeImage: string;
  afterImage: string;
}

export default function BeforeAfter({ beforeImage, afterImage }: BeforeAfterProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = () => setIsResizing(true);
  const handleMouseUp = () => setIsResizing(false);

  const handleMouseMove = (e: any) => {
    if (!isResizing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    setSliderPosition(Math.min(100, Math.max(0, x)));
  };

  // Dokunmatik ekran desteği
  const handleTouchMove = (e: any) => {
     if (!isResizing || !containerRef.current) return;
     const rect = containerRef.current.getBoundingClientRect();
     const x = ((e.touches[0].clientX - rect.left) / rect.width) * 100;
     setSliderPosition(Math.min(100, Math.max(0, x)));
  }

  useEffect(() => {
    window.addEventListener("mouseup", handleMouseUp);
    return () => window.removeEventListener("mouseup", handleMouseUp);
  }, []);

  return (
    <div className="w-full max-w-2xl mx-auto my-8">
        <h3 className="text-center text-slate-400 text-xs font-bold uppercase tracking-widest mb-4">Onarım Mucizesi: Öncesi ve Sonrası</h3>
        
        <div 
            ref={containerRef}
            className="relative w-full aspect-video rounded-2xl overflow-hidden cursor-ew-resize border border-slate-700 shadow-2xl select-none"
            onMouseMove={handleMouseMove}
            onTouchMove={handleTouchMove}
            onMouseDown={handleMouseDown}
            onTouchStart={handleMouseDown}
        >
            {/* SONRAKİ FOTO (ALTTA) */}
            <img 
                src={afterImage} 
                className="absolute inset-0 w-full h-full object-cover pointer-events-none" 
                alt="After" 
            />
             <div className="absolute top-4 right-4 bg-green-600/80 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm z-0">SONRASI</div>

            {/* ÖNCEKİ FOTO (ÜSTTE - MASKELİ) */}
            <div 
                className="absolute inset-0 w-full h-full overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
            >
                <img 
                    src={beforeImage} 
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none" 
                    alt="Before" 
                />
                <div className="absolute top-4 left-4 bg-red-600/80 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">ÖNCESİ</div>
            </div>

            {/* SLIDER ÇUBUĞU */}
            <div 
                className="absolute top-0 bottom-0 w-1 bg-white cursor-ew-resize z-10 shadow-[0_0_20px_rgba(0,0,0,0.5)] flex items-center justify-center"
                style={{ left: `${sliderPosition}%` }}
            >
                <div className="w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center text-slate-900">
                    <MoveHorizontal size={16} />
                </div>
            </div>
        </div>
    </div>
  );
}