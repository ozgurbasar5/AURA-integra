'use client'

import Link from 'next/link'
import { Sparkles, ChevronRight } from 'lucide-react'
import { useYenilikUnread } from '@/lib/use-yenilik-unread'

export default function YenilikBanner() {
  const { unread, latestTitle } = useYenilikUnread()
  if (unread <= 0) return null

  return (
    <Link
      href="/dashboard/yenilikler"
      className="flex items-center gap-3 rounded-2xl border border-sky-200/70 bg-gradient-to-r from-sky-50 to-cyan-50 px-4 py-3.5 hover:from-sky-100/80 hover:to-cyan-50 transition-colors dark:from-sky-950/40 dark:to-cyan-950/30 dark:border-sky-800/50"
    >
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500 text-white shadow-sm shadow-sky-500/30">
        <Sparkles size={18} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {unread} yeni yenilik
          </span>
          <span className="rounded-full bg-sky-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
            Yeni
          </span>
        </span>
        {latestTitle && (
          <span className="mt-0.5 block truncate text-xs text-slate-500 dark:text-slate-400">
            {latestTitle}
          </span>
        )}
      </span>
      <ChevronRight size={16} className="shrink-0 text-sky-500" />
    </Link>
  )
}
