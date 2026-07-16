'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

/** Sticky admin arama — Bayiler sayfasına q parametresi ile yönlendirir */
export default function AdminTopBar() {
  const router = useRouter()
  const [q, setQ] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    const term = q.trim()
    if (!term) {
      router.push('/admin/bayiler')
      return
    }
    router.push(`/admin/bayiler?q=${encodeURIComponent(term)}`)
  }

  return (
    <div className="sticky top-0 z-30 border-b border-white/5 bg-[var(--bg-base)]/90 backdrop-blur-md px-4 lg:px-6 py-2.5">
      <form onSubmit={onSubmit} className="flex items-center gap-2 max-w-xl ml-12 lg:ml-0">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="search"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Bayi adı veya telefon ara…"
            className="w-full pl-9 pr-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-sky-500/50"
            aria-label="Bayi ara"
          />
        </div>
        <button
          type="submit"
          className="px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold shrink-0"
        >
          Bul
        </button>
      </form>
    </div>
  )
}
