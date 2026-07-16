'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import { openMobileSidebar } from '@/lib/mobile-nav-events'
import { useIsMobileNav } from '@/hooks/useMediaQuery'
import { getMobileBottomTabsForRole, isMobileNavActive } from '@/lib/mobile-nav-tabs'
import { useUserRole } from '@/lib/role-context'

export default function MobileBottomNav() {
  const pathname = usePathname()
  const show = useIsMobileNav()
  const { role } = useUserRole()
  const tabs = getMobileBottomTabsForRole(role)

  if (!show) return null

  return (
    <nav
      data-testid="mobile-bottom-nav"
      className="mobile-bottom-nav lg:hidden no-print"
      aria-label="Hızlı gezinme"
    >
      {tabs.map(tab => {
        const Icon = tab.icon
        const active = isMobileNavActive(pathname, tab.href, tab.exact)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`mobile-bottom-nav-item ${active ? 'mobile-bottom-nav-item-active' : ''}`}
            aria-current={active ? 'page' : undefined}
            data-testid={tab.testId}
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
        data-testid="mobile-nav-menu"
      >
        <Menu size={20} />
        <span>Menü</span>
      </button>
    </nav>
  )
}
