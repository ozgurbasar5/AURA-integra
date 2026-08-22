import React from 'react'

export type AuraLogoProps = {
  showText?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  variant?: 'light' | 'dark' | 'monochrome'
  product?: 'integra' | 'bilisim'
  mode?: 'horizontal' | 'compact' | 'icon-only' | 'mobile-mark'
  className?: string
}

const pxMap = {
  xs: 28,
  sm: 36,
  md: 48,
  lg: 60,
  xl: 72,
}

export function AuraLogoIcon({
  size = 48,
  variant = 'dark',
}: {
  size?: number
  variant?: 'light' | 'dark' | 'monochrome'
}) {
  const id = `aura-icon-${size}-${variant}`
  const isMono = variant === 'monochrome'
  const isLight = variant === 'light'

  const strokeColor = isMono ? (isLight ? '#ffffff' : '#0f172a') : '#0891b2'
  const fill1 = isMono ? (isLight ? '#ffffff' : '#0f172a') : '#0891b2'
  const fill2 = isMono ? (isLight ? '#ffffff' : '#0f172a') : '#2563eb'

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className="shrink-0 transition-transform duration-200"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-core`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isMono ? (isLight ? '#ffffff' : '#1e293b') : '#06b6d4'} />
          <stop offset="100%" stopColor={isMono ? (isLight ? '#cbd5e1' : '#0f172a') : '#2563eb'} />
        </linearGradient>
      </defs>
      {/* Outer shield structure */}
      <path
        d="M50 12 L22 40 L22 52 L12 52 L12 35 L45 2 Z"
        fill={isLight ? 'rgba(255,255,255,0.95)' : '#ffffff'}
        stroke={strokeColor}
        strokeWidth="1.5"
      />
      <path
        d="M50 88 L78 60 L78 48 L88 48 L88 65 L55 98 Z"
        fill={isLight ? 'rgba(255,255,255,0.95)' : '#ffffff'}
        stroke={strokeColor}
        strokeWidth="1.5"
      />
      <circle
        cx="50"
        cy="50"
        r="22"
        stroke={isMono ? strokeColor : '#06b6d4'}
        strokeWidth="1.2"
        strokeDasharray="3 2"
        opacity={0.65}
      />
      {/* Center diamond core */}
      <rect
        x="36"
        y="36"
        width="28"
        height="28"
        rx="4"
        transform="rotate(45 50 50)"
        fill={`url(#${id}-core)`}
      />
      {/* Micro accent bars */}
      <rect x="24" y="42" width="8" height="1.8" rx="0.6" fill={fill1} />
      <rect x="24" y="46" width="5" height="1.8" rx="0.6" fill={fill2} />
      <rect x="68" y="56.5" width="8" height="1.8" rx="0.6" fill={fill1} />
      <rect x="71" y="52.5" width="5" height="1.8" rx="0.6" fill={fill2} />
      {/* Center pinpoint spark */}
      <circle cx="50" cy="50" r="2.8" fill="#ffffff" />
    </svg>
  )
}

/**
 * AURA İntegra & AURA Bilişim Universal Logo System
 * Supports horizontal, compact, icon-only, and mobile-mark modes.
 */
export function AuraLogo({
  showText = true,
  size = 'md',
  variant = 'dark',
  product = 'integra',
  mode = 'horizontal',
  className = '',
}: AuraLogoProps) {
  const dim = pxMap[size] || 48
  const isLight = variant === 'light'
  const isMono = variant === 'monochrome'

  if (mode === 'icon-only') {
    return (
      <div className={`inline-flex items-center justify-center ${className}`}>
        <div
          className={`relative shrink-0 rounded-xl flex items-center justify-center p-1.5 transition-all ${
            isLight
              ? 'ring-1 ring-white/30 bg-white/10 shadow-sm'
              : 'ring-1 ring-cyan-500/30 bg-white shadow-sm shadow-cyan-500/10'
          }`}
          style={{ width: dim, height: dim }}
        >
          <AuraLogoIcon size={dim - 8} variant={variant} />
        </div>
      </div>
    )
  }

  if (mode === 'mobile-mark') {
    return (
      <div className={`inline-flex items-center gap-2 ${className}`}>
        <div
          className={`relative shrink-0 rounded-xl flex items-center justify-center p-1 ${
            isLight ? 'bg-white/15 ring-1 ring-white/30' : 'bg-white ring-1 ring-cyan-400/40 shadow-sm'
          }`}
          style={{ width: dim, height: dim }}
        >
          <AuraLogoIcon size={dim - 6} variant={variant} />
        </div>
        <span
          className="text-xs font-black tracking-wider uppercase font-mono"
          style={{ color: isLight ? '#ffffff' : '#0f172a' }}
        >
          AURA
        </span>
      </div>
    )
  }

  return (
    <div className={`inline-flex items-center gap-3 min-w-0 select-none ${className}`}>
      <div
        className={`relative shrink-0 rounded-xl flex items-center justify-center p-1.5 transition-all ${
          isLight
            ? 'ring-1 ring-white/30 bg-white/10 shadow-md shadow-black/10'
            : isMono
              ? 'ring-1 ring-slate-300 bg-white shadow-sm'
              : 'ring-1 ring-cyan-400/50 bg-white shadow-md shadow-cyan-500/15'
        }`}
        style={{ width: dim, height: dim }}
      >
        <AuraLogoIcon size={dim - 8} variant={variant} />
      </div>

      {showText && (
        <div className="min-w-0 leading-none">
          <div className="flex items-center gap-1.5">
            <span
              className={`font-black tracking-tight ${
                size === 'xs'
                  ? 'text-xs'
                  : size === 'sm'
                    ? 'text-sm'
                    : size === 'md'
                      ? 'text-lg'
                      : size === 'lg'
                        ? 'text-xl'
                        : 'text-2xl'
              }`}
              style={{
                color: isLight ? '#ffffff' : isMono ? '#0f172a' : '#0f172a',
              }}
            >
              AURA
            </span>
            <span
              className={`font-black tracking-tight ${
                size === 'xs'
                  ? 'text-xs'
                  : size === 'sm'
                    ? 'text-sm'
                    : size === 'md'
                      ? 'text-lg'
                      : size === 'lg'
                        ? 'text-xl'
                        : 'text-2xl'
              }`}
              style={{
                color: isLight
                  ? '#67e8f9'
                  : isMono
                    ? '#475569'
                    : '#0891b2',
              }}
            >
              {product === 'integra' ? 'İNTEGRA' : 'BİLİŞİM'}
            </span>
          </div>

          {mode !== 'compact' && (
            <p
              className={`font-bold uppercase tracking-[0.18em] truncate mt-1 ${
                size === 'xs' || size === 'sm'
                  ? 'text-[8px]'
                  : size === 'md'
                    ? 'text-[10px]'
                    : 'text-xs'
              }`}
              style={{
                color: isLight ? '#bae6fd' : '#64748b',
              }}
            >
              {product === 'integra' ? 'Servis & Operasyon Platformu' : 'Teknoloji Üssü'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
