import { NextRequest, NextResponse } from 'next/server'
import { getServiceClient } from '@/lib/supabase/service'
import { requireSuperAdmin } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

/**
 * Safe authenticated diagnostic endpoint for super admins.
 * Verifies auth -> profile -> tenant chain without leaking secrets.
 */
export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  const admin = getServiceClient()
  if (!admin) {
    return NextResponse.json({ error: 'Service role client unavailable' }, { status: 503 })
  }

  const { searchParams } = new URL(request.url)
  const targetEmail = searchParams.get('email')?.trim().toLowerCase()
  const targetUserId = searchParams.get('userId')?.trim()

  if (!targetEmail && !targetUserId) {
    return NextResponse.json({ error: 'email veya userId parametresi gerekli' }, { status: 400 })
  }

  let authUser: { id: string; email?: string } | null = null

  if (targetUserId) {
    const { data } = await admin.auth.admin.getUserById(targetUserId)
    if (data?.user) authUser = { id: data.user.id, email: data.user.email }
  } else if (targetEmail) {
    const { data } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 })
    const matched = data?.users?.find(u => u.email?.toLowerCase().trim() === targetEmail)
    if (matched) authUser = { id: matched.id, email: matched.email }
  }

  const authUserExists = Boolean(authUser)
  let profileExists = false
  let tenantIdPresent = false
  let tenantExists = false
  let tenantActive = false
  let role: string | null = null
  let roleAuthorized = false

  if (authUser) {
    const { data: profile } = await admin
      .from('user_profiles')
      .select('role, is_active, tenant_id')
      .eq('id', authUser.id)
      .maybeSingle()

    if (profile) {
      profileExists = true
      role = profile.role
      tenantIdPresent = Boolean(profile.tenant_id)
      roleAuthorized = profile.is_active !== false

      if (profile.tenant_id) {
        const { data: tenant } = await admin
          .from('tenants')
          .select('id, status')
          .eq('id', profile.tenant_id)
          .maybeSingle()

        if (tenant) {
          tenantExists = true
          tenantActive = tenant.status === 'active' || tenant.status === 'trial'
        }
      }
    }
  }

  return NextResponse.json({
    authUserExists,
    profileExists,
    tenantIdPresent,
    tenantExists,
    tenantActive,
    role,
    roleAuthorized,
  })
}
