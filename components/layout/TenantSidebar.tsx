'use client'

import { usePathname, useRouter } from 'next/navigation'
import { useState, useEffect, useMemo, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, LogOut, Search, Menu, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { purgeTenantStore, setActiveTenantId } from '@/lib/store'
import { PLAN_LEVEL_LABELS, type PlanLevel } from '@/lib/plan-tiers'
import { isOwnerRole } from '@/lib/role-access'
import { normalizeTenantRole } from '@/lib/tenant-roles'
import Logo from '@/components/Logo'
import ColorModeToggle from '@/components/ColorModeToggle'
import { getBusinessBranding } from '@/lib/business-branding'
import { onStoreChange, getStore } from '@/lib/store'
import {
  buildClassicSections,
  buildCategorizedSections,
  findSectionForPath,
  getSidebarState,
  saveSidebarState,
  type NavSection,
} from '@/lib/nav-config'
import SidebarCategory from '@/components/layout/SidebarCategory'
import SidebarNavLink from '@/components/layout/SidebarNavLink'
import { useViewOptions } from '@/hooks/useViewOptions'
import { TOUR_PREPARE_EVENT, TOUR_MOBILE_SIDEBAR_EVENT } from '@/lib/onboarding/tour-targets'

const ROLE_LABELS: Record<string, { label: string; bg: string }> = {
  super_admin:  { label: 'Süper Admin', bg: 'bg-red-500/20 text-red-300' },
  tenant_admin: { label: 'Sahip',        bg: 'bg-sky-500/20 text-sky-300' },
  admin:        { label: 'Yönetici',     bg: 'bg-sky-500/20 text-sky-300' },
  mudur:        { label: 'Müdür',        bg: 'bg-sky-500/20 text-sky-300' },
  teknisyen:    { label: 'Teknisyen',    bg: 'bg-cyan-500/20 text-cyan-300' },
  satis:        { label: 'Satış',        bg: 'bg-emerald-500/20 text-emerald-300' },
  muhasebe:     { label: 'Muhasebe',     bg: 'bg-amber-500/20 text-amber-300' },
  kasiyer:      { label: 'Kasiyer',      bg: 'bg-orange-500/20 text-orange-300' },
  viewer:       { label: 'Görüntüleyici', bg: 'bg-slate-500/20 text-slate-300' },
  default:      { label: 'Kullanıcı',    bg: 'bg-slate-500/20 text-slate-300' },
}

interface Props {
  tenant: {
    company_name: string
    plan_name: string
    plan_level: PlanLevel
    subscription_end?: string
    status?: string
  }
  user: { full_name: string; email: string; role: string }
  onOpenSearch?: () => void
}

export default function TenantSidebar({ tenant, user, onOpenSearch }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const { opts: viewOpts } = useViewOptions()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<string[]>([])
  const [brand, setBrand] = useState({ shopName: '', shopLogo: null as string | null })
  const [badges, setBadges] = useState({ stok: 0, atolye: 0 })
  const supabase = createClient()

  useEffect(() => {
    const persisted = getSidebarState()
    if (viewOpts.sidebarPersistCollapse && persisted.collapsed) {
      setCollapsed(true)
    }
    if (persisted.expandedCategories.length > 0) {
      setExpandedCategories(persisted.expandedCategories)
    }
  }, [viewOpts.sidebarPersistCollapse])

  useEffect(() => {
    const updateBadges = () => {
      try {
        const store = getStore()
        setBadges({
          stok: store.stock.filter(s => s.stock_qty <= s.min_stock).length,
          atolye: store.serviceOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length,
        })
      } catch { /* store okuma hatası sidebar'ı çökertmesin */ }
    }
    setBrand(getBusinessBranding())
    updateBadges()
    return onStoreChange(mod => {
      if (mod === 'settings' || mod === 'seed') setBrand(getBusinessBranding())
      if (['stock', 'service', 'seed'].includes(mod)) updateBadges()
    })
  }, [])

  const planLevel = tenant.plan_level ?? 1
  const normalizedRole = normalizeTenantRole(user.role)
  const roleInfo = ROLE_LABELS[normalizedRole] || ROLE_LABELS.default
  const initials = user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const sections = useMemo(() => {
    if (viewOpts.sidebarMode === 'categorized') {
      return buildCategorizedSections(normalizedRole, planLevel)
    }
    return buildClassicSections(normalizedRole, planLevel)
  }, [viewOpts.sidebarMode, normalizedRole, planLevel])

  useEffect(() => {
    const onPrepareTour = () => {
      setCollapsed(false)
      setMobileOpen(false)
      setExpandedCategories(sections.map(s => s.id))
    }
    const onMobileTour = () => setMobileOpen(true)
    window.addEventListener(TOUR_PREPARE_EVENT, onPrepareTour)
    window.addEventListener(TOUR_MOBILE_SIDEBAR_EVENT, onMobileTour)
    return () => {
      window.removeEventListener(TOUR_PREPARE_EVENT, onPrepareTour)
      window.removeEventListener(TOUR_MOBILE_SIDEBAR_EVENT, onMobileTour)
    }
  }, [sections])

  const activeSectionId = useMemo(
    () => findSectionForPath(sections, pathname),
    [sections, pathname],
  )

  useEffect(() => {
    if (!activeSectionId) return
    setExpandedCategories(prev => {
      if (prev.includes(activeSectionId)) return prev
      return [...prev, activeSectionId]
    })
  }, [activeSectionId])

  useEffect(() => {
    if (viewOpts.sidebarPersistCollapse) {
      saveSidebarState({ expandedCategories, collapsed })
    } else {
      saveSidebarState({ expandedCategories, collapsed: false })
    }
  }, [expandedCategories, collapsed, viewOpts.sidebarPersistCollapse])

  const toggleCategory = useCallback((id: string) => {
    setExpandedCategories(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    )
  }, [])

  const handleCollapseToggle = () => {
    setCollapsed(c => !c)
  }

  const handleLogout = async () => {
    purgeTenantStore()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  function getLiveBadge(href: string): number {
    if (href === '/dashboard/stok') return badges.stok
    if (href === '/dashboard/atolye') return badges.atolye
    return 0
  }

  function sectionHasActiveChild(section: NavSection): boolean {
    return section.items.some(i => isActive(i.href))
  }

  function renderClassicSection(section: NavSection) {
    const headerLabel = viewOpts.sidebarMode === 'classic'
      ? (section.id === 'ana' ? 'ANA' : section.label.toUpperCase())
      : section.label

    return (
      <div key={section.id} className="mb-1">
        {!collapsed && (
          <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest">
            {headerLabel}
          </p>
        )}
        {collapsed && section.id !== 'ana' && <div className="h-px bg-white/5 my-2 mx-2" />}
        <div className="space-y-0.5">
          {section.items.map(item => (
            <SidebarNavLink
              key={item.href}
              item={item}
              active={isActive(item.href)}
              collapsed={collapsed}
              liveBadge={getLiveBadge(item.href)}
              onNavigate={() => setMobileOpen(false)}
            />
          ))}
        </div>
      </div>
    )
  }

  function renderNav() {
    if (viewOpts.sidebarMode === 'categorized') {
      return sections.map(section => {
        if (!section.collapsible) {
          return (
            <div key={section.id} className="mb-1 space-y-0.5">
              {section.items.map(item => (
                <SidebarNavLink
                  key={item.href}
                  item={item}
                  active={isActive(item.href)}
                  collapsed={collapsed}
                  liveBadge={getLiveBadge(item.href)}
                  onNavigate={() => setMobileOpen(false)}
                />
              ))}
            </div>
          )
        }
        return (
          <SidebarCategory
            key={section.id}
            section={section}
            collapsed={collapsed}
            expanded={expandedCategories.includes(section.id)}
            onToggle={() => toggleCategory(section.id)}
            isActivePath={isActive}
            getLiveBadge={getLiveBadge}
            onNavigate={() => setMobileOpen(false)}
            hasActiveChild={sectionHasActiveChild(section)}
          />
        )
      })
    }
    return sections.map(renderClassicSection)
  }

  function SidebarContent() {
    return (
      <div className="flex flex-col h-full">
        <div className={`px-4 py-5 flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
          <Logo
            showText={!collapsed}
            size={collapsed ? 'sm' : 'md'}
            variant="light"
            shopName={brand.shopName}
            shopLogo={brand.shopLogo}
          />
          {!collapsed && !isOwnerRole(normalizedRole) && (
            <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 uppercase">
              {roleInfo.label}
            </span>
          )}
        </div>
        {!collapsed && isOwnerRole(normalizedRole) && (
          <p className="px-4 -mt-2 mb-2 text-[10px] text-slate-500 truncate">
            {tenant.company_name} · {PLAN_LEVEL_LABELS[planLevel]}
          </p>
        )}

        {!collapsed && (
          <div className="px-3 mb-3">
            <button
              type="button"
              onClick={onOpenSearch}
              data-tour="servis-arama"
              className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-500 text-xs hover:bg-white/10 hover:text-slate-300 transition-colors text-left"
            >
              <Search size={13} />
              <span className="flex-1">Hızlı arama...</span>
              <kbd className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-slate-400">Ctrl+K</kbd>
            </button>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 scrollbar-hide">
          {renderNav()}
        </nav>

        <div className="px-3 py-2 hidden lg:flex flex-col gap-2">
          {!collapsed && <ColorModeToggle compact />}
          <button
            type="button"
            onClick={handleCollapseToggle}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all text-xs"
          >
            {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> <span>Daralt</span></>}
          </button>
        </div>

        <div className={`border-t border-white/5 p-3 ${collapsed ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center ${collapsed ? '' : 'gap-3'}`}>
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {initials}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{user.full_name}</p>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${roleInfo.bg}`}>
                    {roleInfo.label}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleLogout}
                  title="Çıkış"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <LogOut size={14} />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed z-50 p-2.5 rounded-xl bg-slate-900 text-white shadow-lg"
        style={{ top: 'max(1rem, env(safe-area-inset-top, 0px))', left: 'max(1rem, env(safe-area-inset-left, 0px))' }}
        aria-label="Menüyü aç"
      >
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        >
          <div className="w-[min(280px,100vw)] h-full sidebar-dark shadow-2xl safe-top" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white z-10"
            >
              <X size={18} />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      <aside
        suppressHydrationWarning
        className={`no-print hidden lg:flex flex-col shrink-0 sidebar-dark border-r border-white/5 transition-all duration-200 ${
          collapsed ? 'w-[72px]' : 'w-[252px]'
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  )
}
