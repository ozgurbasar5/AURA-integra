'use client'

import { useMemo } from 'react'

interface SlaBarProps {
  startDate: string
  standardDays: number
  legalMaxDays: number
  warningPercent?: number
  className?: string
  showLabels?: boolean
}

export default function SlaBar({
  startDate,
  standardDays,
  legalMaxDays,
  warningPercent = 80,
  className = '',
  showLabels = true
}: SlaBarProps) {
  
  const { 
    elapsedDays, 
    standardPercent,
    legalPercent,
    isStandardBreached, 
    isLegalBreached, 
    isWarning 
  } = useMemo(() => {
    const start = new Date(startDate).getTime()
    const now = Date.now()
    const diff = (now - start) / (1000 * 60 * 60 * 24)
    const elapsedDays = Math.max(0, Math.floor(diff))
    
    const standardPercent = Math.min(100, (elapsedDays / standardDays) * 100)
    const legalPercent = Math.min(100, (elapsedDays / legalMaxDays) * 100)
    
    const isStandardBreached = elapsedDays >= standardDays
    const isLegalBreached = elapsedDays >= legalMaxDays
    const isWarning = !isStandardBreached && standardPercent >= warningPercent

    return { elapsedDays, standardPercent, legalPercent, isStandardBreached, isLegalBreached, isWarning }
  }, [startDate, standardDays, legalMaxDays, warningPercent])

  // Renk hesaplama
  let barColor = 'bg-emerald-500'
  if (isLegalBreached) barColor = 'bg-red-600'
  else if (isStandardBreached) barColor = 'bg-rose-500'
  else if (isWarning) barColor = 'bg-amber-500'

  return (
    <div className={`w-full ${className}`}>
      {showLabels && (
        <div className="flex justify-between text-[10px] font-semibold mb-1">
          <span className="text-slate-500">Geçen: {elapsedDays} Gün</span>
          <span className={isLegalBreached ? 'text-red-600' : 'text-slate-500'}>
            Yasal Limit: {legalMaxDays} Gün
          </span>
        </div>
      )}
      
      <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className={`absolute top-0 left-0 h-full rounded-full transition-all duration-1000 ${barColor}`}
          style={{ width: `${legalPercent}%` }}
        />
        {/* Hedef sürenin işaretçisi */}
        <div 
          className="absolute top-0 bottom-0 w-0.5 bg-slate-900/20 z-10" 
          style={{ left: `${(standardDays / legalMaxDays) * 100}%` }}
          title={`Hedef Süre: ${standardDays} Gün`}
        />
      </div>
      
      {showLabels && isStandardBreached && !isLegalBreached && (
        <p className="text-[10px] text-amber-600 font-medium mt-1 text-right">
          Hedef süre aşıldı!
        </p>
      )}
      {showLabels && isLegalBreached && (
        <p className="text-[10px] text-red-600 font-bold mt-1 text-right">
          Yasal süre İHLALİ!
        </p>
      )}
    </div>
  )
}
