'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard]', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-6">
      <div className="max-w-md w-full surface p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={26} className="text-red-500" />
        </div>
        <h2 className="text-[var(--text-primary)] text-lg font-bold">Bir hata oluştu</h2>
        <p className="text-[var(--text-secondary)] text-sm mt-2 leading-relaxed">
          Sayfa yüklenirken beklenmeyen bir sorun oluştu. Tekrar deneyebilir veya panele dönebilirsiniz.
        </p>
        <div className="flex flex-col sm:flex-row gap-2 mt-6 justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-600 text-white text-sm font-bold rounded-xl hover:bg-sky-700 transition-colors"
          >
            <RefreshCw size={14} /> Tekrar Dene
          </button>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center px-5 py-2.5 border border-[var(--bg-border)] text-sm font-bold rounded-xl hover:bg-[var(--bg-muted)] transition-colors"
          >
            Panele Dön
          </Link>
        </div>
      </div>
    </div>
  )
}
