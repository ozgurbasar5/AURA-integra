import Image from 'next/image'

interface LogoProps {
  className?: string
  showText?: boolean
  size?: 'sm' | 'md' | 'lg'
  variant?: 'light' | 'dark' | 'auto'
  shopName?: string
  shopLogo?: string | null
}

const sizes = { sm: 32, md: 40, lg: 48 }

/** AURA İntegra marka logosu — SVG + metin veya firma özelleştirmesi */
export default function Logo({
  className = '',
  showText = true,
  size = 'md',
  variant = 'auto',
  shopName,
  shopLogo,
}: LogoProps) {
  const px = sizes[size]
  const textLight = variant === 'light' || variant === 'auto'
  const textClass = textLight
    ? 'text-white'
    : 'text-[var(--text-primary)]'
  const displayName = shopName?.trim() || 'AURA İntegra'
  const isCustom = Boolean(shopName?.trim() || shopLogo)

  return (
    <div className={`flex items-center gap-2.5 min-w-0 ${className}`}>
      <div
        className="relative shrink-0 rounded-xl overflow-hidden shadow-lg shadow-sky-500/30 ring-1 ring-white/10"
        style={{ width: px, height: px }}
      >
        {shopLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shopLogo} alt="" className="w-full h-full object-contain bg-white p-0.5" />
        ) : (
          <Image
            src="/LOGOCAD.SVG"
            alt={displayName}
            width={px}
            height={px}
            className="object-contain bg-gradient-to-br from-sky-600 to-cyan-700 p-1"
            priority
          />
        )}
      </div>
      {showText && (
        <div className="min-w-0 leading-tight">
          <p className={`text-sm font-black tracking-tight truncate ${textClass}`}>
            {isCustom ? displayName : (
              <>AURA <span className="text-sky-400">İntegra</span></>
            )}
          </p>
          <p className="text-[9px] font-semibold text-sky-400/70 uppercase tracking-widest truncate">
            {isCustom ? 'Teknik Servis' : 'Servis Platformu'}
          </p>
        </div>
      )}
    </div>
  )
}
