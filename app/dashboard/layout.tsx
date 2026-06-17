import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  fetchLayoutProfileService,
  getSessionUser,
  tenantHasOverduePaymentService,
} from '@/lib/supabase/auth-helpers'
import { evaluateTenantAccess } from '@/lib/subscription'
import { getPlanLevel } from '@/lib/plan-tiers'
import { normalizeTenantRole } from '@/lib/tenant-roles'
import ClientLayout from '@/components/layout/ClientLayout'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  try {
    const supabase = createClient()
    const user = await getSessionUser(supabase)

    // Bayi paneli — oturum zorunlu (VantaPhone tarzı SaaS)
    if (!user) redirect('/login')

    // Service role ile profil — RLS/timeout sorunlarını aşar
    const dbProfile = await fetchLayoutProfileService(user)

    if (!dbProfile.ok) {
      redirect('/login?error=service_unavailable')
    }

    const profile = dbProfile.data

    if (!profile.is_active) redirect('/login?error=profile_inactive')

    if (profile.role === 'super_admin') redirect('/admin')

    const tenant = profile.tenants
    if (!tenant || !profile.tenant_id) {
      redirect('/login?error=no_tenant')
    }

    const hasOverdue = await tenantHasOverduePaymentService(profile.tenant_id)

    const access = evaluateTenantAccess({
      status: tenant.status,
      subscription_end: tenant.subscription_end,
      has_overdue_payment: hasOverdue,
    })

    if (!access.allowed) {
      redirect(`/login?error=${access.reason}`)
    }

    const planLevel = getPlanLevel(tenant.subscription_plans?.name)

    return (
      <ClientLayout
        tenant={{
          company_name: tenant.company_name,
          plan_name: tenant.subscription_plans?.name ?? 'Paket',
          plan_level: planLevel,
          subscription_end: tenant.subscription_end ?? undefined,
          status: tenant.status,
        }}
        user={{
          full_name: profile.full_name,
          email: user.email ?? '',
          role: normalizeTenantRole(profile.role),
          onboarding_completed: profile.onboarding_completed ?? false,
        }}
      >
        {children}
      </ClientLayout>
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('NEXT_REDIRECT') || msg.includes('redirect')) throw err
    redirect('/login?error=service_unavailable')
  }
}
