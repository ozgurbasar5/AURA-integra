'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowRight, Building2 } from 'lucide-react'
import { AuraLogo } from '@/components/landing/AuraLogo'
import { AURA_CORPORATE } from '@/lib/brand-corporate'
import { LANDING_CATEGORIES_RESOLVED } from '@/lib/landing-modules'
import { ModuleIllustration } from '@/components/landing/illustrations/ModuleIllustrations'

type Props = {
  trialDays: number
  trust: { value: string; label: string }[]
}

const floatIcons = LANDING_CATEGORIES_RESOLVED.slice(0, 6).map((c, i) => ({
  icon: c.icon,
  angle: (i / 6) * Math.PI * 2,
  color: c.modules[0]?.color ?? '#0e8fad',
}))

export default function LandingHeroSection({ trialDays, trust }: Props) {
  return (
    <section className="relative pt-12 pb-20 md:pt-16 md:pb-28 landing-surface overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(14,143,173,0.12),transparent)] pointer-events-none" />
      <div className="absolute top-20 right-0 w-96 h-96 bg-[#0e8fad]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#2563eb]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-5 grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55 }}
        >
          <a
            href={AURA_CORPORATE.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-[#a5d8e8] bg-[#e8f6fa] text-[#0c5f73] text-xs font-semibold mb-6 hover:bg-[#d4f0f7] transition-colors"
          >
            <Building2 size={14} />
            {AURA_CORPORATE.name} · {AURA_CORPORATE.tagline}
            <ArrowRight size={12} />
          </a>

          <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-black leading-[1.08] tracking-tight mb-5">
            <span className="block text-[var(--landing-text)]">Bayi ve servis ağınız</span>
            <span className="block hero-gradient-text mt-1">tek platformda birleşsin</span>
          </h1>

          <p className="text-base sm:text-lg text-[var(--landing-muted)] leading-relaxed mb-8 max-w-lg">
            <strong className="text-[var(--landing-text)] font-semibold">AURA İntegra</strong> — atölye, stok, POS, finans, portal ve
            {' '}<span className="text-[var(--landing-accent)] font-semibold">{LANDING_CATEGORIES_RESOLVED.reduce((n, c) => n + c.modules.length, 0)}+ modül</span>
            {' '}bulutta senkron çalışır.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 mb-10">
            <Link
              href="/basvuru"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-[var(--landing-accent)] text-white font-bold hover:opacity-95 shadow-lg shadow-[#0e8fad]/25 transition-all hover:scale-[1.02]"
            >
              {trialDays} Gün Ücretsiz Dene <ArrowRight size={18} />
            </Link>
            <a
              href="#kesfet"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl border border-[var(--landing-border)] bg-[var(--landing-card)] text-[var(--landing-text)] font-semibold hover:border-[var(--landing-accent)] transition-colors"
            >
              Tüm Modülleri Keşfet
            </a>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {trust.map((t, i) => (
              <motion.div
                key={t.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + i * 0.06 }}
                className="landing-stat rounded-xl border px-4 py-3"
              >
                <p className="text-xl font-black text-[#0c5f73]">{t.value}</p>
                <p className="text-[11px] text-[var(--landing-muted)] font-semibold mt-0.5">{t.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Hero visual */}
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.65, delay: 0.15 }}
          className="relative"
        >
          <div className="absolute -inset-4 bg-gradient-to-br from-[#0e8fad]/20 via-transparent to-[#2563eb]/15 rounded-[2rem] blur-2xl" />

          {/* Orbiting icons */}
          <div className="absolute inset-0 hidden md:flex items-center justify-center pointer-events-none">
            {floatIcons.map(({ icon: Icon, angle, color }, i) => {
              const r = 155
              const x = Math.cos(angle) * r
              const y = Math.sin(angle) * r * 0.55
              return (
                <motion.div
                  key={i}
                  className="absolute w-10 h-10 rounded-xl bg-white border border-[var(--landing-border)] shadow-md flex items-center justify-center"
                  style={{ left: `calc(50% + ${x}px - 20px)`, top: `calc(50% + ${y}px - 20px)` }}
                  animate={{ y: [0, -6, 0], rotate: [0, 3, 0] }}
                  transition={{ duration: 3 + i * 0.4, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Icon size={18} style={{ color }} />
                </motion.div>
              )
            })}
          </div>

          <div className="landing-card relative overflow-hidden shadow-xl shadow-[#0e8fad]/10">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-[var(--landing-border)] bg-[#eef3f8]">
              <span className="w-2 h-2 rounded-full bg-red-400" />
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span className="ml-2 text-[10px] text-[var(--landing-muted)] font-mono">integra.aurabilisim.net</span>
              <motion.span
                className="ml-auto flex items-center gap-1 text-[9px] font-bold text-emerald-600"
                animate={{ opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Canlı
              </motion.span>
            </div>
            <ModuleIllustration type="finans" className="w-full h-auto" />
          </div>
        </motion.div>
      </div>
    </section>
  )
}
