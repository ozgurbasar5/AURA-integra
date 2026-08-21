export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'
import { canManageTenantSettings } from '@/lib/api-role-guard'
import { sanitizeTenantRole, TENANT_ROLE_OPTIONS } from '@/lib/tenant-roles'
import { DEFAULT_ROLE_PERMISSIONS } from '@/lib/admin-permissions'
import { writeTenantAuditLog } from '@/lib/tenant-audit-log'

export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  const { supabase, tenantId } = auth

  const [usersRes, branchesRes, limitsRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, full_name, role, is_active, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true }),
    supabase
      .from('branches')
      .select('id, name, address, phone, is_main, is_active')
      .eq('tenant_id', tenantId)
      .order('is_main', { ascending: false }),
    supabase
      .from('tenants')
      .select('plan_id, subscription_plans(max_users, max_branches)')
      .eq('id', tenantId)
      .single(),
  ])

  const plan = limitsRes.data?.subscription_plans as { max_users?: number; max_branches?: number } | null

  return NextResponse.json({
    ok: true,
    users: (usersRes.data ?? []).map(u => ({
      ...u,
      role: sanitizeTenantRole(u.role),
    })),
    branches: branchesRes.data ?? [],
    roleOptions: TENANT_ROLE_OPTIONS,
    permissionsMatrix: DEFAULT_ROLE_PERMISSIONS,
    limits: {
      max_users: plan?.max_users ?? 5,
      max_branches: plan?.max_branches ?? 2,
    },
  })
}

export async function POST(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  if (!canManageTenantSettings(auth.role)) {
    return NextResponse.json({ error: 'Bu işlem için yönetici yetkisi gereklidir' }, { status: 403 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON formatı' }, { status: 400 })
  }

  const { type, data } = body
  const { supabase, tenantId } = auth

  if (type === 'branch') {
    if (!data?.name?.trim()) {
      return NextResponse.json({ error: 'Şube adı zorunludur' }, { status: 400 })
    }

    const { data: newBranch, error: branchErr } = await supabase
      .from('branches')
      .insert({
        tenant_id: tenantId,
        name: data.name.trim(),
        address: data.address?.trim() || null,
        phone: data.phone?.trim() || null,
        is_main: Boolean(data.is_main),
        is_active: true,
      })
      .select('*')
      .single()

    if (branchErr) return NextResponse.json({ error: branchErr.message }, { status: 500 })

    await writeTenantAuditLog({
      tenantId,
      userId: auth.userId,
      action: 'create',
      entityType: 'branch',
      entityId: newBranch.id,
      newData: { name: newBranch.name },
    })

    return NextResponse.json({ ok: true, branch: newBranch }, { status: 201 })
  }

  return NextResponse.json({ error: 'Bilinmeyen işlem tipi' }, { status: 400 })
}

export async function PATCH(req: NextRequest) {
  const auth = await requireTenantAuth()
  if (!auth.ok) return NextResponse.json({ error: auth.message }, { status: auth.status })

  if (!canManageTenantSettings(auth.role)) {
    return NextResponse.json({ error: 'Bu işlem için yönetici yetkisi gereklidir' }, { status: 403 })
  }

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Geçersiz JSON' }, { status: 400 })
  }

  const { type, id, updates } = body
  const { supabase, tenantId } = auth

  if (type === 'user') {
    const patch: Record<string, unknown> = {}
    if (updates.role !== undefined) patch.role = sanitizeTenantRole(updates.role)
    if (updates.is_active !== undefined) patch.is_active = Boolean(updates.is_active)
    if (updates.full_name !== undefined) patch.full_name = String(updates.full_name).trim()

    const { error } = await supabase
      .from('user_profiles')
      .update(patch)
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await writeTenantAuditLog({
      tenantId,
      userId: auth.userId,
      action: 'update',
      entityType: 'user_profile',
      entityId: id,
      newData: patch,
    })

    return NextResponse.json({ ok: true })
  }

  if (type === 'branch') {
    const { error } = await supabase
      .from('branches')
      .update(updates)
      .eq('id', id)
      .eq('tenant_id', tenantId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    await writeTenantAuditLog({
      tenantId,
      userId: auth.userId,
      action: 'update',
      entityType: 'branch',
      entityId: id,
      newData: updates,
    })

    return NextResponse.json({ ok: true })
  }

  return NextResponse.json({ error: 'Bilinmeyen güncelleme tipi' }, { status: 400 })
}
