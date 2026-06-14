'use client'

import { useState } from 'react'
import BrandLivePreview from '@/components/branding/BrandLivePreview'
import WhatsappPreviewModal from '@/components/branding/WhatsappPreviewModal'
import ServicePrintSheet from '@/components/atolye/ServicePrintSheet'
import { buildServisWhatsappMessage } from '@/utils/servisWhatsappMesaji'
import type { BusinessBranding } from '@/lib/business-branding'

const DEFAULT: BusinessBranding = {
  shopName: 'Demo Telefon Servis',
  shopPhone: '0850 123 45 67',
  shopAddress: 'Atatürk Cad. No:12, İstanbul',
  shopLogo: null,
}

export default function BrandUiTestClient() {
  const [brand, setBrand] = useState(DEFAULT)
  const [showWa, setShowWa] = useState(false)

  const waMsg = buildServisWhatsappMessage(
    {
      customer: 'Ahmet Yılmaz',
      device: 'Samsung Galaxy S23',
      tracking_code: 'SRV-2026-0099',
      status: 'Bekliyor',
      price: 1800,
      issue: 'Ekran kırık',
    },
    brand,
  )

  return (
    <div className="min-h-screen bg-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header>
          <p className="text-xs font-bold text-sky-600 uppercase tracking-wider mb-1">Dev UI Test</p>
          <h1 className="text-2xl font-black text-slate-900">Firma Markası Bileşenleri</h1>
          <p className="text-sm text-slate-500 mt-1">Sadece geliştirme ortamında — canlı önizleme testi</p>
        </header>

        <div className="card p-5 grid sm:grid-cols-3 gap-4">
          <input className="input" placeholder="Dükkan adı" value={brand.shopName}
            onChange={e => setBrand(b => ({ ...b, shopName: e.target.value }))} />
          <input className="input" placeholder="Telefon" value={brand.shopPhone}
            onChange={e => setBrand(b => ({ ...b, shopPhone: e.target.value }))} />
          <input className="input" placeholder="Adres" value={brand.shopAddress}
            onChange={e => setBrand(b => ({ ...b, shopAddress: e.target.value }))} />
        </div>

        <BrandLivePreview branding={brand} />

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card p-5">
            <h2 className="font-bold mb-3">Servis Fişi (Ekran)</h2>
            <ServicePrintSheet
              mode="preview"
              branding={brand}
              data={{
                jobNo: 'SRV-2026-0099',
                customerName: 'Ahmet Yılmaz',
                customerPhone: '0532 000 00 00',
                deviceBrand: 'Samsung',
                deviceModel: 'Galaxy S23',
                description: 'Ekran kırık',
                status: 'Bekliyor',
                price: 1800,
                createdAt: new Date().toISOString(),
              }}
            />
          </div>
          <div className="card p-5 flex flex-col gap-3">
            <h2 className="font-bold">WhatsApp Modal</h2>
            <button type="button" className="btn-primary" onClick={() => setShowWa(true)}>Modal Aç</button>
            <pre className="text-[10px] bg-slate-50 p-3 rounded-xl overflow-auto max-h-64 whitespace-pre-wrap">{waMsg}</pre>
          </div>
        </div>
      </div>

      <WhatsappPreviewModal open={showWa} onClose={() => setShowWa(false)} message={waMsg} phone="0532 000 00 00" />
    </div>
  )
}
