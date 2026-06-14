'use client'

import { MessageCircle, Printer, PanelLeft } from 'lucide-react'
import type { BusinessBranding } from '@/lib/business-branding'
import { buildServisWhatsappMessage } from '@/utils/servisWhatsappMesaji'
import ServicePrintSheet, { type ServicePrintData } from '@/components/atolye/ServicePrintSheet'

const SAMPLE_ORDER: ServicePrintData = {
  jobNo: 'SRV-2026-0042',
  customerName: 'Ahmet Yılmaz',
  customerPhone: '0532 000 00 00',
  deviceBrand: 'Samsung',
  deviceModel: 'Galaxy S23',
  imei: '356789012345678',
  description: 'Ekran kırık, dokunmatik çalışmıyor',
  status: 'Bekliyor',
  price: 2500,
  createdAt: new Date().toISOString(),
}

function waPlain(text: string) {
  return text
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/_([^_]+)_/g, '$1')
}

interface Props {
  branding: BusinessBranding
  compact?: boolean
}

export default function BrandLivePreview({ branding, compact = false }: Props) {
  const waSample = buildServisWhatsappMessage(
    {
      customer: 'Ahmet Yılmaz',
      device: 'Samsung Galaxy S23',
      tracking_code: 'SRV-2026-0042',
      status: 'Bekliyor',
      price: 2500,
      issue: 'Ekran kırık',
    },
    branding,
  )

  return (
    <div className={`grid gap-4 ${compact ? 'grid-cols-1' : 'lg:grid-cols-3'}`}>
      {/* Sidebar */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-900 shadow-sm">
        <div className="px-3 py-2 border-b border-white/10 flex items-center gap-2">
          <PanelLeft size={14} className="text-sky-400" />
          <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Menü</span>
        </div>
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 ring-1 ring-white/10 bg-slate-800">
            {branding.shopLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={branding.shopLogo} alt="" className="w-full h-full object-contain bg-white" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-sky-600 to-cyan-700 flex items-center justify-center text-white text-xs font-black">
                {(branding.shopName || 'AU').slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-white truncate">{branding.shopName || 'Dükkan Adı'}</p>
            <p className="text-[9px] text-sky-400/80 uppercase tracking-widest">Teknik Servis</p>
          </div>
        </div>
      </div>

      {/* WhatsApp */}
      <div className="rounded-2xl border border-slate-200 overflow-hidden bg-[#e5ddd5] shadow-sm">
        <div className="px-3 py-2 border-b border-black/5 flex items-center gap-2 bg-[#075e54]">
          <MessageCircle size={14} className="text-white" />
          <span className="text-[11px] font-bold text-white uppercase tracking-wider">WhatsApp</span>
        </div>
        <div className="p-4 max-h-52 overflow-y-auto">
          <div className="bg-white rounded-lg rounded-tl-none shadow-sm p-3 text-[11px] leading-relaxed text-slate-800 whitespace-pre-wrap">
            {waPlain(waSample)}
          </div>
          <p className="text-[9px] text-slate-500 mt-2 text-right">Örnek müşteri mesajı</p>
        </div>
      </div>

      {/* Print */}
      <div className={`rounded-2xl border border-slate-200 overflow-hidden bg-white shadow-sm ${compact ? '' : 'lg:col-span-1'}`}>
        <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-2 bg-slate-50">
          <Printer size={14} className="text-slate-500" />
          <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Servis Fişi</span>
        </div>
        <div className="p-2 max-h-52 overflow-y-auto scale-[0.55] origin-top-left w-[182%] -mb-16">
          <ServicePrintSheet data={SAMPLE_ORDER} branding={branding} mode="preview" />
        </div>
      </div>
    </div>
  )
}
