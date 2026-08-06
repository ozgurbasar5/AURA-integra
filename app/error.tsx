'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Global Error]', error)
  }, [error])

  return (
    <div className="flex items-center justify-center min-h-[70vh] p-6 bg-black">
      <div className="max-w-md w-full bg-[#111] p-8 text-center rounded-2xl border border-white/10">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
          <AlertTriangle size={26} className="text-red-500" />
        </div>
        <h2 className="text-white text-lg font-bold">Bir hata oluştu</h2>
        <p className="text-zinc-400 text-sm mt-2 leading-relaxed">
          Uygulama çalışırken beklenmeyen bir sorun oluştu. Sayfayı yenileyebilir veya ana sayfaya dönebilirsiniz.
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
            className="inline-flex items-center justify-center px-5 py-2.5 border border-zinc-800 text-white text-sm font-bold rounded-xl hover:bg-zinc-800 transition-colors"
          >
            Panele Dön
          </Link>
        </div>
      </div>
    </div>
  )
}
