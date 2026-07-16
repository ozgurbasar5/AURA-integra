'use client'

import { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

/** beforeinstallprompt — Ana Ekrana Ekle (Chrome Android) */
export default function PwaInstallBanner() {
  const [deferred, setDeferred] = useState<{ prompt: () => Promise<void> } | null>(null)
  const [dismissed, setDismissed] = useState(true)

  useEffect(() => {
    if (typeof window === 'undefined') return
    try {
      if (localStorage.getItem('aura_pwa_install_dismissed') === '1') return
    } catch { /* ignore */ }
    setDismissed(false)

    const handler = (e: Event) => {
      e.preventDefault()
      const ev = e as Event & { prompt: () => Promise<void> }
      setDeferred({ prompt: () => ev.prompt() })
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  if (dismissed || !deferred) return null

  return (
    <div
      data-testid="pwa-install-banner"
      className="lg:hidden fixed inset-x-3 z-[45] rounded-2xl bg-sky-700 text-white shadow-lg p-3 flex items-center gap-3"
      style={{ bottom: 'calc(3.75rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <Download size={18} className="shrink-0 opacity-90" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold">AURA&apos;yı ana ekrana ekle</p>
        <p className="text-[10px] text-sky-100/80">Hızlı erişim · çevrimdışı kabuk</p>
      </div>
      <button
        type="button"
        className="px-3 py-2 rounded-xl bg-white text-sky-800 text-xs font-bold min-h-[40px]"
        onClick={() => void deferred.prompt()}
      >
        Yükle
      </button>
      <button
        type="button"
        aria-label="Kapat"
        className="p-2 rounded-lg hover:bg-white/10 min-h-[40px] min-w-[40px]"
        onClick={() => {
          setDismissed(true)
          try { localStorage.setItem('aura_pwa_install_dismissed', '1') } catch { /* ignore */ }
        }}
      >
        <X size={16} />
      </button>
    </div>
  )
}
