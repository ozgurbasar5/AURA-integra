'use client'

import Link from 'next/link'
import type { NavItemDef } from '@/lib/nav-config'

type Props = {
  item: NavItemDef
  active: boolean
  collapsed: boolean
  liveBadge?: number
  onNavigate?: () => void
}

export default function SidebarNavLink({
  item,
  active,
  collapsed,
  liveBadge = 0,
  onNavigate,
}: Props) {
  const Icon = item.icon

  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      data-tour-nav={item.href}
      className={`sidebar-nav-link group relative flex items-center gap-3 px-3 py-2.5 text-[13px] font-medium transition-all min-h-[44px] lg:min-h-0 ${
        active ? 'sidebar-nav-link--active' : ''
      }`}
      style={!active ? { color: 'var(--sidebar-text)' } : undefined}
      title={collapsed ? item.label : undefined}
    >
      {active && (
        <span className="sidebar-nav-indicator absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" />
      )}
      <Icon
        size={collapsed ? 20 : 17}
        className="shrink-0"
        style={{ color: active ? 'var(--sidebar-active-border)' : 'var(--sidebar-muted)' }}
      />
      {!collapsed && (
        <>
          <span className="truncate flex-1">{item.label}</span>
          {liveBadge > 0 && (
            <span className="min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white px-1 animate-pulse">
              {liveBadge}
            </span>
          )}
        </>
      )}
      {collapsed && liveBadge > 0 && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
      )}
    </Link>
  )
}
