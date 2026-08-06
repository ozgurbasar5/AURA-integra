'use client'

import { useState } from 'react'
import { X, Printer, Bluetooth, Wifi, Loader2, FileText, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { buildDeviceLabelZpl, buildReceiptEscPos, printBluetooth, type ReceiptData } from '@/lib/printer-engine'
import type { StoreServiceOrder } from '@/lib/store'
import { getBusinessBranding } from '@/lib/business-branding'

interface PrinterSetupModalProps {
  order?: StoreServiceOrder
  onClose: () => void
}

export default function PrinterSetupModal({ order, onClose }: PrinterSetupModalProps) {
  const [activeTab, setActiveTab] = useState<'termal' | 'etiket'>('termal')
  const [printing, setPrinting] = useState(false)

  async function handlePrintBluetooth() {
    setPrinting(true)
    try {
      if (activeTab === 'termal') {
        const brand = getBusinessBranding()
        const data: ReceiptData = {
          type: 'kabul',
          order,
          shopName: brand.shopName,
          shopPhone: brand.phone,
          shopAddress: brand.address,
        }
        const escpos = buildReceiptEscPos(data)
        await printBluetooth(escpos)
        toast.success('Termal fiş yazdırıldı')
      } else {
        if (!order) throw new Error('Etiket yazdırmak için sipariş bilgisi gerekli')
        // ZPL stringini byte array'e çevirip ESC/POS gibi yollarız (Yazıcı ZPL destekliyorsa)
        const zpl = buildDeviceLabelZpl(order)
        const encoder = new TextEncoder()
        await printBluetooth(encoder.encode(zpl))
        toast.success('Etiket yazdırıldı')
      }
    } catch (e: any) {
      toast.error(e.message || 'Yazdırma hatası')
    } finally {
      setPrinting(false)
    }
  }

  function handlePrintNetwork() {
    toast.info('Ağ yazıcısı yazdırma aracı (Local Agent) geliştirilme aşamasındadır.')
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box max-w-md" onClick={e => e.stopPropagation()}>
        <div className="modal-header border-b border-slate-100 p-4">
          <h3 className="font-bold text-lg flex items-center gap-2">
            <Printer size={20} className="text-slate-600" />
            Yazıcı & Etiket
          </h3>
          <button type="button" onClick={onClose} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18} /></button>
        </div>

        <div className="p-4">
          <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-xl">
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'termal' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
              onClick={() => setActiveTab('termal')}
            >
              Termal Fiş (58mm/80mm)
            </button>
            <button 
              className={`flex-1 py-2 text-sm font-bold rounded-lg transition-colors ${activeTab === 'etiket' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500'}`}
              onClick={() => setActiveTab('etiket')}
              disabled={!order}
            >
              Cihaz Etiketi (ZPL)
            </button>
          </div>

          <div className="space-y-3">
            <button 
              onClick={handlePrintBluetooth}
              disabled={printing}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-sky-100 bg-sky-50 hover:bg-sky-100 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-sky-200 text-sky-700 p-2 rounded-full">
                  <Bluetooth size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm">Bluetooth Yazıcı</p>
                  <p className="text-xs text-slate-500">Mobil / Tarayıcı (Web Bluetooth)</p>
                </div>
              </div>
              {printing ? <Loader2 size={16} className="animate-spin text-sky-600" /> : <Printer size={16} className="text-sky-600" />}
            </button>

            <button 
              onClick={handlePrintNetwork}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="bg-slate-100 text-slate-500 p-2 rounded-full">
                  <Wifi size={20} />
                </div>
                <div className="text-left">
                  <p className="font-bold text-slate-800 text-sm">Ağ Yazıcısı (IP/Port)</p>
                  <p className="text-xs text-slate-500">Ethernet / WiFi (Local Agent Gerektirir)</p>
                </div>
              </div>
              <Settings size={16} className="text-slate-400" />
            </button>
          </div>
          
          <div className="mt-4 p-3 bg-amber-50 rounded-xl flex items-start gap-2 border border-amber-100">
            <FileText size={16} className="text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-800 leading-relaxed">
              Önizleme olmadan doğrudan donanıma komut gönderilir. Lütfen yazıcınızın açık ve bağlanabilir (Pair) durumda olduğundan emin olun.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
