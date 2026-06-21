'use client'

import { motion } from 'framer-motion'

type Props = { className?: string; animate?: boolean }

const pulse = (delay = 0) => ({
  animate: { opacity: [0.4, 1, 0.4], scale: [1, 1.05, 1] },
  transition: { duration: 2.5, repeat: Infinity, delay },
})

export function AtolyeIllustration({ className = '', animate = true }: Props) {
  const M = animate ? motion : 'g' as unknown as typeof motion
  return (
    <svg viewBox="0 0 400 280" className={className} fill="none" aria-hidden>
      <rect width="400" height="280" rx="16" fill="#f0f9ff" />
      <rect x="16" y="16" width="120" height="248" rx="10" fill="#fff" stroke="#bae6fd" strokeWidth="1.5" />
      {[0, 1, 2, 3].map(i => (
        <rect key={i} x="28" y={32 + i * 56} width="96" height="44" rx="8" fill={i === 1 ? '#0e8fad' : '#e0f2fe'} opacity={i === 1 ? 1 : 0.7} />
      ))}
      <rect x="148" y="16" width="236" height="120" rx="10" fill="#fff" stroke="#bae6fd" strokeWidth="1.5" />
      <rect x="164" y="36" width="80" height="12" rx="4" fill="#cbd5e1" />
      <rect x="164" y="56" width="140" height="8" rx="3" fill="#e2e8f0" />
      <rect x="164" y="72" width="100" height="8" rx="3" fill="#e2e8f0" />
      <M.circle cx="340" cy="76" r="28" fill="#d4f0f7" {...(animate ? pulse(0) : {})} />
      <path d="M328 76 L336 84 L352 68" stroke="#0e8fad" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="148" y="148" width="112" height="116" rx="10" fill="#fff" stroke="#bae6fd" strokeWidth="1.5" />
      <rect x="160" y="160" width="88" height="60" rx="6" fill="#e0f2fe" />
      <circle cx="204" cy="190" r="18" fill="#0e8fad" opacity="0.3" />
      <rect x="272" y="148" width="112" height="116" rx="10" fill="#fff" stroke="#bae6fd" strokeWidth="1.5" />
      {[0, 1, 2].map(i => (
        <M.rect
          key={i}
          x={284 + i * 32}
          y={200}
          width="20"
          height={40 + i * 15}
          rx="4"
          fill="#0e8fad"
          opacity={0.5 + i * 0.15}
          {...(animate ? { initial: { height: 20 }, animate: { height: 40 + i * 15 }, transition: { duration: 1, delay: 0.3 + i * 0.15, repeat: Infinity, repeatType: 'reverse' as const } } : {})}
        />
      ))}
    </svg>
  )
}

export function StokIllustration({ className = '', animate = true }: Props) {
  const M = animate ? motion : 'g' as unknown as typeof motion
  return (
    <svg viewBox="0 0 400 280" className={className} fill="none" aria-hidden>
      <rect width="400" height="280" rx="16" fill="#fffbeb" />
      <rect x="24" y="24" width="352" height="48" rx="10" fill="#fff" stroke="#fde68a" strokeWidth="1.5" />
      <rect x="40" y="40" width="120" height="16" rx="4" fill="#fbbf24" opacity="0.4" />
      <M.rect x="280" y="36" width="80" height="24" rx="6" fill="#d97706" {...(animate ? pulse(0.2) : {})} />
      <g transform="translate(24, 88)">
        {[0, 1, 2].map(row => [0, 1, 2, 3].map(col => (
          <rect
            key={`${row}-${col}`}
            x={col * 88}
            y={row * 56}
            width="76"
            height="44"
            rx="8"
            fill="#fff"
            stroke="#fde68a"
            strokeWidth="1.5"
          />
        )))}
      </g>
      <M.path
        d="M320 240 L360 200 L380 220 L400 180"
        stroke="#d97706"
        strokeWidth="2.5"
        strokeLinecap="round"
        {...(animate ? { initial: { pathLength: 0 }, animate: { pathLength: 1 }, transition: { duration: 2, repeat: Infinity } } : {})}
      />
      <circle cx="48" cy="240" r="6" fill="#ef4444" />
      <text x="60" y="244" fill="#92400e" fontSize="11" fontWeight="600">Kritik: 3 ürün</text>
    </svg>
  )
}

export function FinansIllustration({ className = '', animate = true }: Props) {
  const M = animate ? motion : 'g' as unknown as typeof motion
  const bars = [55, 80, 45, 95, 70, 110, 85]
  return (
    <svg viewBox="0 0 400 280" className={className} fill="none" aria-hidden>
      <rect width="400" height="280" rx="16" fill="#ecfdf5" />
      <rect x="20" y="20" width="110" height="70" rx="10" fill="#fff" stroke="#a7f3d0" strokeWidth="1.5" />
      <text x="36" y="48" fill="#64748b" fontSize="10" fontWeight="600">KASA</text>
      <text x="36" y="72" fill="#059669" fontSize="22" fontWeight="800">₺42.8K</text>
      <rect x="145" y="20" width="110" height="70" rx="10" fill="#fff" stroke="#a7f3d0" strokeWidth="1.5" />
      <text x="161" y="48" fill="#64748b" fontSize="10" fontWeight="600">BUGÜN</text>
      <text x="161" y="72" fill="#0e8fad" fontSize="22" fontWeight="800">₺18.4K</text>
      <rect x="270" y="20" width="110" height="70" rx="10" fill="#fff" stroke="#a7f3d0" strokeWidth="1.5" />
      <text x="286" y="48" fill="#64748b" fontSize="10" fontWeight="600">KÂR</text>
      <text x="286" y="72" fill="#059669" fontSize="22" fontWeight="800">%32</text>
      <rect x="20" y="110" width="360" height="150" rx="10" fill="#fff" stroke="#a7f3d0" strokeWidth="1.5" />
      {bars.map((h, i) => (
        <M.rect
          key={i}
          x={40 + i * 46}
          y={240 - h}
          width="28"
          height={h}
          rx="4"
          fill="url(#finGrad)"
          {...(animate ? { initial: { height: 0, y: 240 }, animate: { height: h, y: 240 - h }, transition: { duration: 0.8, delay: i * 0.08, repeat: Infinity, repeatType: 'reverse' as const, repeatDelay: 2 } } : {})}
        />
      ))}
      <defs>
        <linearGradient id="finGrad" x1="0" y1="0" x2="0" y2="1">
          <stop stopColor="#0e8fad" />
          <stop offset="1" stopColor="#059669" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function PosIllustration({ className = '', animate = true }: Props) {
  const M = animate ? motion : 'g' as unknown as typeof motion
  return (
    <svg viewBox="0 0 400 280" className={className} fill="none" aria-hidden>
      <rect width="400" height="280" rx="16" fill="#eff6ff" />
      <rect x="40" y="30" width="320" height="220" rx="14" fill="#1e293b" />
      <rect x="56" y="46" width="288" height="140" rx="8" fill="#0f172a" />
      {[0, 1, 2].map(i => (
        <rect key={i} x={68 + i * 96} y="58" width="80" height="48" rx="6" fill="#334155" />
      ))}
      <M.rect x="68" y="120" width="256" height="56" rx="8" fill="#2563eb" {...(animate ? pulse(0) : {})} />
      <text x="120" y="154" fill="#fff" fontSize="18" fontWeight="800">₺ 2.499</text>
      <rect x="56" y="196" width="88" height="36" rx="8" fill="#059669" />
      <rect x="156" y="196" width="88" height="36" rx="8" fill="#0e8fad" />
      <rect x="256" y="196" width="88" height="36" rx="8" fill="#6366f1" />
      <M.g {...(animate ? { animate: { x: [0, 4, 0] }, transition: { duration: 1.5, repeat: Infinity } } : {})}>
        <rect x="300" y="8" width="72" height="24" rx="12" fill="#22c55e" />
        <text x="312" y="24" fill="#fff" fontSize="10" fontWeight="700">SATILDI</text>
      </M.g>
    </svg>
  )
}

export function PortalIllustration({ className = '', animate = true }: Props) {
  const M = animate ? motion : 'g' as unknown as typeof motion
  return (
    <svg viewBox="0 0 400 280" className={className} fill="none" aria-hidden>
      <rect width="400" height="280" rx="16" fill="#f5f3ff" />
      <rect x="120" y="20" width="160" height="240" rx="20" fill="#fff" stroke="#c4b5fd" strokeWidth="2" />
      <rect x="136" y="40" width="128" height="8" rx="4" fill="#e2e8f0" />
      <rect x="136" y="56" width="80" height="8" rx="4" fill="#e2e8f0" />
      {[0, 1, 2, 3].map(i => (
        <g key={i}>
          <circle cx="156" cy={100 + i * 44} r="10" fill={i <= 2 ? '#8b5cf6' : '#e2e8f0'} />
          <rect x="176" y={94 + i * 44} width="72" height="8" rx="3" fill="#cbd5e1" />
          <rect x="176" y={108 + i * 44} width="48" height="6" rx="2" fill="#e2e8f0" />
          {i < 3 && <line x1="156" y1={110 + i * 44} x2="156" y2={134 + i * 44} stroke="#c4b5fd" strokeWidth="2" />}
        </g>
      ))}
      <M.circle cx="200" cy={100 + 2 * 44} r="14" fill="none" stroke="#8b5cf6" strokeWidth="2" {...(animate ? pulse(0.5) : {})} />
      <rect x="136" y="220" width="128" height="28" rx="8" fill="#8b5cf6" />
      <text x="168" y="239" fill="#fff" fontSize="11" fontWeight="700">Takip Et</text>
    </svg>
  )
}

export function MagazaIllustration({ className = '', animate = true }: Props) {
  return (
    <svg viewBox="0 0 400 280" className={className} fill="none" aria-hidden>
      <rect width="400" height="280" rx="16" fill="#fdf2f8" />
      {[0, 1, 2].map(i => (
        <g key={i} transform={`translate(${24 + i * 128}, 40)`}>
          <rect width="112" height="200" rx="12" fill="#fff" stroke="#fbcfe8" strokeWidth="1.5" />
          <rect x="12" y="12" width="88" height="88" rx="8" fill="#fce7f3" />
          <rect x="12" y="108" width="60" height="8" rx="3" fill="#cbd5e1" />
          <rect x="12" y="124" width="40" height="8" rx="3" fill="#e2e8f0" />
          <text x="12" y="160" fill="#ec4899" fontSize="16" fontWeight="800">₺{(i + 1) * 8999}</text>
          {i === 1 && (
            <rect x="60" y="8" width="44" height="18" rx="9" fill="#f97316" />
          )}
        </g>
      ))}
    </svg>
  )
}

export function YonetimIllustration({ className = '', animate = true }: Props) {
  const M = animate ? motion : 'g' as unknown as typeof motion
  return (
    <svg viewBox="0 0 400 280" className={className} fill="none" aria-hidden>
      <rect width="400" height="280" rx="16" fill="#f8fafc" />
      <rect x="24" y="24" width="160" height="232" rx="12" fill="#fff" stroke="#cbd5e1" strokeWidth="1.5" />
      {[0, 1, 2, 3, 4].map(i => (
        <g key={i}>
          <circle cx="52" cy={52 + i * 42} r="14" fill="#e0f2fe" />
          <rect x="76" y={44 + i * 42} width="80" height="8" rx="3" fill="#cbd5e1" />
          <rect x="76" y={58 + i * 42} width="56" height="6" rx="2" fill="#e2e8f0" />
        </g>
      ))}
      <rect x="200" y="24" width="176" height="110" rx="12" fill="#fff" stroke="#cbd5e1" strokeWidth="1.5" />
      <text x="216" y="52" fill="#64748b" fontSize="10" fontWeight="600">ŞUBELER</text>
      <M.rect x="216" y="64" width="144" height="12" rx="4" fill="#0e8fad" opacity="0.8" {...(animate ? { animate: { width: [80, 144, 100] }, transition: { duration: 3, repeat: Infinity } } : {})} />
      <M.rect x="216" y="84" width="100" height="12" rx="4" fill="#6366f1" opacity="0.6" {...(animate ? { animate: { width: [60, 100, 80] }, transition: { duration: 3, repeat: Infinity, delay: 0.3 } } : {})} />
      <rect x="200" y="150" width="176" height="106" rx="12" fill="#fff" stroke="#cbd5e1" strokeWidth="1.5" />
      <text x="216" y="178" fill="#64748b" fontSize="10" fontWeight="600">GÖREVLER</text>
      {[0, 1, 2].map(i => (
        <rect key={i} x="216" y={188 + i * 22} width="144" height="14" rx="4" fill={i === 0 ? '#fef3c7' : '#f1f5f9'} stroke={i === 0 ? '#fbbf24' : '#e2e8f0'} />
      ))}
    </svg>
  )
}

export function AdminIllustration({ className = '', animate = true }: Props) {
  const M = animate ? motion : 'g' as unknown as typeof motion
  return (
    <svg viewBox="0 0 400 280" className={className} fill="none" aria-hidden>
      <rect width="400" height="280" rx="16" fill="#eff6ff" />
      <rect x="20" y="20" width="360" height="40" rx="8" fill="#1e40af" />
      <text x="36" y="46" fill="#fff" fontSize="13" fontWeight="700">Super Admin · Bayi Ağı</text>
      {[0, 1, 2].map(i => (
        <rect key={i} x={20 + i * 124} y="76" width="112" height="80" rx="10" fill="#fff" stroke="#bfdbfe" strokeWidth="1.5" />
      ))}
      <text x="36" y="100" fill="#64748b" fontSize="9">AKTİF BAYİ</text>
      <text x="36" y="128" fill="#1e40af" fontSize="24" fontWeight="800">34</text>
      <rect x="20" y="168" width="360" height="92" rx="10" fill="#fff" stroke="#bfdbfe" strokeWidth="1.5" />
      {[0, 1, 2, 3, 4].map(i => (
        <M.rect
          key={i}
          x={36 + i * 68}
          y="200"
          width="52"
          height={30 + (i % 3) * 12}
          rx="4"
          fill="#3b82f6"
          opacity={0.4 + (i % 3) * 0.15}
          {...(animate ? { animate: { height: [20, 30 + (i % 3) * 12, 24] }, transition: { duration: 2, delay: i * 0.1, repeat: Infinity, repeatType: 'reverse' as const } } : {})}
        />
      ))}
    </svg>
  )
}

const MAP = {
  atolye: AtolyeIllustration,
  stok: StokIllustration,
  finans: FinansIllustration,
  pos: PosIllustration,
  portal: PortalIllustration,
  magaza: MagazaIllustration,
  yonetim: YonetimIllustration,
  admin: AdminIllustration,
} as const

export function ModuleIllustration({ type, className, animate = true }: { type: keyof typeof MAP; className?: string; animate?: boolean }) {
  const Comp = MAP[type]
  return <Comp className={className} animate={animate} />
}
