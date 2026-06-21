'use client'

import { getBusinessBranding, resolveShopDisplayLine, type BusinessBranding } from '@/lib/business-branding'
import { QRCodeSVG } from 'qrcode.react'

export interface ServicePrintData {
  jobNo: string
  customerName: string
  customerPhone: string
  deviceBrand: string
  deviceModel: string
  imei?: string
  description?: string
  status: string
  price?: number
  notes?: string
  createdAt?: string
  /** Müşteri takip portalı QR değeri */
  trackingUrl?: string
}

function fmt(n: number) {
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', minimumFractionDigits: 0 }).format(n)
}

export default function ServicePrintSheet({
  data,
  branding: brandingProp,
  mode = 'print',
}: {
  data: ServicePrintData
  branding?: BusinessBranding
  mode?: 'print' | 'preview'
}) {
  const b = brandingProp ?? getBusinessBranding()
  const locationLine = resolveShopDisplayLine(b)
  const date = data.createdAt
    ? new Date(data.createdAt).toLocaleString('tr-TR')
    : new Date().toLocaleString('tr-TR')

  const wrapperClass =
    mode === 'preview'
      ? 'service-print-preview rounded-xl border border-slate-200 bg-white shadow-sm'
      : 'service-print-sheet hidden print:block'

  return (
    <div className={wrapperClass}>
      <div className="p-8 max-w-[210mm] mx-auto text-black text-sm font-sans">
        <header className="flex items-start justify-between gap-6 border-b-2 border-slate-800 pb-4 mb-6">
          <div className="flex items-center gap-4">
            {b.shopLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.shopLogo} alt="" className="h-16 w-16 object-contain rounded-lg" />
            ) : (
              <div className="h-16 w-16 rounded-lg bg-sky-600 flex items-center justify-center text-white font-black text-xl">
                {b.shopName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-black uppercase tracking-tight">{b.shopName}</h1>
              <p className="text-xs text-slate-600 mt-0.5">Teknik Servis Kabul Formu</p>
              {b.shopPhone && <p className="text-xs mt-1">Tel: {b.shopPhone}</p>}
              {locationLine && <p className="text-xs text-slate-600 max-w-xs">{locationLine}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] uppercase text-slate-500 font-bold">Servis No</p>
            <p className="text-lg font-black font-mono">{data.jobNo}</p>
            <p className="text-xs text-slate-500 mt-2">{date}</p>
            <div className="mt-3 inline-block p-2 border border-slate-300 rounded-lg bg-white">
              <QRCodeSVG
                value={data.trackingUrl || data.jobNo}
                size={72}
                level="M"
                includeMargin={false}
              />
              <p className="text-[8px] text-slate-500 mt-1 font-mono">Takip QR</p>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h2 className="text-[10px] font-bold uppercase text-slate-500 mb-2">Müşteri</h2>
            <p className="font-bold">{data.customerName}</p>
            <p className="text-sm">{data.customerPhone}</p>
          </div>
          <div>
            <h2 className="text-[10px] font-bold uppercase text-slate-500 mb-2">Cihaz</h2>
            <p className="font-bold">{data.deviceBrand} {data.deviceModel}</p>
            {data.imei && data.imei !== '-' && (
              <p className="text-xs font-mono mt-1">IMEI: {data.imei}</p>
            )}
          </div>
        </section>

        <section className="mb-6">
          <h2 className="text-[10px] font-bold uppercase text-slate-500 mb-2">Arıza / Talep</h2>
          <p className="border border-slate-300 rounded p-3 min-h-[48px] bg-slate-50">
            {data.description || '—'}
          </p>
        </section>

        <section className="grid grid-cols-3 gap-4 mb-8">
          <div className="border border-slate-300 rounded p-3">
            <p className="text-[10px] font-bold uppercase text-slate-500">Durum</p>
            <p className="font-semibold">{data.status}</p>
          </div>
          <div className="border border-slate-300 rounded p-3">
            <p className="text-[10px] font-bold uppercase text-slate-500">Tahmini Ücret</p>
            <p className="font-semibold">{data.price && data.price > 0 ? fmt(data.price) : '—'}</p>
          </div>
          <div className="border border-slate-300 rounded p-3">
            <p className="text-[10px] font-bold uppercase text-slate-500">Takip</p>
            <p className="font-mono text-xs">{data.jobNo}</p>
          </div>
        </section>

        {data.notes && (
          <section className="mb-8">
            <h2 className="text-[10px] font-bold uppercase text-slate-500 mb-2">Not</h2>
            <p className="text-sm">{data.notes}</p>
          </section>
        )}

        <footer className="border-t border-slate-300 pt-6 grid grid-cols-2 gap-12 mt-8">
          <div>
            <p className="text-[10px] text-slate-500 mb-8">Müşteri İmzası</p>
            <div className="border-b border-slate-400 h-8" />
          </div>
          <div>
            <p className="text-[10px] text-slate-500 mb-8">Yetkili İmzası ({b.shopName})</p>
            <div className="border-b border-slate-400 h-8" />
          </div>
        </footer>

        <p className="text-[9px] text-slate-400 text-center mt-6">
          Cihaz teslim alınırken fiziksel durumu kontrol edilmiştir. {b.shopName} — {date}
        </p>
      </div>
    </div>
  )
}
