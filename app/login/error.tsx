'use client'

export default function LoginError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-8 text-center space-y-4 shadow-sm">
        <h1 className="text-slate-900 text-xl font-bold">Giriş sayfası yüklenemedi</h1>
        <p className="text-slate-500 text-sm">{error.message || 'Beklenmeyen hata'}</p>
        <div className="flex flex-col gap-2 pt-2">
          <button
            onClick={reset}
            className="px-4 py-2 bg-sky-600 text-white rounded-lg font-semibold text-sm hover:bg-sky-700"
          >
            Tekrar dene
          </button>
          <a href="/login?cikis=1" className="text-slate-500 text-sm hover:text-slate-900">
            Oturumu kapat → Yeniden giriş
          </a>
        </div>
      </div>
    </div>
  )
}
