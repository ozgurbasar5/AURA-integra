import Link from 'next/link'
import { checkSupabaseEnv, EXPECTED_PROJECT_REF } from '@/lib/supabase/validate-env'

export const metadata = { title: 'Sistem Durumu — AURA İntegra' }

export default async function DurumPage() {
  const env = checkSupabaseEnv()
  let dbStatus: string | number = '—'
  let dbMs = 0

  if (env.ok && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const t0 = Date.now()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/subscription_plans?select=id&limit=1`,
        {
          headers: {
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
          },
          signal: AbortSignal.timeout(8000),
          cache: 'no-store',
        }
      )
      dbMs = Date.now() - t0
      dbStatus = res.status
    } catch {
      dbStatus = 'zaman aşımı'
    }
  }

  const allOk = env.ok && dbStatus !== 'zaman aşımı' && dbStatus !== '—'

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-lg mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">Sistem Durumu</h1>

        <div className={`rounded-xl px-4 py-3 font-semibold ${allOk ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-900'}`}>
          {allOk ? '✓ Supabase bağlantısı çalışıyor' : '⚠ Bağlantı sorunu olabilir'}
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3 text-sm">
          <p><span className="text-slate-500">Proje ref:</span> <code className="bg-slate-100 px-1 rounded">{env.urlRef}</code></p>
          <p><span className="text-slate-500">Beklenen:</span> <code className="bg-slate-100 px-1 rounded">{EXPECTED_PROJECT_REF}</code></p>
          <p><span className="text-slate-500">Eşleşme:</span> {env.urlRef === EXPECTED_PROJECT_REF ? '✓' : '✗'}</p>
          <p><span className="text-slate-500">Veritabanı testi:</span> {String(dbStatus)} {dbMs > 0 && `(${dbMs}ms)`}</p>
          <p className="text-slate-600 border-t border-slate-100 pt-3">{env.message}</p>
        </div>

        <div className="flex flex-col gap-2 text-sm font-medium">
          <Link href="/login?cikis=1" className="text-blue-600 hover:underline">1. Oturumu kapat</Link>
          <Link href="/login" className="text-blue-600 hover:underline">2. Giriş sayfası</Link>
          <Link href="/admin" className="text-blue-600 hover:underline">3. Admin paneli</Link>
          <a href="/api/health/supabase?ping=1&view=1" className="text-blue-600 hover:underline">Detaylı API testi (HTML)</a>
        </div>
      </div>
    </div>
  )
}
