'use client'

import ColorModeToggle from '@/components/ColorModeToggle'
import { useUserRole } from '@/lib/role-context'
import { Bell } from 'lucide-react'
import Link from 'next/link'

interface Props {
  companyName: string
}

export default function DashboardHeader({ companyName }: Props) {
  const { homeLabel, role } = useUserRole()

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 md:px-6 py-3 border-b border-[var(--bg-border)] bg-[var(--bg-card)]/90 backdrop-blur-md no-print">
      <div className="min-w-0 pl-10 lg:pl-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-sky-500">{homeLabel}</p>
        <h2 className="text-sm font-bold text-[var(--text-primary)] truncate">{companyName}</h2>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <ColorModeToggle />
        <Link
          href="/dashboard/bildirimler"
          className="w-9 h-9 flex items-center justify-center rounded-xl border border-[var(--bg-border)] text-[var(--text-secondary)] hover:bg-[var(--bg-muted)] transition-colors"
          title="Bildirimler"
        >
          <Bell size={17} />
        </Link>
        <span className="hidden sm:inline text-[10px] font-bold px-2 py-1 rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-300 capitalize">
          {role.replace('_', ' ')}
        </span>
      </div>
    </header>
  )
}
