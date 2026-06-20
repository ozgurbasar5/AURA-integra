'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Wrench, Users, Package, FileText, Loader2, X, ScanBarcode } from 'lucide-react'

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

export default function GlobalSearchModal({ open, onClose }: Props) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [cameraOn, setCameraOn] = useState(false)

  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setTimeout(() => inputRef.current?.focus(), 50)
    } else {
      stopCamera()
    }
  }, [open])

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      streamRef.current?.getTracks().forEach(t => t.stop())
    }
  }, [])

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    const minLen = /^\d{15}$/.test(trimmed.replace(/\D/g, '')) ? 15 : 2
    if (trimmed.length < minLen) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`, { credentials: 'same-origin' })
      const json = await res.json()
      setResults(json.results ?? [])
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!open) return
    const t = setTimeout(() => void runSearch(query), 300)
    return () => clearTimeout(t)
  }, [query, open, runSearch])

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    setCameraOn(false)
  }

  async function startCamera() {
    if (typeof window === 'undefined') return
    const Detector = (window as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => {
        detect: (src: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>
      }
    }).BarcodeDetector

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
          const raw = codes[0]?.rawValue
          if (raw) {
            const value = raw.replace(/\D/g, '').length >= 15 ? raw.replace(/\D/g, '').slice(0, 15) : raw.trim()
            setQuery(value)
            stopCamera()
            void runSearch(value)
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

  function selectResult(r: SearchResult) {
    onClose()
    router.push(r.href)
  }

  if (!open) return null

  const digits = query.replace(/\D/g, '')
  const minHint = digits.length >= 14 ? 15 : 2

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] px-4">
      <button type="button" className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-label="Kapat" />
      <div className="relative w-full max-w-xl bg-[var(--bg-card)] border border-[var(--bg-border)] rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--bg-border)]">
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
            onClick={cameraOn ? stopCamera : startCamera}
            className="p-1.5 rounded-lg hover:bg-[var(--bg-muted)] text-slate-400"
            title="IMEI / barkod tara"
          >
            <ScanBarcode size={16} />
          </button>
          {loading && <Loader2 size={16} className="animate-spin text-sky-500" />}
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-muted)] text-slate-400">
            <X size={16} />
          </button>
        </div>

        {cameraOn && (
          <video ref={videoRef} className="w-full max-h-36 object-cover border-b border-[var(--bg-border)]" muted playsInline />
        )}

        <div className="max-h-[50vh] overflow-y-auto">
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
