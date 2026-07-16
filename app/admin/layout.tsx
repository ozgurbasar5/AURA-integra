import { redirect } from 'next/navigation'
import dynamic from 'next/dynamic'
import { createClient } from '@/lib/supabase/server'
import { getSessionUser, resolveSuperAdminAccess } from '@/lib/supabase/auth-helpers'

const AdminSidebar = dynamic(() => import('@/components/layout/AdminSidebar'), { ssr: false })
const AdminOnboardingTour = dynamic(() => import('@/components/admin/AdminOnboardingTour'), { ssr: false })
const AdminTopBar = dynamic(() => import('@/components/admin/AdminTopBar'), { ssr: false })
const ConnectionStatusBanner = dynamic(() => import('@/components/ConnectionStatusBanner'), { ssr: false })

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  try {
    const supabase = createClient()
    const user = await getSessionUser(supabase)

    if (!user) redirect('/login')

    const auth = await resolveSuperAdminAccess(supabase, user)

    if (!auth.ok) {
      if (auth.reason === 'not_super_admin') redirect('/dashboard')
      redirect('/login?error=admin_denied')
    }

    return (
      <div className="flex h-screen bg-[var(--bg-base)] overflow-hidden flex-col">
        {!auth.fromDb && auth.warning && (
          <div className="bg-amber-500 text-amber-950 text-sm font-medium px-4 py-2 text-center shrink-0">
            ⚠️ {auth.warning}
          </div>
        )}
        <div className="flex flex-1 overflow-hidden min-w-0">
          <AdminSidebar user={{ email: user.email ?? '', full_name: auth.data.full_name }} />
          <main className="flex-1 overflow-y-auto min-w-0 pt-14 lg:pt-0 flex flex-col">
            <AdminTopBar />
            <ConnectionStatusBanner compact />
            <div className="page-wrapper flex-1">{children}</div>
          </main>
        </div>
        <AdminOnboardingTour />
      </div>
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('NEXT_REDIRECT') || msg.includes('redirect')) throw err
    redirect('/login?error=admin_offline')
  }
}
