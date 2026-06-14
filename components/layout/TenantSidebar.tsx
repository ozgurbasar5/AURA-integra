'use client'

import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import {
  LayoutDashboard, Wrench, Package, DollarSign,
  ShoppingCart, BarChart3, FileText, Settings,
  ChevronLeft, ChevronRight, LogOut, Bell,
  HelpCircle, Users, Shield, CalendarDays,
  UserCog, Search, Menu, X,
  ShoppingBag, CheckSquare, ClipboardList,
  Store, Building2, Megaphone, Tag, Globe,
  ClipboardCheck, Wallet, Truck, Percent, RefreshCw,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { ROUTE_MIN_LEVEL, PLAN_LEVEL_LABELS, type PlanLevel } from '@/lib/plan-tiers'
import { isNavAllowed, getSidebarGroupsForRole, isOwnerRole } from '@/lib/role-access'
import Logo from '@/components/Logo'
import ColorModeToggle from '@/components/ColorModeToggle'
import { getBusinessBranding } from '@/lib/business-branding'
import { onStoreChange, getStore } from '@/lib/store'

interface NavItem {
  href: string; icon: typeof LayoutDashboard; label: string
  group: string; badge?: number
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',             icon: LayoutDashboard, label: 'Anasayfa',        group: 'ANA' },
  { href: '/dashboard/bildirimler', icon: Bell,            label: 'Bildirimler',     group: 'ANA' },
  { href: '/dashboard/kabul',       icon: ClipboardCheck,  label: 'Hızlı Kabul',     group: 'HIZLI İŞLEMLER' },
  { href: '/dashboard/alis',        icon: ShoppingBag,     label: 'Alış',            group: 'HIZLI İŞLEMLER' },
  { href: '/dashboard/satis',       icon: ShoppingCart,     label: 'Satış & POS',     group: 'HIZLI İŞLEMLER' },
  { href: '/dashboard/kasa',        icon: Wallet,          label: 'Kasa Vardiyası',  group: 'HIZLI İŞLEMLER' },
  { href: '/dashboard/stok',        icon: Package,         label: 'Stok',            group: 'MODÜLLER' },
  { href: '/dashboard/atolye',      icon: Wrench,          label: 'Teknik Servis',   group: 'MODÜLLER' },
  { href: '/dashboard/tedarik',     icon: Truck,           label: 'Tedarik',         group: 'MODÜLLER' },
  { href: '/dashboard/finans',      icon: DollarSign,      label: 'Gelir/Gider',     group: 'MODÜLLER' },
  { href: '/dashboard/musteriler',  icon: Users,           label: 'Müşteriler',      group: 'MODÜLLER' },
  { href: '/dashboard/yapilacaklar',    icon: CheckSquare,     label: 'Yapılacaklar',       group: 'YÖNETİM' },
  { href: '/dashboard/calinti-kontrol', icon: Globe,            label: 'Yurt Dışı / TR Kayıt', group: 'YÖNETİM' },
  { href: '/dashboard/siparisler',      icon: ClipboardList,   label: 'Müşteri Siparişleri', group: 'YÖNETİM' },
  { href: '/dashboard/magaza',      icon: Store,           label: 'Mağaza',          group: 'MAĞAZA' },
  { href: '/dashboard/vitrin',     icon: Store,           label: 'Vitrin Cihazları', group: 'MAĞAZA' },
  { href: '/dashboard/varliklar',   icon: Building2,       label: 'Varlık Yönetimi', group: 'MAĞAZA' },
  { href: '/dashboard/kampanyalar', icon: Megaphone,       label: 'Kampanyalar',     group: 'MAĞAZA' },
  { href: '/dashboard/firsatlar',   icon: Tag,             label: 'Fırsatlar',       group: 'MAĞAZA' },
  { href: '/dashboard/personel',    icon: UserCog,         label: 'Çalışanlar',      group: 'YÖNETİCİ' },
  { href: '/dashboard/komisyon',    icon: Percent,         label: 'Komisyon',        group: 'YÖNETİCİ' },
  { href: '/dashboard/subeler',     icon: Building2,       label: 'Şubeler',         group: 'YÖNETİCİ' },
  { href: '/dashboard/fatura',      icon: FileText,        label: 'E-Fatura',        group: 'YÖNETİCİ' },
  { href: '/dashboard/raporlar',    icon: BarChart3,       label: 'Raporlar',        group: 'YÖNETİCİ' },
  { href: '/dashboard/garanti',     icon: Shield,          label: 'Garanti',         group: 'YÖNETİCİ' },
  { href: '/dashboard/randevu',     icon: CalendarDays,    label: 'Randevular',      group: 'YÖNETİCİ' },
  { href: '/dashboard/ayarlar',     icon: Settings,        label: 'Ayarlar',         group: 'SİSTEM' },
  { href: '/dashboard/destek',      icon: HelpCircle,      label: 'Destek',          group: 'SİSTEM' },
]

const GROUPS = ['ANA', 'HIZLI İŞLEMLER', 'MODÜLLER', 'YÖNETİM', 'MAĞAZA', 'YÖNETİCİ', 'SİSTEM', 'ATÖLYE', 'SATIŞ', 'KASA', 'FİNANS']

const TEKNISYEN_GROUP: Record<string, string> = {
  '/dashboard/atolye': 'ATÖLYE',
  '/dashboard/yapilacaklar': 'ATÖLYE',
  '/dashboard/stok': 'ATÖLYE',
  '/dashboard/tedarik': 'ATÖLYE',
  '/dashboard/garanti': 'ATÖLYE',
  '/dashboard/randevu': 'ATÖLYE',
}

const SATIS_GROUP: Record<string, string> = {
  '/dashboard/satis': 'SATIŞ',
  '/dashboard/kabul': 'SATIŞ',
  '/dashboard/stok': 'SATIŞ',
  '/dashboard/musteriler': 'SATIŞ',
  '/dashboard/magaza': 'SATIŞ',
  '/dashboard/vitrin': 'SATIŞ',
  '/dashboard/ikinci-el': 'SATIŞ',
}

const KASA_GROUP: Record<string, string> = {
  '/dashboard/satis': 'KASA',
  '/dashboard/kabul': 'KASA',
  '/dashboard/kasa': 'KASA',
  '/dashboard/stok': 'KASA',
  '/dashboard/musteriler': 'KASA',
}

const FINANS_GROUP: Record<string, string> = {
  '/dashboard/finans': 'FİNANS',
  '/dashboard/fatura': 'FİNANS',
  '/dashboard/raporlar': 'FİNANS',
  '/dashboard/kasa': 'FİNANS',
  '/dashboard/musteriler': 'FİNANS',
}

const ROLE_LABELS: Record<string, { label: string; bg: string }> = {
  super_admin:  { label: 'Süper Admin', bg: 'bg-red-500/20 text-red-300' },
  tenant_admin: { label: 'Sahip',        bg: 'bg-sky-500/20 text-sky-300' },
  admin:        { label: 'Yönetici',     bg: 'bg-sky-500/20 text-sky-300' },
  mudur:        { label: 'Müdür',        bg: 'bg-sky-500/20 text-sky-300' },
  teknisyen:    { label: 'Teknisyen',    bg: 'bg-cyan-500/20 text-cyan-300' },
  satis:        { label: 'Satış',        bg: 'bg-emerald-500/20 text-emerald-300' },
  muhasebe:     { label: 'Muhasebe',     bg: 'bg-amber-500/20 text-amber-300' },
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
}

export default function TenantSidebar({ tenant, user }: Props) {
  const pathname = usePathname()
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [brand, setBrand] = useState({ shopName: '', shopLogo: null as string | null })
  const [badges, setBadges] = useState({ stok: 0, atolye: 0 })
  const supabase = createClient()

  useEffect(() => {
    const updateBadges = () => {
      const store = getStore()
      setBadges({
        stok: store.stock.filter(s => s.stock_qty <= s.min_stock).length,
        atolye: store.serviceOrders.filter(o => !['delivered', 'cancelled'].includes(o.status)).length,
      })
    }
    setBrand(getBusinessBranding())
    updateBadges()
    return onStoreChange(mod => {
      if (mod === 'settings' || mod === 'seed') setBrand(getBusinessBranding())
      if (['stock', 'service', 'seed'].includes(mod)) updateBadges()
    })
  }, [])

  const planLevel = tenant.plan_level ?? 1
  const roleInfo = ROLE_LABELS[user.role] || ROLE_LABELS.default
  const initials = user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const allowedNavItems = NAV_ITEMS.filter(item => {
    if (!isNavAllowed(item.href, user.role)) return false
    const required = ROUTE_MIN_LEVEL[item.href]
    if (required === undefined) return true
    return planLevel >= required
  })

  function resolveGroup(item: NavItem): string {
    if (user.role === 'teknisyen') return TEKNISYEN_GROUP[item.href] || item.group
    if (user.role === 'satis') return SATIS_GROUP[item.href] || item.group
    if (user.role === 'kasiyer') return KASA_GROUP[item.href] || item.group
    if (user.role === 'muhasebe') return FINANS_GROUP[item.href] || item.group
    return item.group
  }

  const visibleGroups = getSidebarGroupsForRole(user.role) ?? GROUPS.slice(0, 7)

  const handleLogout = async () => {
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

  function NavLink({ item }: { item: NavItem }) {
    const active = isActive(item.href)
    const Icon = item.icon
    const liveBadge = getLiveBadge(item.href)
    return (
      <Link href={item.href} onClick={() => setMobileOpen(false)}
        className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all ${
          active ? 'bg-sky-500/15 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
        }`}
        title={collapsed ? item.label : undefined}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-sky-400 rounded-r-full" />
        )}
        <Icon size={collapsed ? 20 : 17} className={`shrink-0 ${active ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'}`} />
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
          {!collapsed && !isOwnerRole(user.role) && (
            <span className="ml-auto text-[9px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 uppercase">
              {roleInfo.label}
            </span>
          )}
        </div>
        {!collapsed && isOwnerRole(user.role) && (
          <p className="px-4 -mt-2 mb-2 text-[10px] text-slate-500 truncate">{tenant.company_name} · {PLAN_LEVEL_LABELS[planLevel]}</p>
        )}

        {!collapsed && (
          <div className="px-3 mb-3">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/5 border border-white/5 text-slate-500 text-xs">
              <Search size={13} />
              <span>Hızlı arama...</span>
            </div>
          </div>
        )}

        <nav className="flex-1 overflow-y-auto px-3 scrollbar-hide">
          {visibleGroups.map(group => {
            const items = allowedNavItems.filter(i => resolveGroup(i) === group)
            if (items.length === 0) return null
            return (
              <div key={group} className="mb-1">
                {!collapsed && (
                  <p className="px-3 pt-4 pb-1.5 text-[10px] font-bold text-slate-600 uppercase tracking-widest">{group}</p>
                )}
                {collapsed && <div className="h-px bg-white/5 my-2 mx-2" />}
                <div className="space-y-0.5">
                  {items.map(item => <NavLink key={item.href} item={item} />)}
                </div>
              </div>
            )
          })}
        </nav>

        <div className="px-3 py-2 hidden lg:flex flex-col gap-2">
          {!collapsed && <ColorModeToggle compact />}
          <button type="button" onClick={() => setCollapsed(!collapsed)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all text-xs">
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
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${roleInfo.bg}`}>{roleInfo.label}</span>
                </div>
                <button type="button" onClick={handleLogout} title="Çıkış"
                  className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all">
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
      <button type="button" onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2.5 rounded-xl bg-slate-900 text-white shadow-lg"
        aria-label="Menüyü aç">
        <Menu size={20} />
      </button>

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div className="w-[260px] h-full sidebar-dark shadow-2xl" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setMobileOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white z-10">
              <X size={18} />
            </button>
            <SidebarContent />
          </div>
        </div>
      )}

      <aside suppressHydrationWarning
        className={`no-print hidden lg:flex flex-col shrink-0 sidebar-dark border-r border-white/5 transition-all duration-200 ${collapsed ? 'w-[72px]' : 'w-[252px]'}`}
      >
        <SidebarContent />
      </aside>
    </>
  )
}
