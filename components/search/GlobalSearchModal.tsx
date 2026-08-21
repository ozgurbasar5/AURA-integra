'use client'

import { useState, useEffect, useCallback, useRef, useId } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Wrench, Users, Package, FileText, Loader2, X, ScanBarcode } from 'lucide-react'
import {
  getCameraStream,
  hasBarcodeDetector,
  hasCameraSupport,
  normalizeScanValue,
  startBarcodeDetectorLoop,
  startHtml5QrcodeScanner,
} from '@/lib/barcode-scanner'
import { useIsPhone } from '@/hooks/useMediaQuery'

type SearchResult = {
  type: 'service' | 'customer' | 'stock' | 'invoice'
  id: string
  title: string
  subtitle: string
  href: string
}

const TYPE_META: Record<SearchResult['type'], { label: string; icon: typeof Wrench }> = {
  service: { label: 'Servis', icon: Wrench },
  customer: { label: 'Müşteri', icon: Users },
  stock: { label: 'Stok', icon: Package },
  invoice: { label: 'Fatura', icon: FileText },
}

interface Props {
  open: boolean
  onClose: () => void
}

type ScanMode = 'off' | 'detector' | 'html5'

export default function GlobalSearchModal({ open, onClose }: Props) {
  const router = useRouter()
  const isPhone = useIsPhone()
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const cleanupRef = useRef<(() => void) | (() => Promise<void>) | null>(null)
  const scannerId = useId().replace(/:/g, '')
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [scanMode, setScanMode] = useState<ScanMode>('off')

  const abortControllerRef = useRef<AbortController | null>(null)

  const stopCamera = useCallback(async () => {
    if (cleanupRef.current) {
      const fn = cleanupRef.current
      cleanupRef.current = null
      await Promise.resolve(fn())
    }
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setScanMode('off')
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      abortControllerRef.current?.abort()
      void stopCamera()
    }
  }, [open, stopCamera])

  useEffect(() => () => {
    abortControllerRef.current?.abort()
    void stopCamera()
  }, [stopCamera])

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    const minLen = /^\d{15}$/.test(trimmed.replace(/\D/g, '')) ? 15 : 2
    if (trimmed.length < minLen) {
      setResults([])
      return
    }

    // Önceki bekleyen aramayı iptal et (Stale response protection)
    abortControllerRef.current?.abort()
    const controller = new AbortController()
    abortControllerRef.current = controller

    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, {
        credentials: 'same-origin',
        signal: controller.signal,
      })
      const json = await res.json()
      setResults(json.results ?? [])
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setResults([])
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => void runSearch(query), 300)
    return () => {
      clearTimeout(t)
    }
  }, [query, open, runSearch])

  const applyScan = useCallback((raw: string) => {
    const value = normalizeScanValue(raw)
    setQuery(value)
    void stopCamera()
    void runSearch(value)
  }, [runSearch, stopCamera])

  async function startCamera() {
    if (typeof window === 'undefined') return
    if (!hasCameraSupport()) {
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
        setScanMode('detector')
        cleanupRef.current = startBarcodeDetectorLoop(videoRef.current!, applyScan)
      } else {
        setScanMode('html5')
        await new Promise(r => requestAnimationFrame(r))
        cleanupRef.current = await startHtml5QrcodeScanner(scannerId, applyScan)
      }
    } catch {
      await stopCamera()
      inputRef.current?.focus()
    }
  }

  function selectResult(r: SearchResult) {
    onClose()
    router.push(r.href)
  }

  if (!open) return null

  const digits = query.replace(/\D/g, '')
  const minHint = digits.length >= 14 ? 15 : 2

  return (
    <div className={`fixed inset-0 z-[100] flex ${isPhone ? 'flex-col' : 'items-start justify-center pt-[12vh]'} px-0 sm:px-4 safe-top`}>
      <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-label="Kapat" />
      <div className={`relative w-full bg-[var(--bg-card)] border border-[var(--bg-border)] shadow-2xl overflow-hidden ${
        isPhone ? 'h-full rounded-none flex flex-col' : 'max-w-xl rounded-2xl'
      }`}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--bg-border)] safe-top shrink-0">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="IMEI, barkod, servis no, müşteri…"
            className="flex-1 bg-transparent outline-none text-sm text-[var(--text-primary)] placeholder:text-slate-400"
            onKeyDown={e => {
              if (e.key === 'Escape') onClose()
              if (e.key === 'Enter' && results[0]) selectResult(results[0])
            }}
          />
          <button
            type="button"
            onClick={scanMode !== 'off' ? () => void stopCamera() : () => void startCamera()}
            className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-lg hover:bg-[var(--bg-muted)] text-slate-400"
            title="IMEI / barkod tara"
            aria-label="IMEI / barkod tara"
          >
            <ScanBarcode size={16} />
          </button>
          {loading && <Loader2 size={16} className="animate-spin text-sky-500" />}
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-muted)] text-slate-400">
            <X size={16} />
          </button>
        </div>

        {scanMode === 'detector' && (
          <video ref={videoRef} className="w-full max-h-48 sm:max-h-36 object-cover border-b border-[var(--bg-border)] shrink-0" muted playsInline />
        )}

        {scanMode === 'html5' && (
          <div
            id={scannerId}
            className="w-full shrink-0 overflow-hidden border-b border-[var(--bg-border)] [&_video]:!object-cover"
          />
        )}

        <div className={`overflow-y-auto ${isPhone ? 'flex-1' : 'max-h-[50vh]'}`}>
          {query.trim().length < minHint ? (
            <p className="px-4 py-8 text-center text-xs text-slate-400">
              En az {minHint} karakter girin · 15 haneli IMEI desteklenir · Ctrl+K
            </p>
          ) : results.length === 0 && !loading ? (
            <p className="px-4 py-8 text-center text-sm text-slate-500">Sonuç bulunamadı</p>
          ) : (
            <ul className="py-2">
              {results.map(r => {
                const meta = TYPE_META[r.type]
                const Icon = meta.icon
                return (
                  <li key={`${r.type}-${r.id}`}>
                    <button
                      type="button"
                      onClick={() => selectResult(r)}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-muted)] text-left transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center shrink-0">
                        <Icon size={15} className="text-sky-500" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{r.title}</p>
                        <p className="text-xs text-slate-400 truncate">{r.subtitle}</p>
                      </div>
                      <span className="text-[10px] font-bold uppercase text-slate-400 shrink-0">{meta.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  )
}

export function useGlobalSearchShortcut(onOpen: () => void) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        onOpen()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onOpen])
}
