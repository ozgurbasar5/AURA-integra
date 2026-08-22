'use client'

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Wrench,
  CheckCircle2,
  QrCode,
  Camera,
  ClipboardList,
  Shield,
  Layers,
  ArrowRight,
  Sparkles,
} from 'lucide-react'

const SERVICE_STAGES = [
  { id: 'kabul', name: 'Kabul', desc: 'Cihaz teslim alma & QR fiş' },
  { id: 'teshis', name: 'Teşhis', desc: 'Arıza tespiti & görsel ekspertiz' },
  { id: 'teklif', name: 'Teklif', desc: 'Fiyat & parça maliyet hesaplama' },
  { id: 'onay', name: 'Onay', desc: 'Müşteri dijital/SMS onayı' },
  { id: 'parca', name: 'Parça', desc: 'Stoktan otomatik parça tahsisi' },
  { id: 'tamir', name: 'Tamir', desc: 'Teknisyen onarım süreci' },
  { id: 'qc', name: 'QC (Kalite)', desc: '12 adımlı test & kontrol listesi' },
  { id: 'teslim', name: 'Teslim', desc: 'Kasa tahsilatı & fatura teslimi' },
  { id: 'garanti', name: 'Garanti', desc: 'Karekodlu garanti sertifikası' },
]

export function LandingServiceSection() {
  const [selectedStage, setSelectedStage] = useState(6) // default on QC

  return (
    <section id="servis" className="py-20 md:py-28 bg-white border-b border-slate-200/80 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-[#0c5f73] text-xs font-bold uppercase tracking-wider mb-3">
            <Wrench size={14} />
            <span>Teknik Servis & Atölye Mimarisi</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight mb-4">
            Servis kabulünden teslimata kadar.
          </h2>
          <p className="text-base sm:text-lg text-slate-600 leading-relaxed">
            <strong className="text-slate-900 font-semibold">Teknisyenin işi için tasarlandı.</strong> Cihazın atölyeye girişinden kalite kontrol ve garantili teslimatına kadar 9 aşamalı tam operasyonel kontrol.
          </p>
        </div>

        {/* 3 Quick Benefits */}
        <div className="grid sm:grid-cols-3 gap-5 mb-12">
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-[#0e8fad]/10 text-[#0e8fad] flex items-center justify-center font-black mb-3">
              <QrCode size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Hızlı Kabul</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Cihaz fotoğrafları, hasar haritası, QR servis etiketi ve müşteri KVKK onayı 60 saniyede tamamlanır.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black mb-3">
              <ClipboardList size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Tek Dokunuşlu Operasyon</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Teknisyen masadan veya mobilden tek dokunuşla parça ekler, durum değiştirir ve test listesini onaylar.
            </p>
          </div>

          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/90 shadow-2xs">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black mb-3">
              <Shield size={20} />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-1">Canlı Servis Durumu</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Durum değiştiği an müşteriye SMS gider, takip portalı güncellenir ve şeffaf iletişim sağlanır.
            </p>
          </div>
        </div>

        {/* 9-Step Lifecycle Track */}
        <div className="mb-10 p-4 sm:p-6 rounded-2xl bg-slate-900 text-white shadow-xl overflow-x-auto">
          <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-4">
            9 Aşamalı Standart Servis Yaşam Döngüsü
          </p>
          <div className="flex items-center justify-between min-w-[760px] gap-2">
            {SERVICE_STAGES.map((stage, idx) => {
              const isSelected = idx === selectedStage
              return (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => setSelectedStage(idx)}
                  className={`flex-1 p-2.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-[#0e8fad] border-cyan-400 text-white shadow-lg shadow-cyan-500/20'
                      : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:border-slate-600'
                  }`}
                >
                  <span className="block text-[10px] font-mono font-bold opacity-75">
                    {String(idx + 1).padStart(2, '0')}
                  </span>
                  <span className="block text-xs font-black mt-0.5">{stage.name}</span>
                  <span className="block text-[9px] opacity-80 mt-1 truncate">{stage.desc}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Authentic Service Detail Screen Preview */}
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="font-mono text-sm font-black text-sky-700 bg-sky-100 px-2.5 py-1 rounded-md">
                  SRV-2026-0042
                </span>
                <h3 className="text-lg font-black text-slate-900">Apple iPhone 14 Pro 128GB — Derin Mor</h3>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Müşteri: Mehmet Demir · Tel: 0532 *** 44 21 · Şube: Kadıköy Teknik
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 rounded-lg text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                QC & Kalite Kontrol Aşamasında
              </span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-5 mt-5">
            {/* Left: Device & Issue Info */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Arıza & Kabul Notu</p>
              <p className="text-xs text-slate-800 font-semibold leading-relaxed">
                Ön cam kırık, dokunmatik tepki vermiyor. Arka camda hafif çizikler mevcut. Cihaz açılıyor.
              </p>
              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span>Kabul Fotoğrafları:</span>
                <span className="font-bold text-[#0e8fad]">4 Delil Fotoğrafı</span>
              </div>
            </div>

            {/* Middle: Parts & Cost */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Kullanılan Parça & İşçilik</p>
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>iPhone 14 Pro Orijinal OLED</span>
                  <span>₺ 4.200</span>
                </div>
                <div className="flex justify-between font-semibold text-slate-700">
                  <span>İşçilik & Sıvı İzolasyon</span>
                  <span>₺ 650</span>
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between font-black text-slate-900">
                  <span>Toplam Fiyat:</span>
                  <span className="text-emerald-600">₺ 4.850 (KDV Dahil)</span>
                </div>
              </div>
            </div>

            {/* Right: Quality Checklist */}
            <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">12 Nokta QC Testi</p>
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <CheckCircle2 size={13} /> Dokunmatik & TrueTone: Başarılı
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <CheckCircle2 size={13} /> FaceID & Ön Kamera: Başarılı
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <CheckCircle2 size={13} /> Şarj & Batarya Döngüsü: %98
                </div>
                <div className="flex items-center gap-1.5 text-emerald-600 font-semibold">
                  <CheckCircle2 size={13} /> Ahize & Mikrofon: Başarılı
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </section>
  )
}
