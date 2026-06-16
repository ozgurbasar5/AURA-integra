export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getServiceClient } from '@/lib/supabase/service'
import { getAdminDataClient } from '@/lib/supabase/admin-data'
import { writeAuditLog } from '@/lib/audit-log'
import { sanitizeTenantRole } from '@/lib/tenant-roles'

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  const tenantId = request.nextUrl.searchParams.get('tenant_id')
  if (!tenantId) {
    return NextResponse.json({ error: 'tenant_id gerekli' }, { status: 400 })
  }

  try {
    const admin = getAdminDataClient()
    const { data, error } = await admin
      .from('user_profiles')
      .select('id, full_name, role, is_active, created_at, tenant_id')
      .eq('tenant_id', tenantId)
      .order('created_at')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const { data: tenantRow } = await admin
      .from('tenants')
      .select('plan_id, subscription_plans(max_users, max_branches)')
      .eq('id', tenantId)
      .single()

    const plan = tenantRow?.subscription_plans as { max_users?: number; max_branches?: number } | null

    const users = await Promise.all(
      (data ?? []).map(async (profile) => {
        const { data: authData } = await admin.auth.admin.getUserById(profile.id)
        return {
          id: profile.id,
          user_id: profile.id,
          role: sanitizeTenantRole(profile.role),
          is_active: profile.is_active ?? true,
          full_name: profile.full_name || '—',
          email: authData.user?.email ?? '—',
          created_at: profile.created_at,
        }
      })
    )

    return NextResponse.json({
      data: users,
      limits: {
        max_users: plan?.max_users ?? 99,
        max_branches: plan?.max_branches ?? 99,
      },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  let body: { tenant_id?: string; email?: string; password?: string; role?: string; full_name?: string; user_id?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const { tenant_id, email, password, role, full_name, user_id } = body
  if (!tenant_id) {
    return NextResponse.json({ error: 'tenant_id gerekli' }, { status: 400 })
  }

  if (user_id) {
    return attachExistingUser(admin, auth, tenant_id, user_id, role, full_name)
  }

  if (!email || !password) {
    return NextResponse.json({ error: 'email ve password gerekli (veya user_id ile mevcut kullanıcı bağlayın)' }, { status: 400 })
  }

  const { data: tenant } = await admin
    .from('tenants')
    .select('plan_id, subscription_plans(max_users, max_branches)')
    .eq('id', tenant_id)
    .single()

  const plan = tenant?.subscription_plans as { max_users?: number; max_branches?: number } | null
  const maxUsers = plan?.max_users ?? 99

  const { count } = await admin
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant_id)
    .eq('is_active', true)

  if ((count ?? 0) >= maxUsers) {
    return NextResponse.json(
      { error: `Paket limiti: en fazla ${maxUsers} aktif kullanıcı` },
      { status: 403 }
    )
  }

  const { data: authUser, error: createErr } = await admin.auth.admin.createUser({
    email: email.trim().toLowerCase(),
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name ?? email.split('@')[0] },
  })

  if (createErr || !authUser.user) {
    return NextResponse.json({ error: createErr?.message ?? 'Kullanıcı oluşturulamadı' }, { status: 500 })
  }

  const safeRole = sanitizeTenantRole(role)

  const { error: profileErr } = await admin.from('user_profiles').upsert({
    id: authUser.user.id,
    full_name: full_name ?? email.split('@')[0],
    role: safeRole,
    tenant_id,
    is_active: true,
  })

  if (profileErr) {
    await admin.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  await writeAuditLog({
    actorId: auth.userId,
    action: 'create_tenant_user',
    targetType: 'tenant',
    targetId: tenant_id,
    metadata: { email, role: safeRole },
  })

  return NextResponse.json({
    data: { id: authUser.user.id, email: authUser.user.email },
  })
}

/** Mevcut auth kullanıcısını bayiye bağla (şifre gerekmez) */
async function attachExistingUser(
  admin: NonNullable<ReturnType<typeof getServiceClient>>,
  auth: { userId: string },
  tenant_id: string,
  user_id: string,
  role: string | undefined,
  full_name: string | undefined,
) {
  const safeRole = sanitizeTenantRole(role)

  const { data: tenant } = await admin
    .from('tenants')
    .select('plan_id, subscription_plans(max_users, max_branches)')
    .eq('id', tenant_id)
    .single()

  const plan = tenant?.subscription_plans as { max_users?: number } | null
  const maxUsers = plan?.max_users ?? 99

  const { count } = await admin
    .from('user_profiles')
    .select('id', { count: 'exact', head: true })
    .eq('tenant_id', tenant_id)
    .eq('is_active', true)

  if ((count ?? 0) >= maxUsers) {
    return NextResponse.json(
      { error: `Paket limiti: en fazla ${maxUsers} aktif kullanıcı` },
      { status: 403 }
    )
  }

  const { data: authData, error: authErr } = await admin.auth.admin.getUserById(user_id)
  if (authErr || !authData.user) {
    return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
  }

  const { error: profileErr } = await admin.from('user_profiles').upsert({
    id: user_id,
    full_name: full_name ?? authData.user.email?.split('@')[0] ?? 'Kullanıcı',
    role: safeRole,
    tenant_id,
    is_active: true,
  }, { onConflict: 'id' })

  if (profileErr) {
    return NextResponse.json({ error: profileErr.message }, { status: 500 })
  }

  await writeAuditLog({
    actorId: auth.userId,
    action: 'attach_tenant_user',
    targetType: 'tenant',
    targetId: tenant_id,
    metadata: { user_id, role: safeRole },
  })

  return NextResponse.json({
    data: {
      id: user_id,
      email: authData.user.email,
      role: safeRole,
    },
  })
}

export async function PATCH(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  const admin = getServiceClient()
  if (!admin) return NextResponse.json({ error: 'Service role gerekli' }, { status: 503 })

  let body: {
    user_id?: string
    tenant_id?: string
    role?: string
    is_active?: boolean
    detach?: boolean
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const { user_id, tenant_id, role, is_active, detach } = body
  if (!user_id || !tenant_id) {
    return NextResponse.json({ error: 'user_id ve tenant_id gerekli' }, { status: 400 })
  }

  const patch: Record<string, unknown> = {}
  if (detach) {
    patch.tenant_id = null
  } else {
    patch.tenant_id = tenant_id
    if (role !== undefined) patch.role = sanitizeTenantRole(role)
    if (is_active !== undefined) patch.is_active = is_active
  }

  const { error } = await admin
    .from('user_profiles')
    .update(patch)
    .eq('id', user_id)
    .eq('tenant_id', tenant_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await writeAuditLog({
    actorId: auth.userId,
    action: detach ? 'detach_tenant_user' : 'update_tenant_user',
    targetType: 'tenant',
    targetId: tenant_id,
    metadata: { user_id, ...patch },
  })

  return NextResponse.json({ ok: true })
}
