'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, ArrowUpRight } from 'lucide-react'
import Link from 'next/link'
import { LANDING_CATEGORIES_RESOLVED, type LandingModule } from '@/lib/landing-modules'
import { ModuleIllustration } from '@/components/landing/illustrations/ModuleIllustrations'

export default function LandingFeatureExplorer() {
  const [catId, setCatId] = useState(LANDING_CATEGORIES_RESOLVED[0].id)
  const [modId, setModId] = useState(LANDING_CATEGORIES_RESOLVED[0].modules[0].id)

  const category = LANDING_CATEGORIES_RESOLVED.find(c => c.id === catId) ?? LANDING_CATEGORIES_RESOLVED[0]
  const activeModule = category.modules.find(m => m.id === modId) ?? category.modules[0]
  const ActiveModIcon = activeModule.icon

  function selectCategory(id: string) {
    setCatId(id)
    const cat = LANDING_CATEGORIES_RESOLVED.find(c => c.id === id)
    if (cat?.modules[0]) setModId(cat.modules[0].id)
  }

  return (
    <section id="kesfet" className="py-20 md:py-24 border-t border-[var(--landing-border)] scroll-mt-20">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-10 md:mb-14">
          <p className="text-[var(--landing-accent)] text-xs font-bold uppercase tracking-[0.2em] mb-2">İnteraktif Keşif</p>
          <h2 className="text-3xl md:text-4xl font-black text-[var(--landing-text)] mb-3">
            Her modülü yakından tanıyın
          </h2>
          <p className="text-[var(--landing-muted)] max-w-2xl mx-auto text-sm md:text-base">
            Kategori seçin, modüle tıklayın — canlı vektör önizleme ile platformun nasıl çalıştığını görün.
          </p>
        </div>

        {/* Category pills */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {LANDING_CATEGORIES_RESOLVED.map(cat => {
            const Icon = cat.icon
            const active = cat.id === catId
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => selectCategory(cat.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
                  active
                    ? 'bg-[var(--landing-accent)] text-white shadow-md shadow-[#0e8fad]/25'
                    : 'bg-[var(--landing-card)] border border-[var(--landing-border)] text-[var(--landing-muted)] hover:border-[var(--landing-accent)] hover:text-[var(--landing-accent)]'
                }`}
              >
                <Icon size={14} />
                {cat.label}
              </button>
            )
          })}
        </div>

        <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* Module list */}
          <div className="lg:col-span-5 space-y-2">
            <p className="text-xs font-bold text-[var(--landing-muted)] uppercase tracking-wider mb-3 px-1">
              {category.subtitle}
            </p>
            {category.modules.map(m => (
              <ModuleRow
                key={m.id}
                module={m}
                active={m.id === modId}
                onClick={() => setModId(m.id)}
              />
            ))}
          </div>

          {/* Illustration panel */}
          <div className="lg:col-span-7">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeModule.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="landing-card overflow-hidden h-full flex flex-col"
              >
                <div className="p-5 md:p-6 border-b border-[var(--landing-border)] flex items-start gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${activeModule.color}18` }}
                  >
                    <ActiveModIcon size={24} style={{ color: activeModule.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-xl font-black text-[var(--landing-text)]">{activeModule.title}</h3>
                    <p className="text-sm text-[var(--landing-muted)] mt-1 leading-relaxed">{activeModule.desc}</p>
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {activeModule.tags.map(tag => (
                        <span key={tag} className="landing-tag">{tag}</span>
                      ))}
                    </div>
                  </div>
                  {activeModule.stat && (
                    <div className="hidden sm:block text-right shrink-0">
                      <p className="text-[10px] uppercase tracking-wider text-[var(--landing-muted)] font-bold">{activeModule.stat.label}</p>
                      <p className="text-lg font-black text-[var(--landing-accent)]">{activeModule.stat.value}</p>
                    </div>
                  )}
                </div>
                <div className="flex-1 p-3 md:p-4 bg-[var(--landing-surface)]">
                  <ModuleIllustration type={activeModule.illustration} className="w-full h-auto rounded-xl" />
                  {activeModule.panelHref && !activeModule.platformOnly && (
                    <Link
                      href={activeModule.panelHref}
                      className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-[var(--landing-accent)] hover:opacity-80"
                    >
                      Panelde aç: {activeModule.title} <ArrowUpRight size={14} />
                    </Link>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  )
}

function ModuleRow({ module: mod, active, onClick }: { module: LandingModule; active: boolean; onClick: () => void }) {
  const Icon = mod.icon
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left p-4 rounded-xl border transition-all duration-200 flex items-start gap-3 ${
        active
          ? 'bg-[var(--landing-accent-soft)] border-[var(--landing-accent)] shadow-sm scale-[1.01]'
          : 'bg-[var(--landing-card)] border-[var(--landing-border)] hover:border-[var(--landing-accent)]/50'
      }`}
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: `${mod.color}15` }}
      >
        <Icon size={18} style={{ color: mod.color }} />
      </div>
      <div className="min-w-0">
        <p className={`font-bold text-sm ${active ? 'text-[var(--landing-accent)]' : 'text-[var(--landing-text)]'}`}>
          {mod.title}
        </p>
        <p className="text-xs text-[var(--landing-muted)] line-clamp-2 mt-0.5">{mod.desc}</p>
      </div>
      {active && <CheckCircle2 size={16} className="text-[var(--landing-accent)] shrink-0 mt-1" />}
    </button>
  )
}
