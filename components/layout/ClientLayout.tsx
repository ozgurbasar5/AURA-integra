'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import TenantSidebar from './TenantSidebar'
import DashboardHeader from './DashboardHeader'
import ThemeProvider from '@/components/ThemeProvider'
import GlobalSearchModal, { useGlobalSearchShortcut } from '@/components/search/GlobalSearchModal'
import AuraAI from '@/components/AuraAI'
import { clearDemoSeedOnce } from '@/lib/store'
import { initTenantDataSync } from '@/lib/store-hydrate'
import { isRouteAllowed, ROUTE_MIN_LEVEL, PLAN_LEVEL_LABELS, type PlanLevel } from '@/lib/plan-tiers'
import { isRouteAllowedForRole } from '@/lib/role-access'
import { PlanProvider } from '@/lib/plan-context'
import { RoleProvider } from '@/lib/role-context'

interface Props {
  tenant: {
    company_name: string
    plan_name: string
    plan_level: PlanLevel
    subscription_end?: string
    status?: string
  }
  user: { full_name: string; email: string; role: string }
  children: React.ReactNode
}

export default function ClientLayout({ tenant, user, children }: Props) {
  const [mounted, setMounted] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const pathname = usePathname()
  const openSearch = useCallback(() => setSearchOpen(true), [])

  useGlobalSearchShortcut(openSearch)

  useEffect(() => {
    clearDemoSeedOnce()
    void initTenantDataSync()
    setMounted(true)
  }, [])

  const planLevel = tenant.plan_level ?? 1
  const planAllowed = isRouteAllowed(pathname, planLevel)
  const roleAllowed = isRouteAllowedForRole(pathname, user.role)
  const allowed = planAllowed && roleAllowed
  const requiredLevel = (ROUTE_MIN_LEVEL[pathname] ?? 1) as PlanLevel
  const showAi = planLevel >= 2

  return (
    <ThemeProvider>
     <PlanProvider level={planLevel}>
      <RoleProvider role={user.role}>
      <GlobalSearchModal open={searchOpen} onClose={() => setSearchOpen(false)} />
      {showAi && <AuraAI />}
      <div className="flex h-screen bg-[var(--bg-base)] overflow-hidden">
        {mounted ? (
          <TenantSidebar tenant={tenant} user={user} onOpenSearch={openSearch} />
        ) : (
          <aside className="hidden lg:flex flex-col shrink-0 w-[250px] sidebar-dark border-r border-white/5" />
        )}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {mounted && <div className="no-print"><DashboardHeader companyName={tenant.company_name} onOpenSearch={openSearch} /></div>}
          <main className="flex-1 overflow-y-auto">
            <div className="page-wrapper">
              {allowed ? (
                children
              ) : !roleAllowed ? (
                <div className="flex items-center justify-center min-h-[70vh] p-6">
                  <div className="max-w-md w-full surface p-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                      <Lock size={26} className="text-red-500" />
                    </div>
                    <h2 className="text-[var(--text-primary)] text-lg font-bold">Bu sayfaya erişiminiz yok</h2>
                    <p className="text-[var(--text-secondary)] text-sm mt-2 leading-relaxed">
                      Rolünüz (<strong>{user.role}</strong>) bu modüle erişemez. Yöneticinizle iletişime geçin.
                    </p>
                    <Link href="/dashboard" className="inline-flex items-center justify-center mt-5 px-5 py-2.5 bg-sky-600 text-white text-sm font-bold rounded-xl hover:bg-sky-700 transition-colors">
                      Panele Dön
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center min-h-[70vh] p-6">
                  <div className="max-w-md w-full surface p-8 text-center">
                    <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4">
                      <Lock size={26} className="text-amber-500" />
                    </div>
                    <h2 className="text-[var(--text-primary)] text-lg font-bold">Bu modül paketinizde yok</h2>
                    <p className="text-[var(--text-secondary)] text-sm mt-2 leading-relaxed">
                      Bu özelliği kullanmak için <strong>{PLAN_LEVEL_LABELS[requiredLevel]}</strong> paketine
                      yükseltmeniz gerekiyor. Mevcut paketiniz: <strong>{PLAN_LEVEL_LABELS[planLevel]}</strong>.
                    </p>
                    <Link
                      href="/dashboard/plan-yukselt"
                      className="inline-flex items-center justify-center mt-5 px-5 py-2.5 bg-sky-600 text-white text-sm font-bold rounded-xl hover:bg-sky-700 transition-colors"
                    >
                      Paketleri İncele
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
      </RoleProvider>
     </PlanProvider>
    </ThemeProvider>
  )
}
