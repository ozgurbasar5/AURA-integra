'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Building2, CreditCard, Settings,
  Zap, ClipboardList, LogOut, Users, BookOpen, Menu, X,
  Shield, Webhook, Clock,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { TOUR_PREPARE_EVENT, TOUR_MOBILE_SIDEBAR_EVENT } from '@/lib/onboarding/tour-targets'

const SECTIONS = [
  {
    id: 'buyume',
    label: 'Büyüme',
    items: [
      { href: '/admin/basvurular', icon: ClipboardList, label: 'Başvurular' },
      { href: '/admin/bayiler', icon: Building2, label: 'Bayi Yönetimi' },
      { href: '/admin/bayiler/kullanicilari', icon: Users, label: 'Bayi Kullanıcıları' },
    ],
  },
  {
    id: 'gelir',
    label: 'Gelir',
    items: [
      { href: '/admin/odemeler', icon: CreditCard, label: 'Ödemeler' },
    ],
  },
  {
    id: 'operasyon',
    label: 'Operasyon',
    items: [
      { href: '/admin/operasyon/audit', icon: Shield, label: 'Denetim Kayıtları' },
      { href: '/admin/operasyon/webhook', icon: Webhook, label: 'Webhook Hataları' },
      { href: '/admin/operasyon/cron', icon: Clock, label: 'Zamanlanmış Görevler' },
    ],
  },
  {
    id: 'sistem',
    label: 'Sistem',
    items: [
      { href: '/admin/dokumantasyon', icon: BookOpen, label: 'Dokümantasyon' },
      { href: '/admin/ayarlar', icon: Settings, label: 'Ayarlar' },
    ],
  },
]

interface Props {
  user: { email: string; full_name: string }
}

export default function AdminSidebar({ user }: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const supabase = createClient()
  const initials = (user.full_name || user.email).charAt(0).toUpperCase()

  useEffect(() => {
    const onPrepare = () => setMobileOpen(true)
    const onMobile = () => setMobileOpen(true)
    window.addEventListener(TOUR_PREPARE_EVENT, onPrepare)
    window.addEventListener(TOUR_MOBILE_SIDEBAR_EVENT, onMobile)
    return () => {
      window.removeEventListener(TOUR_PREPARE_EVENT, onPrepare)
      window.removeEventListener(TOUR_MOBILE_SIDEBAR_EVENT, onMobile)
    }
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <>
        <Link
          href="/admin"
          onClick={onNavigate}
          data-tour-nav="/admin"
          className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all min-h-[44px] lg:min-h-0 mb-2 ${
            pathname === '/admin' ? 'bg-sky-500/15 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
          }`}
        >
          <LayoutDashboard size={17} className={pathname === '/admin' ? 'text-sky-400' : 'text-slate-500'} />
          Komuta Merkezi
        </Link>
        {SECTIONS.map(section => (
          <div key={section.id} className="mb-3">
            <p className="px-3 py-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest">{section.label}</p>
            {section.items.map(({ href, icon: Icon, label }) => {
              const active = pathname === href || (href !== '/admin' && pathname.startsWith(href))
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  data-tour-nav={href}
                  className={`relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all min-h-[40px] lg:min-h-0 ${
                    active ? 'bg-sky-500/15 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon size={16} className={active ? 'text-sky-400' : 'text-slate-500'} />
                  {label}
                </Link>
              )
            })}
          </div>
        ))}
      </>
    )
  }

  function SidebarInner({ onNavigate }: { onNavigate?: () => void }) {
    return (
      <div className="flex flex-col h-full safe-top">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-white/5">
          <div className="w-9 h-9 bg-gradient-to-br from-sky-500 to-cyan-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-sky-500/20">
            <Zap size={16} className="text-white" fill="white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-black text-sm tracking-tight">
              AURA <span className="text-sky-400">İntegra</span>
            </p>
            <p className="text-slate-500 text-[10px] font-semibold uppercase tracking-wider">Süper Admin</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <NavLinks onNavigate={onNavigate} />
        </nav>

        <div className="px-3 py-4 border-t border-white/5 space-y-1 safe-bottom">
          <div className="flex items-center gap-3 px-3 py-2 rounded-xl">
            <div className="w-9 h-9 rounded-xl bg-slate-700 flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">{initials}</span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-semibold truncate">{user.full_name || 'Admin'}</p>
              <p className="text-slate-500 text-xs truncate">{user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-xl text-sm text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all min-h-[44px] lg:min-h-0"
          >
            <LogOut size={15} /> Çıkış Yap
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed z-50 p-2.5 rounded-xl bg-slate-900 text-white shadow-lg safe-top"
        style={{ top: 'max(1rem, env(safe-area-inset-top, 0px))', left: 'max(1rem, env(safe-area-inset-left, 0px))' }}
        aria-label="Admin menüsünü aç"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div className="w-[min(280px,100vw)] h-full sidebar-dark shadow-2xl" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white z-10 safe-top" aria-label="Menüyü kapat">
              <X size={18} />
            </button>
            <SidebarInner onNavigate={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      <aside className="no-print hidden lg:flex h-screen w-[252px] flex-shrink-0 flex-col sidebar-dark border-r border-white/5">
        <SidebarInner />
      </aside>
    </>
  )
}
