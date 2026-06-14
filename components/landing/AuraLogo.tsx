type AuraLogoProps = {
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'light' | 'dark'
  product?: 'integra' | 'bilisim'
  className?: string
}

const px = { sm: 44, md: 52, lg: 64 }

function AuraLogoIcon({ size }: { size: number }) {
  const id = `aura-${size}`
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className="w-full h-full"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={`${id}-core`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#06b6d4" />
          <stop offset="100%" stopColor="#2563eb" />
        </linearGradient>
      </defs>
      <path d="M50 12 L22 40 L22 52 L12 52 L12 35 L45 2 Z" fill="#ffffff" stroke="#0891b2" strokeWidth="1.2" />
      <path d="M50 88 L78 60 L78 48 L88 48 L88 65 L55 98 Z" fill="#ffffff" stroke="#0891b2" strokeWidth="1.2" />
      <circle cx="50" cy="50" r="22" stroke="#06b6d4" strokeWidth="1" strokeDasharray="3 2" opacity="0.6" />
      <rect x="36" y="36" width="28" height="28" rx="3" transform="rotate(45 50 50)" fill={`url(#${id}-core)`} />
      <rect x="24" y="42" width="8" height="1.5" rx="0.5" fill="#0891b2" />
      <rect x="24" y="46" width="5" height="1.5" rx="0.5" fill="#2563eb" />
      <rect x="68" y="56.5" width="8" height="1.5" rx="0.5" fill="#0891b2" />
      <rect x="71" y="52.5" width="5" height="1.5" rx="0.5" fill="#2563eb" />
      <circle cx="50" cy="50" r="2.5" fill="#fff" />
    </svg>
  )
}

/** AURA Bilişim kalkan imzası — aurabilisim.net ile uyumlu */
export function AuraLogo({
  showText = true,
  size = 'md',
  variant = 'dark',
  product = 'integra',
  className = '',
}: AuraLogoProps) {
  const dim = px[size]
  const isLight = variant === 'light'

  return (
    <div className={`flex items-center gap-3 min-w-0 ${className}`}>
      <div
        className={`relative shrink-0 rounded-xl overflow-hidden flex items-center justify-center p-1.5 ${
          isLight
            ? 'ring-2 ring-white/30 bg-white/15 shadow-lg'
            : 'ring-2 ring-cyan-400/40 bg-white shadow-md shadow-cyan-500/15'
        }`}
        style={{ width: dim, height: dim }}
      >
        <AuraLogoIcon size={dim - 10} />
      </div>
      {showText && (
        <div className="min-w-0 leading-none">
          <p
            className="text-lg font-black tracking-tight truncate"
            style={{ color: isLight ? '#ffffff' : '#0f172a' }}
          >
            AURA{' '}
            <span style={{ color: isLight ? '#67e8f9' : '#0891b2' }}>
              {product === 'integra' ? 'İNTEGRA' : 'BİLİŞİM'}
            </span>
          </p>
          <p
            className="text-[10px] font-bold uppercase tracking-[0.18em] truncate mt-1"
            style={{ color: isLight ? '#bae6fd' : '#64748b' }}
          >
            {product === 'integra' ? 'Entegrasyon Platformu' : 'Teknoloji Üssü'}
          </p>
        </div>
      )}
    </div>
  )
}
