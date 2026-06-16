'use client'

import { ChevronDown } from 'lucide-react'
import type { NavItemDef, NavSection } from '@/lib/nav-config'
import SidebarNavLink from '@/components/layout/SidebarNavLink'

type Props = {
  section: NavSection
  collapsed: boolean
  expanded: boolean
  onToggle: () => void
  isActivePath: (href: string) => boolean
  getLiveBadge: (href: string) => number
  onNavigate?: () => void
  hasActiveChild: boolean
}

export default function SidebarCategory({
  section,
  collapsed,
  expanded,
  onToggle,
  isActivePath,
  getLiveBadge,
  onNavigate,
  hasActiveChild,
}: Props) {
  const Icon = section.icon

  if (!section.collapsible || collapsed) {
    return (
      <div className="mb-1">
        {!collapsed && !section.collapsible && section.id !== 'ana' && (
          <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            {section.label}
          </p>
        )}
        {collapsed && section.id !== 'ana' && <div className="h-px bg-white/5 my-2 mx-2" />}
        <div className="space-y-0.5">
          {section.items.map(item => (
            <SidebarNavLink
              key={item.href}
              item={item}
              active={isActivePath(item.href)}
              collapsed={collapsed}
              liveBadge={getLiveBadge(item.href)}
              onNavigate={onNavigate}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mb-1 sidebar-category">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={`sidebar-category-trigger w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all min-h-[44px] lg:min-h-0 ${
          hasActiveChild
            ? 'text-white bg-white/5'
            : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Icon size={17} className={`shrink-0 ${hasActiveChild ? 'text-sky-400' : 'text-slate-500'}`} />
        <span className="truncate flex-1 text-left">{section.label}</span>
        <ChevronDown
          size={15}
          className={`sidebar-category-chevron shrink-0 text-slate-500 transition-transform duration-200 ${
            expanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div
        className={`sidebar-category-panel grid transition-[grid-template-rows] duration-200 ${
          expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-0.5 pt-0.5 pl-1 sidebar-category-items">
            {section.items.map((item: NavItemDef, idx) => (
              <div
                key={item.href}
                className="sidebar-category-item"
                style={{ '--item-index': String(idx) } as Record<string, string>}
              >
                <SidebarNavLink
                  item={item}
                  active={isActivePath(item.href)}
                  collapsed={false}
                  liveBadge={getLiveBadge(item.href)}
                  onNavigate={onNavigate}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
