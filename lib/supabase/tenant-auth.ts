import { createClient as createSupabaseJsClient, type SupabaseClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { requirePublicSupabaseEnv } from '@/lib/supabase/public-env'
import { isOwnerRole } from '@/lib/role-access'
import { normalizeTenantRole } from '@/lib/tenant-roles'

export type TenantAuth =
  | {
      ok: true
      supabase: ReturnType<typeof createClient> | SupabaseClient
      userId: string
      tenantId: string
      role: string
    }
  | { ok: false; status: number; message: string }

function createBearerClient(accessToken: string): SupabaseClient {
  const { url, anon } = requirePublicSupabaseEnv('Supabase sunucu')
  return createSupabaseJsClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

async function resolveProfile(
  supabase: { from: ReturnType<typeof createClient>['from'] },
  userId: string,
): Promise<TenantAuth> {
  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('tenant_id, role, is_active')
    .eq('id', userId)
    .single()

  if (profileErr || !profile?.tenant_id) {
    return { ok: false, status: 403, message: 'Bayi profili bulunamadı' }
  }

  if (profile.is_active === false) {
    return { ok: false, status: 403, message: 'Hesap pasif' }
  }

  if (profile.role === 'super_admin') {
    return { ok: false, status: 403, message: 'Süper admin tenant API kullanamaz' }
  }

  return {
    ok: true,
    supabase: supabase as ReturnType<typeof createClient>,
    userId,
    tenantId: profile.tenant_id,
    role: profile.role,
  }
}

/** Cookie (web) veya Authorization: Bearer (Expo mobil) */
export async function requireTenantAuth(): Promise<TenantAuth> {
  const h = headers()
  const authHeader = h.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (!token) return { ok: false, status: 401, message: 'Oturum bulunamadı' }
    const supabase = createBearerClient(token)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return { ok: false, status: 401, message: 'Oturum bulunamadı' }
    }
    return resolveProfile(supabase, user.id)
  }

  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return { ok: false, status: 401, message: 'Oturum bulunamadı' }
  }

  return resolveProfile(supabase, user.id)
}

export async function requireTenantOwner(): Promise<TenantAuth> {
  const auth = await requireTenantAuth()
  if (!auth.ok) return auth
  const role = normalizeTenantRole(auth.role)
  if (!isOwnerRole(role)) {
    return { ok: false, status: 403, message: 'Bu işlem için yönetici yetkisi gerekli' }
  }
  return auth
}

export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}
