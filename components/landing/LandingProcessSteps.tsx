'use client'

import { motion } from 'framer-motion'

const STEPS = [
  { n: '01', title: 'Başvuru & Onay', desc: 'Bayi formu admin paneline düşer; deneme hesabınız açılır.', icon: '📋' },
  { n: '02', title: 'Kurulum & Eğitim', desc: 'Bulut erişim — kurulum yok. Veri aktarımı ve kısa onboarding.', icon: '🚀' },
  { n: '03', title: 'Canlı Operasyon', desc: 'Stok, servis ve finans aynı gün senkron çalışmaya başlar.', icon: '⚡' },
]

export default function LandingProcessSteps() {
  return (
    <section id="nasil-calisir" className="py-20 landing-surface border-t border-[var(--landing-border)] scroll-mt-20">
      <div className="max-w-6xl mx-auto px-5">
        <div className="text-center mb-12">
          <p className="text-[var(--landing-accent)] text-xs font-bold uppercase tracking-[0.2em] mb-2">Süreç</p>
          <h2 className="text-3xl font-black text-[var(--landing-text)]">3 adımda canlıya geçin</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-5 relative">
          <div className="hidden md:block absolute top-1/2 left-[16%] right-[16%] h-0.5 bg-[var(--landing-border)] -translate-y-1/2" />
          {STEPS.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12 }}
              className="landing-card p-6 relative"
            >
              <div className="flex items-center gap-3 mb-4">
                <span className="text-3xl">{s.icon}</span>
                <span className="text-3xl font-black text-[var(--landing-accent-soft)]">{s.n}</span>
              </div>
              <h3 className="text-lg font-bold text-[var(--landing-text)] mb-2">{s.title}</h3>
              <p className="text-sm text-[var(--landing-muted)] leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
