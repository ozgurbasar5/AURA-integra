'use client'

import Link from 'next/link'
import { ArrowLeft, Key, BookOpen, Copy } from 'lucide-react'
import { toast } from 'sonner'

const ENDPOINTS = [
  {
    method: 'GET',
    path: '/api/v1/orders',
    desc: 'Servis kayıtlarını listeler (son 100)',
    headers: ['X-API-Key: {anahtarınız}'],
    example: `curl -H "X-API-Key: YOUR_KEY" https://integra.aurabilisim.net/api/v1/orders`,
  },
  {
    method: 'GET',
    path: '/api/public/takip',
    desc: 'Müşteri takip sorgusu (shop + q parametreleri)',
    headers: [],
    example: `curl "https://integra.aurabilisim.net/api/public/takip?shop=bayi-slug&q=SRV-1234"`,
  },
]

export default function ApiDocsPage() {
  return (
    <div className="space-y-6 pb-10 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/ayarlar" className="btn-ghost btn-sm"><ArrowLeft size={16} /></Link>
        <div>
          <h1 className="text-xl font-black text-[var(--text-primary)] flex items-center gap-2">
            <BookOpen size={20} className="text-sky-600" /> API Dokümantasyonu
          </h1>
          <p className="text-sm text-[var(--text-muted)]">REST entegrasyonu — API anahtarı Ayarlar → Entegrasyonlar</p>
        </div>
      </div>

      <div className="card p-5 border border-sky-500/20 bg-sky-500/5">
        <p className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2 mb-2">
          <Key size={16} className="text-sky-600" /> Kimlik doğrulama
        </p>
        <p className="text-sm text-[var(--text-secondary)]">
          Bayi API anahtarınızı <Link href="/dashboard/ayarlar" className="text-sky-600 font-semibold hover:underline">Ayarlar</Link> sayfasından oluşturun.
          Her istekte <code className="text-xs bg-[var(--bg-muted)] px-1 rounded">X-API-Key</code> header gönderin.
        </p>
      </div>

      {ENDPOINTS.map(ep => (
        <div key={ep.path} className="card p-5 space-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-700">{ep.method}</span>
            <code className="text-sm font-mono text-[var(--text-primary)]">{ep.path}</code>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">{ep.desc}</p>
          {ep.headers.length > 0 && (
            <div className="text-xs text-[var(--text-muted)]">
              {ep.headers.map(h => <div key={h} className="font-mono">{h}</div>)}
            </div>
          )}
          <div className="relative">
            <pre className="text-xs bg-[var(--bg-muted)] p-3 rounded-lg overflow-x-auto font-mono text-[var(--text-secondary)]">{ep.example}</pre>
            <button
              type="button"
              className="absolute top-2 right-2 btn-ghost btn-sm p-1"
              onClick={() => { navigator.clipboard?.writeText(ep.example); toast.success('Kopyalandı') }}
            >
              <Copy size={12} />
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
