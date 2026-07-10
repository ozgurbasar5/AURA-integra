'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ClipboardCheck, Wrench, Package, Menu } from 'lucide-react'
import { openMobileSidebar } from '@/lib/mobile-nav-events'
import { useIsMobileNav } from '@/hooks/useMediaQuery'

const TABS: Array<{
  href: string
  label: string
  icon: typeof LayoutDashboard
  exact?: boolean
}> = [
  { href: '/dashboard', label: 'Ana', icon: LayoutDashboard, exact: true },
  { href: '/dashboard/kabul', label: 'Kabul', icon: ClipboardCheck },
  { href: '/dashboard/atolye', label: 'Atölye', icon: Wrench },
  { href: '/dashboard/stok', label: 'Stok', icon: Package },
]

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}

export default function MobileBottomNav() {
  const pathname = usePathname()
  const show = useIsMobileNav()

  if (!show) return null

  return (
    <nav
      className="mobile-bottom-nav lg:hidden no-print"
      aria-label="Hızlı gezinme"
    >
      {TABS.map(tab => {
        const Icon = tab.icon
        const active = isActive(pathname, tab.href, tab.exact)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`mobile-bottom-nav-item ${active ? 'mobile-bottom-nav-item-active' : ''}`}
            aria-current={active ? 'page' : undefined}
          >
            <Icon size={20} strokeWidth={active ? 2.5 : 2} />
            <span>{tab.label}</span>
          </Link>
        )
      })}
      <button
        type="button"
        onClick={openMobileSidebar}
        className="mobile-bottom-nav-item"
        aria-label="Menüyü aç"
      >
        <Menu size={20} />
        <span>Menü</span>
      </button>
    </nav>
  )
}
