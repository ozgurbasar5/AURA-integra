'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { ScanBarcode } from 'lucide-react'

type Props = {
  onScan: (barcode: string) => void
  placeholder?: string
}

/** Barkod okuyucu klavye emülasyonu + BarcodeDetector (destekleyen tarayıcılar) */
export default function BarcodeScanField({ onScan, placeholder = 'Barkod okutun veya yazın…' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [cameraOn, setCameraOn] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)

  const handleValue = useCallback((raw: string) => {
    const code = raw.trim()
    if (code.length >= 4) onScan(code)
  }, [onScan])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  async function startCamera() {
    if (typeof window === 'undefined') return
    const Detector = (window as unknown as { BarcodeDetector?: new (opts: { formats: string[] }) => { detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue: string }>> } }).BarcodeDetector
    if (!Detector || !navigator.mediaDevices?.getUserMedia) {
      inputRef.current?.focus()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraOn(true)

      const detector = new Detector({ formats: ['ean_13', 'ean_8', 'code_128', 'qr_code'] })
      const tick = async () => {
        if (!videoRef.current) return
        try {
          const codes = await detector.detect(videoRef.current)
          if (codes[0]?.rawValue) {
            handleValue(codes[0].rawValue)
            stopCamera()
            return
          }
        } catch { /* frame skip */ }
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    } catch {
      inputRef.current?.focus()
    }
  }

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          className="input flex-1 font-mono"
          placeholder={placeholder}
          autoComplete="off"
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault()
              handleValue((e.target as HTMLInputElement).value)
              ;(e.target as HTMLInputElement).value = ''
            }
          }}
        />
        <button type="button" className="btn-secondary shrink-0" onClick={cameraOn ? stopCamera : startCamera}>
          <ScanBarcode size={16} />
          {cameraOn ? 'Kapat' : 'Kamera'}
        </button>
      </div>
      {cameraOn && (
        <video ref={videoRef} className="w-full max-h-40 rounded-lg border border-[var(--bg-border)] object-cover" muted playsInline />
      )}
    </div>
  )
}
