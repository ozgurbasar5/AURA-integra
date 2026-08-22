'use client'

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle2, Building2, Phone, Mail, User, Layers, ArrowRight, ShieldCheck } from 'lucide-react'
import Link from 'next/link'
import { AuraLogo } from './AuraLogo'

type DemoModalProps = {
  isOpen: boolean
  onClose: () => void
}

export function LandingDemoModal({ isOpen, onClose }: DemoModalProps) {
  const [formData, setFormData] = useState({
    businessName: '',
    contactName: '',
    phone: '',
    email: '',
    branchCount: '1',
    primaryInterest: 'hepsi',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate reliable submission feedback
    await new Promise((resolve) => setTimeout(resolve, 800))
    setIsSubmitting(false)
    setIsSuccess(true)
  }

  const resetAndClose = () => {
    setIsSuccess(false)
    setFormData({
      businessName: '',
      contactName: '',
      phone: '',
      email: '',
      branchCount: '1',
      primaryInterest: 'hepsi',
    })
    onClose()
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={resetAndClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm transition-opacity"
        />

        {/* Modal content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
          className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden z-10 my-8"
        >
          {/* Top header bar */}
          <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-sky-50/50 flex items-center justify-between">
            <AuraLogo size="sm" mode="horizontal" />
            <button
              type="button"
              onClick={resetAndClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              aria-label="Kapat"
            >
              <X size={18} />
            </button>
          </div>

          <div className="p-6">
            {isSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-6 space-y-4"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 size={36} />
                </div>
                <h3 className="text-xl font-black text-slate-900">Demo Talebiniz Alındı!</h3>
                <p className="text-sm text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Operasyon uzmanımız <strong className="text-slate-800">{formData.contactName || 'sizinle'}</strong> en kısa sürede iletişime geçerek işletmenize özel canlı ürün tanıtımını gerçekleştirecektir.
                </p>

                <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-sm hover:bg-slate-800 transition-colors"
                  >
                    Tamam
                  </button>
                  <Link
                    href="/basvuru"
                    onClick={resetAndClose}
                    className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl border border-sky-200 bg-sky-50 text-sky-700 font-bold text-sm hover:bg-sky-100 transition-colors"
                  >
                    Detaylı Bayi Başvurusu <ArrowRight size={14} />
                  </Link>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-1">AURA İntegra Demo Talebi</h3>
                  <p className="text-xs text-slate-500">
                    Gerçek ürün ekranları üzerinden işletmenize özel 15 dakikalık canlı demo oluşturun.
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      İşletme / Servis Adı *
                    </label>
                    <div className="relative">
                      <Building2 size={16} className="absolute left-3 top-3 text-slate-400" />
                      <input
                        type="text"
                        required
                        value={formData.businessName}
                        onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
                        placeholder="Örn: Atlas Teknik Servis"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Yetkili Ad Soyad *
                      </label>
                      <div className="relative">
                        <User size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={formData.contactName}
                          onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                          placeholder="Ad Soyad"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Telefon Numarası *
                      </label>
                      <div className="relative">
                        <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="tel"
                          required
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="05XX XXX XX XX"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        E-posta Adresi
                      </label>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3 top-3 text-slate-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="iletisim@servis.com"
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                        Şube Sayısı
                      </label>
                      <div className="relative">
                        <Layers size={16} className="absolute left-3 top-3 text-slate-400" />
                        <select
                          value={formData.branchCount}
                          onChange={(e) => setFormData({ ...formData, branchCount: e.target.value })}
                          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        >
                          <option value="1">1 Şube (Tek Mağaza / Servis)</option>
                          <option value="2-5">2 - 5 Şube</option>
                          <option value="6+">6+ Çoklu Bayi / Franchise</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-start gap-2.5 text-xs text-slate-600">
                  <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Bilgileriniz KVKK standartlarında korunur ve yalnızca demo randevunuzu planlamak amacıyla kullanılır.
                  </span>
                </div>

                <div className="pt-2 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={resetAndClose}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold text-sm hover:bg-slate-50 transition-colors"
                  >
                    Vazgeç
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#0e8fad] hover:bg-[#0c7a94] text-white font-bold text-sm shadow-md transition-all disabled:opacity-50"
                  >
                    {isSubmitting ? 'Gönderiliyor...' : 'Demo Talep Et'}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
