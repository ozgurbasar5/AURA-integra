'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Globe, Smartphone, QrCode, MessageCircle, ArrowRight } from 'lucide-react'

const DEMO_STEPS = [
  { label: 'Kabul', status: 'Cihaz alındı', color: '#0e8fad' },
  { label: 'Teşhis', status: 'Arıza tespiti', color: '#2563eb' },
  { label: 'Tamirde', status: 'Parça bekleniyor', color: '#7c3aed' },
  { label: 'Hazır', status: 'Teslim edilebilir', color: '#059669' },
]

export default function LandingPortalShowcase() {
  return (
    <section id="portal" className="py-20 px-4 sm:px-6 bg-gradient-to-b from-[#05061a] to-[#0a0f2e]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sky-400 text-xs font-bold uppercase tracking-widest mb-2">Müşteri Deneyimi</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white mb-3">Müşteri Portalı Vitrini</h2>
          <p className="text-slate-400 max-w-2xl mx-auto text-sm sm:text-base">
            Bayileriniz müşteriye slug URL gönderir — cihaz durumu, timeline ve WhatsApp tek ekranda.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative mx-auto w-[280px] sm:w-[320px]"
          >
            <div className="rounded-[2.5rem] border-4 border-slate-700 bg-[#05061a] p-3 shadow-2xl shadow-sky-500/10">
              <div className="rounded-[2rem] overflow-hidden bg-[#0d1025] min-h-[420px] flex flex-col">
                <div className="p-4 border-b border-white/5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-sky-600 flex items-center justify-center text-white font-black text-xs">AB</div>
                  <div>
                    <p className="text-white text-sm font-bold">Aura Demo Servis</p>
                    <p className="text-slate-500 text-[10px]">portal/aura-demo</p>
                  </div>
                </div>
                <div className="p-4 flex-1 space-y-3">
                  <div className="rounded-xl bg-white/5 p-3">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Servis No</p>
                    <p className="text-white font-mono font-bold">SRV-2606-0042</p>
                  </div>
                  {DEMO_STEPS.map((step, i) => (
                    <motion.div
                      key={step.label}
                      initial={{ opacity: 0, x: -10 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.15 }}
                      viewport={{ once: true }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ background: step.color }} />
                      <div>
                        <p className="text-white text-xs font-bold">{step.label}</p>
                        <p className="text-slate-500 text-[10px]">{step.status}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
                <div className="p-4 border-t border-white/5 flex gap-2">
                  <span className="flex-1 text-center py-2 rounded-lg bg-[#25D366]/20 text-[#25D366] text-[10px] font-bold flex items-center justify-center gap-1">
                    <MessageCircle size={12} /> WA
                  </span>
                  <span className="flex-1 text-center py-2 rounded-lg bg-white/5 text-slate-400 text-[10px] font-bold flex items-center justify-center gap-1">
                    <QrCode size={12} /> QR
                  </span>
                </div>
              </div>
            </div>
          </motion.div>

          <div className="space-y-6">
            {[
              { icon: Globe, title: 'Slug URL', desc: 'integra.aurabilisim.net/portal/sizin-slug' },
              { icon: Smartphone, title: 'Mobil takip', desc: 'Müşteri telefonundan anlık durum görür' },
              { icon: QrCode, title: 'QR fiş', desc: 'Kabul fişindeki QR doğrudan takip sayfasına gider' },
            ].map(item => (
              <div key={item.title} className="flex gap-4 p-4 rounded-2xl border border-white/5 bg-white/[0.02]">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center shrink-0">
                  <item.icon size={20} className="text-sky-400" />
                </div>
                <div>
                  <p className="text-white font-bold text-sm">{item.title}</p>
                  <p className="text-slate-400 text-xs mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
            <Link
              href="/basvuru"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm transition-colors"
            >
              Bayi portalınızı açın <ArrowRight size={16} />
            </Link>
            <Link href="/portal/aura-demo" className="block text-sky-400 text-xs hover:underline">
              Canlı demo: /portal/aura-demo →
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
