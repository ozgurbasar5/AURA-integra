'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { ScanBarcode, Check, X, Package } from 'lucide-react'
import { Html5Qrcode } from 'html5-qrcode'
import { getStock, onStoreChange } from '@/lib/store'
import { toast } from 'sonner'

export default function StokSayimPage() {
  const [mounted, setMounted] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [scanned, setScanned] = useState<string[]>([])
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const [stock, setStock] = useState(getStock())

  useEffect(() => {
    setMounted(true)
    const refresh = () => setStock(getStock())
    refresh()
    return onStoreChange(refresh)
  }, [])

  useEffect(() => {
    return () => {
      void scannerRef.current?.stop().catch(() => {})
    }
  }, [])

  async function startScan() {
    setScanning(true)
    try {
      const scanner = new Html5Qrcode('barcode-reader')
      scannerRef.current = scanner
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decoded) => {
          setScanned(prev => prev.includes(decoded) ? prev : [...prev, decoded])
          toast.success(`Okundu: ${decoded}`)
        },
        () => {},
      )
    } catch {
      toast.error('Kamera erişimi reddedildi veya desteklenmiyor')
      setScanning(false)
    }
  }

  async function stopScan() {
    await scannerRef.current?.stop().catch(() => {})
    scannerRef.current = null
    setScanning(false)
  }

  if (!mounted) return null

  const matched = scanned.map(code => stock.find(s => s.barcode === code || s.id === code)).filter(Boolean)

  return (
    <div className="space-y-6 pb-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <ScanBarcode size={20} className="text-sky-600" /> Stok Sayım
          </h1>
          <p className="text-sm text-slate-500">Barkod okuyarak envanter sayımı yapın</p>
        </div>
        <Link href="/dashboard/stok" className="text-sm text-sky-600 font-semibold hover:underline">← Stok</Link>
      </div>

      <div className="card p-4">
        <div id="barcode-reader" className="rounded-xl overflow-hidden bg-black min-h-[200px]" />
        <div className="flex gap-2 mt-4">
          {!scanning ? (
            <button type="button" onClick={startScan} className="btn-primary flex-1 gap-2">
              <ScanBarcode size={16} /> Taramayı Başlat
            </button>
          ) : (
            <button type="button" onClick={stopScan} className="btn-secondary flex-1 gap-2">
              <X size={16} /> Durdur
            </button>
          )}
        </div>
      </div>

      <div className="card p-4">
        <p className="text-sm font-bold text-slate-700 mb-3">Okunan: {scanned.length} · Eşleşen: {matched.length}</p>
        {scanned.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">Henüz barkod okunmadı</p>
        ) : (
          <ul className="space-y-2 max-h-64 overflow-y-auto">
            {scanned.map(code => {
              const item = stock.find(s => s.barcode === code || s.id === code)
              return (
                <li key={code} className="flex items-center gap-3 p-2 rounded-lg bg-slate-50">
                  {item ? <Check size={16} className="text-emerald-500" /> : <Package size={16} className="text-amber-500" />}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono truncate">{code}</p>
                    <p className="text-xs text-slate-500">{item ? item.name : 'Stokta bulunamadı'}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
