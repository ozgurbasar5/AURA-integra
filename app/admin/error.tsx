'use client'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-6">
      <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-2xl p-8 text-center space-y-4">
        <h1 className="text-white text-xl font-bold">Admin paneli yüklenemedi</h1>
        <p className="text-slate-400 text-sm">{error.message || 'Beklenmeyen hata'}</p>
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={reset}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg font-semibold text-sm hover:bg-sky-700"
          >
            Tekrar dene
          </button>
          <a href="/login?cikis=1" className="text-slate-400 text-sm hover:text-white">
            Çıkış yap → Giriş
          </a>
        </div>
      </div>
    </div>
  )
}
