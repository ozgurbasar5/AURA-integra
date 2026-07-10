'use client'

import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ScanBarcode } from 'lucide-react'
import {
  getCameraStream,
  hasBarcodeDetector,
  hasCameraSupport,
  startBarcodeDetectorLoop,
  startHtml5QrcodeScanner,
} from '@/lib/barcode-scanner'

type Props = {
  onScan: (barcode: string) => void
  placeholder?: string
}

type ScanMode = 'off' | 'detector' | 'html5'

/** Barkod okuyucu klavye emülasyonu + kamera (BarcodeDetector veya html5-qrcode) */
export default function BarcodeScanField({ onScan, placeholder = 'Barkod okutun veya yazın…' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cleanupRef = useRef<(() => void) | (() => Promise<void>) | null>(null)
  const [mode, setMode] = useState<ScanMode>('off')
  const [cameraError, setCameraError] = useState<string | null>(null)
  const scannerId = useId().replace(/:/g, '')

  const handleValue = useCallback((raw: string) => {
    const code = raw.trim()
    if (code.length >= 4) onScan(code)
  }, [onScan])

  const stopCamera = useCallback(async () => {
    if (cleanupRef.current) {
      const fn = cleanupRef.current
      cleanupRef.current = null
      await Promise.resolve(typeof fn === 'function' ? fn() : undefined)
    }
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setMode('off')
  }, [])

  useEffect(() => () => { void stopCamera() }, [stopCamera])

  async function startCamera() {
    if (typeof window === 'undefined') return
    setCameraError(null)

    if (!hasCameraSupport()) {
      setCameraError('Bu cihazda kamera desteklenmiyor.')
      inputRef.current?.focus()
      return
    }

    await stopCamera()

    try {
      if (hasBarcodeDetector()) {
        const stream = await getCameraStream()
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setMode('detector')
        cleanupRef.current = startBarcodeDetectorLoop(videoRef.current!, code => {
          handleValue(code)
          void stopCamera()
        })
      } else {
        setMode('html5')
        // Wait for DOM to render scanner container
        await new Promise(r => requestAnimationFrame(r))
        cleanupRef.current = await startHtml5QrcodeScanner(scannerId, code => {
          handleValue(code)
          void stopCamera()
        })
      }
    } catch {
      setCameraError('Kamera açılamadı. İzin verdiğinizden emin olun.')
      await stopCamera()
      inputRef.current?.focus()
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          ref={inputRef}
          className="input flex-1 font-mono min-h-[44px]"
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
        <button
          type="button"
          className="btn-secondary shrink-0 min-h-[44px] min-w-[44px]"
          onClick={mode !== 'off' ? () => void stopCamera() : () => void startCamera()}
          aria-label={mode !== 'off' ? 'Kamerayı kapat' : 'Kamera ile tara'}
        >
          <ScanBarcode size={16} />
          <span className="hidden sm:inline">{mode !== 'off' ? 'Kapat' : 'Kamera'}</span>
        </button>
      </div>

      {cameraError && (
        <p className="text-xs text-amber-600">{cameraError}</p>
      )}

      {mode === 'detector' && (
        <video
          ref={videoRef}
          className="w-full max-h-48 rounded-lg border border-[var(--bg-border)] object-cover"
          muted
          playsInline
        />
      )}

      {mode === 'html5' && (
        <div
          id={scannerId}
          className="w-full overflow-hidden rounded-lg border border-[var(--bg-border)] [&_video]:!rounded-lg [&_video]:!object-cover"
        />
      )}
    </div>
  )
}
