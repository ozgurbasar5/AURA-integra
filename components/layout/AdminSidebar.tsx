'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  LayoutDashboard, Building2, CreditCard, Settings,
  Zap, ClipboardList, LogOut, Users, BookOpen,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const NAV = [
  { href: '/admin',                          icon: LayoutDashboard, label: 'Komuta Merkezi' },
  { href: '/admin/bayiler',                  icon: Building2,       label: 'Bayi Yönetimi' },
  { href: '/admin/bayiler/kullanicilari',    icon: Users,           label: 'Bayi Kullanıcıları' },
  { href: '/admin/basvurular',               icon: ClipboardList,   label: 'Başvurular' },
  { href: '/admin/odemeler',                 icon: CreditCard,      label: 'Ödemeler' },
  { href: '/admin/dokumantasyon',            icon: BookOpen,        label: 'Dokümantasyon' },
  { href: '/admin/ayarlar',                  icon: Settings,        label: 'Ayarlar' },
]

interface Props {
  user: { email: string; full_name: string }
}

export default function AdminSidebar({ user }: Props) {
  const pathname = usePathname()
  const supabase = createClient()
  const initials = (user.full_name || user.email).charAt(0).toUpperCase()

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  return (
    <aside className="h-screen w-[252px] flex-shrink-0 flex flex-col sidebar-dark border-r border-white/5">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
        <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-sky-500/20">
          <Zap size={16} className="text-white" fill="white" />
        </div>
        <div>
          <p className="text-white font-black text-sm tracking-tight">
            AURA <span className="text-sky-400">İntegra</span>
          </p>
          <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Süper Admin</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-2 text-[10px] font-bold text-slate-600 uppercase tracking-widest">Yönetim</p>
        {NAV.map(({ href, icon: Icon, label }) => {
          const exact = href === '/admin'
          const active = exact ? pathname === href : pathname.startsWith(href)
          return (
            <Link key={href} href={href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                active ? 'bg-sky-500/15 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`}
            >
              {active && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sky-400 rounded-r-full" />}
              <Icon size={17} className={active ? 'text-sky-400' : 'text-slate-500'} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-white/5 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
          <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white text-sm font-semibold truncate">{user.full_name || 'Admin'}</p>
            <p className="text-slate-500 text-xs truncate">{user.email}</p>
          </div>
        </div>
        <button type="button" onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all">
          <LogOut size={15} /> Çıkış Yap
        </button>
      </div>
    </aside>
  )
}
