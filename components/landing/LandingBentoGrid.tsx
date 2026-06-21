'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowUpRight } from 'lucide-react'
import { LANDING_CATEGORIES_RESOLVED, LANDING_EXTRAS } from '@/lib/landing-modules'
import { LANDING_EXTRA_ROUTES } from '@/lib/landing-panel-routes'

const container = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
}

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
}

export default function LandingBentoGrid() {
  const allModules = LANDING_CATEGORIES_RESOLVED.flatMap(c =>
    c.modules.map(m => ({ ...m, categoryLabel: c.label })),
  )

  return (
    <section id="moduller" className="py-20 md:py-24 landing-surface border-t border-[var(--landing-border)] scroll-mt-20">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-12">
          <p className="text-[var(--landing-accent)] text-xs font-bold uppercase tracking-[0.2em] mb-2">Tam Özellik Seti</p>
          <h2 className="text-3xl md:text-4xl font-black text-[var(--landing-text)] mb-3">
            {allModules.length} modül, tek entegrasyon
          </h2>
          <p className="text-[var(--landing-muted)] max-w-xl mx-auto text-sm">
            Stok hareketi finansı günceller, servis parçayı düşer, portal müşteriyi bilgilendirir —{' '}
            <strong className="text-[var(--landing-text)]">tümü panelde mevcut</strong>.
          </p>
        </div>

        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-60px' }}
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4"
        >
          {allModules.map(m => {
            const Icon = m.icon
            return (
              <motion.article
                key={m.id}
                variants={item}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
                className="landing-card p-4 md:p-5 group cursor-default relative overflow-hidden"
              >
                <div
                  className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-[0.07] group-hover:opacity-[0.12] transition-opacity"
                  style={{ backgroundColor: m.color }}
                />
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: `${m.color}18` }}
                >
                  <Icon size={20} style={{ color: m.color }} />
                </div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--landing-muted)] mb-1">{m.categoryLabel}</p>
                <h3 className="text-sm font-bold text-[var(--landing-text)] mb-1.5 leading-snug">{m.title}</h3>
                <p className="text-[11px] text-[var(--landing-muted)] leading-relaxed line-clamp-2 hidden sm:block">{m.desc}</p>
                <div className="flex flex-wrap gap-1 mt-2 items-center justify-between">
                  <div className="flex flex-wrap gap-1">
                    {m.tags.slice(0, 2).map(tag => (
                      <span key={tag} className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-[var(--landing-accent-soft)] text-[#0c5f73]">
                        {tag}
                      </span>
                    ))}
                  </div>
                  {m.panelHref && !m.platformOnly && (
                    <span className="text-[9px] font-bold text-emerald-600 flex items-center gap-0.5">
                      Panelde <ArrowUpRight size={10} />
                    </span>
                  )}
                  {m.platformOnly && (
                    <span className="text-[9px] font-bold text-[var(--landing-muted)]">Platform admin</span>
                  )}
                </div>
              </motion.article>
            )
          })}
        </motion.div>

        {/* Extras strip */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="mt-10 grid sm:grid-cols-2 lg:grid-cols-4 gap-3"
        >
          {LANDING_EXTRAS.map(extra => {
            const Icon = extra.icon
            const href = LANDING_EXTRA_ROUTES[extra.title]
            return (
              <div key={extra.title} className="flex items-center gap-3 p-4 rounded-xl border border-dashed border-[var(--landing-border)] bg-[var(--landing-card)]/60">
                <div className="w-9 h-9 rounded-lg bg-[var(--landing-accent-soft)] flex items-center justify-center shrink-0">
                  <Icon size={18} className="text-[var(--landing-accent)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-[var(--landing-text)]">{extra.title}</p>
                  <p className="text-[10px] text-[var(--landing-muted)] mt-0.5">{extra.desc}</p>
                  {href && (
                    <Link href={href} className="text-[10px] font-bold text-[var(--landing-accent)] mt-1 inline-flex items-center gap-0.5 hover:underline">
                      Panele git <ArrowUpRight size={10} />
                    </Link>
                  )}
                </div>
              </div>
            )
          })}
        </motion.div>
      </div>
    </section>
  )
}
