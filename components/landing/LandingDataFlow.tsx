'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Layers, RefreshCw, Shield, Sparkles, Zap, QrCode, Search,
  Camera, Building2, CheckCircle2,
} from 'lucide-react'
import { LANDING_FLOW_NODES } from '@/lib/landing-modules'

/** Her adımda otomatik tetiklenen olay */
const FLOW_EVENTS = [
  {
    id: 'kabul',
    label: 'Kabul',
    event: 'İş emri açıldı · QR fiş basıldı · KVKK kaydı alındı',
    auto: ['job_no', 'portal', 'whatsapp'],
  },
  {
    id: 'atolye',
    label: 'Atölye',
    event: 'Parça kullanıldı · QC tamamlandı · Müşteriye SMS gitti',
    auto: ['stok', 'maliyet', 'sms'],
  },
  {
    id: 'stok',
    label: 'Stok',
    event: 'Envanter düştü · Kritik stok kontrol edildi · Marj güncellendi',
    auto: ['envanter', 'uyarı', 'kâr'],
  },
  {
    id: 'finans',
    label: 'Finans',
    event: 'Kasa hareketi oluştu · Vardiya sync · Net kâr hesaplandı',
    auto: ['kasa', 'vardiya', 'rapor'],
  },
  {
    id: 'portal',
    label: 'Portal',
    event: 'Müşteri timeline güncellendi · Durum canlı · WA linki hazır',
    auto: ['timeline', 'canlı', 'bildirim'],
  },
] as const

const DIFFERENTIATORS = [
  {
    icon: Sparkles,
    badge: 'Saha doğmuş',
    title: 'Gerçek laboratuvar deneyiminden',
    desc: '15.000+ onarım operasyonundan gelen iş akışı — genel muhasebe yazılımının servis eklentisi değil.',
    accent: '#0e8fad',
  },
  {
    icon: Zap,
    badge: 'Sıfır çift kayıt',
    title: 'Tek olay, beş modül güncellenir',
    desc: 'Parça ekle → stok düşer → maliyet hesaplanır → kasa yansır → portal güncellenir. Excel köprüsü yok.',
    accent: '#2563eb',
  },
  {
    icon: Building2,
    badge: 'Bayi DNA',
    title: 'Çok kiracılı bayi ağı hazır',
    desc: 'Şube seçici, rol bazlı menü, paket/feature flag ve merkezi admin — franchise yapısına göre tasarlandı.',
    accent: '#7c3aed',
  },
  {
    icon: QrCode,
    badge: 'Servis derinliği',
    title: 'Atölyeye özel araçlar',
    desc: 'Cihaz fotoğrafı, ekspertiz onay linki, QC checklist, QR servis etiketi ve IMEI kamera arama.',
    accent: '#059669',
  },
  {
    icon: Search,
    badge: 'Canlı operasyon',
    title: 'Anlık arama & kur',
    desc: 'Global IMEI/barkod arama, TCMB döviz widget ve remote KPI — sahada anında cevap.',
    accent: '#d97706',
  },
  {
    icon: Shield,
    badge: 'Güven & uyum',
    title: 'KVKK + izole tenant',
    desc: 'Bayi verisi birbirinden izole, audit log, Turnstile korumalı başvuru ve şifreli PII alanları.',
    accent: '#dc2626',
  },
] as const

const LEGACY_COMPARE = [
  { them: 'Stok + muhasebe ayrı program', us: 'Tek panel, tek veri modeli' },
  { them: 'Manuel Excel köprüsü', us: 'Otomatik zincir tetikleme' },
  { them: 'Genel ERP servis modülü', us: 'Atölye-native QC, foto, onay' },
  { them: 'Tek dükkan odaklı', us: 'Multi-tenant bayi ağı' },
]

export default function LandingDataFlow() {
  const [activeStep, setActiveStep] = useState(0)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep(s => (s + 1) % FLOW_EVENTS.length)
      setTick(t => t + 1)
    }, 2800)
    return () => clearInterval(interval)
  }, [])

  const active = FLOW_EVENTS[activeStep]
  const progressPct = (activeStep / (FLOW_EVENTS.length - 1)) * 100

  return (
    <section id="entegrasyon" className="py-20 md:py-24 border-t border-[var(--landing-border)] scroll-mt-20 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_100%,rgba(14,143,173,0.06),transparent)] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-5 relative">
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--landing-accent-soft)] border border-[#a5d8e8] text-[#0c5f73] text-[10px] font-bold uppercase tracking-wider mb-4"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            Canlı senkron · Rakiplerden farklı
          </motion.div>
          <h2 className="text-3xl md:text-4xl font-black text-[var(--landing-text)] mb-3">
            Modüller birbirini besler
          </h2>
          <p className="text-[var(--landing-muted)] max-w-2xl mx-auto text-sm md:text-base leading-relaxed">
            Kabul → atölye → stok → finans → portal zinciri{' '}
            <strong className="text-[var(--landing-text)]">tek olayla</strong> tetiklenir.
            Çift kayıt, manuel aktarım ve Excel köprüsü yok.
          </p>
        </div>

        {/* Pipeline card */}
        <div className="landing-card p-5 md:p-8 mb-8 relative overflow-hidden">
          <div className="absolute top-4 right-4 flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full z-10">
            <RefreshCw size={11} className="animate-spin" style={{ animationDuration: '3s' }} />
            Sync aktif
          </div>

          {/* Connector track */}
          <div className="relative px-2 md:px-6 pt-8 pb-4">
            <div className="absolute left-[10%] right-[10%] top-[2.75rem] h-1 rounded-full bg-[#dce4ed]" />
            <motion.div
              className="absolute left-[10%] top-[2.75rem] h-1 rounded-full bg-gradient-to-r from-[#0e8fad] via-[#2563eb] to-[#0e8fad]"
              animate={{ width: `${progressPct * 0.8 + 4}%` }}
              transition={{ duration: 0.55, ease: 'easeOut' }}
              style={{ maxWidth: '80%' }}
            />

            {/* Animated particles along track */}
            {[0, 1, 2].map(p => (
              <motion.div
                key={`${tick}-${p}`}
                className="absolute top-[2.65rem] w-2.5 h-2.5 rounded-full shadow-md z-20"
                style={{
                  background: p === 0 ? '#0e8fad' : p === 1 ? '#2563eb' : '#06b6d4',
                  boxShadow: `0 0 8px ${p === 0 ? '#0e8fad' : '#2563eb'}`,
                }}
                initial={{ left: '10%', opacity: 0, scale: 0.4 }}
                animate={{
                  left: `${10 + progressPct * 0.8}%`,
                  opacity: [0, 1, 1, 0.6],
                  scale: [0.4, 1, 0.9],
                }}
                transition={{
                  duration: 1.6,
                  delay: p * 0.3,
                  repeat: Infinity,
                  repeatDelay: 0.5,
                  ease: 'easeInOut',
                }}
              />
            ))}

            <div className="relative grid grid-cols-5 gap-1">
              {LANDING_FLOW_NODES.map((node, i) => {
                const Icon = node.icon
                const isActive = i === activeStep
                const isPast = i < activeStep
                return (
                  <button
                    key={node.id}
                    type="button"
                    onClick={() => { setActiveStep(i); setTick(t => t + 1) }}
                    className="flex flex-col items-center gap-2 group focus:outline-none"
                  >
                    <div className="relative">
                      {isActive && (
                        <motion.span
                          className="absolute inset-0 rounded-2xl bg-[#0e8fad]/20"
                          animate={{ scale: [1, 1.35, 1], opacity: [0.5, 0.15, 0.5] }}
                          transition={{ duration: 1.8, repeat: Infinity }}
                          style={{ margin: '-6px' }}
                        />
                      )}
                      <motion.div
                        animate={{ scale: isActive ? 1.1 : 1 }}
                        transition={{ type: 'spring', stiffness: 400, damping: 18 }}
                        className={`relative w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center border-2 transition-colors ${
                          isActive
                            ? 'bg-white border-[#0e8fad] shadow-lg shadow-[#0e8fad]/25'
                            : isPast
                              ? 'bg-[#eff6ff] border-[#2563eb]'
                              : 'bg-white border-[#dce4ed] group-hover:border-[#0e8fad]/50'
                        }`}
                      >
                        <Icon
                          size={22}
                          className={
                            isActive ? 'text-[#0e8fad]' : isPast ? 'text-[#2563eb]' : 'text-[#94a3b8] group-hover:text-[#0e8fad]'
                          }
                        />
                        {isPast && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center border-2 border-white">
                            <CheckCircle2 size={10} className="text-white" strokeWidth={3} />
                          </span>
                        )}
                      </motion.div>
                    </div>
                    <span
                      className={`text-[10px] md:text-xs font-bold transition-colors ${
                        isActive ? 'text-[#0c5f73]' : isPast ? 'text-[#2563eb]' : 'text-[var(--landing-muted)]'
                      }`}
                    >
                      {node.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Live event ticker */}
          <AnimatePresence mode="wait">
            <motion.div
              key={active.id}
              initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
              transition={{ duration: 0.35 }}
              className="mt-2 p-4 rounded-xl bg-gradient-to-r from-[#e8f6fa] to-[#eff6ff] border border-[#a5d8e8]/60"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex items-center gap-2 shrink-0">
                  <motion.span
                    key={activeStep}
                    initial={{ scale: 0.8 }}
                    animate={{ scale: 1 }}
                    className="text-[10px] font-black uppercase tracking-wider text-[var(--landing-accent)] px-2 py-0.5 rounded bg-white border border-[#a5d8e8]"
                  >
                    Adım {activeStep + 1}/{FLOW_EVENTS.length}
                  </motion.span>
                  <span className="font-bold text-sm text-[var(--landing-text)]">{active.label}</span>
                </div>
                <p className="text-sm text-[var(--landing-muted)] flex-1">{active.event}</p>
                <div className="flex flex-wrap gap-1 shrink-0">
                  {active.auto.map(tag => (
                    <span key={tag} className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-[var(--landing-accent)] text-white uppercase">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="flex justify-center gap-2 mt-4">
            {FLOW_EVENTS.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Adım ${i + 1}`}
                onClick={() => { setActiveStep(i); setTick(t => t + 1) }}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  i === activeStep ? 'w-8 bg-[var(--landing-accent)]' : 'w-1.5 bg-[var(--landing-border)] hover:bg-[var(--landing-accent)]/50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* vs legacy */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-10 p-4 md:p-5 rounded-2xl border border-dashed border-[var(--landing-border)] bg-[var(--landing-surface)]"
        >
          <p className="text-xs font-bold uppercase tracking-wider text-[var(--landing-muted)] mb-4 text-center">
            Klasik yazılımlar vs AURA İntegra
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            {LEGACY_COMPARE.map(row => (
              <div key={row.them} className="flex flex-col gap-1.5 text-xs">
                <span className="text-[var(--landing-muted)] line-through decoration-red-400/60">{row.them}</span>
                <span className="flex items-center gap-1.5 font-bold text-[var(--landing-text)]">
                  <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                  {row.us}
                </span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Differentiators */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {DIFFERENTIATORS.map((item, i) => {
            const Icon = item.icon
            return (
              <motion.div
                key={item.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -3 }}
                className="landing-card p-5 relative overflow-hidden group"
              >
                <div className="absolute top-0 left-0 w-1 h-full rounded-l opacity-80" style={{ backgroundColor: item.accent }} />
                <span
                  className="inline-block text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded mb-3"
                  style={{ backgroundColor: `${item.accent}18`, color: item.accent }}
                >
                  {item.badge}
                </span>
                <div className="flex gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                    style={{ backgroundColor: `${item.accent}15` }}
                  >
                    <Icon size={20} style={{ color: item.accent }} />
                  </div>
                  <div>
                    <p className="font-bold text-[var(--landing-text)] text-sm leading-snug">{item.title}</p>
                    <p className="text-xs text-[var(--landing-muted)] mt-1.5 leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-[11px] font-semibold text-[var(--landing-muted)]"
        >
          {[
            { icon: Layers, text: 'Tek veri modeli' },
            { icon: RefreshCw, text: 'Offline + bulut sync' },
            { icon: Camera, text: 'Cihaz fotoğraf arşivi' },
            { icon: Shield, text: 'KVKK uyumlu' },
          ].map(row => (
            <span key={row.text} className="inline-flex items-center gap-1.5">
              <row.icon size={13} className="text-[var(--landing-accent)]" />
              {row.text}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
