import { createClient as createSupabaseJsClient, type SupabaseClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { requirePublicSupabaseEnv } from '@/lib/supabase/public-env'
import { isOwnerRole } from '@/lib/role-access'
import { normalizeTenantRole } from '@/lib/tenant-roles'

import { getServiceClient } from '@/lib/supabase/service'

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

  if (!profileErr && profile?.tenant_id) {
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

  // Fallback to service role client (bypasses potential RLS / timing issues)
  const admin = getServiceClient()
  if (admin) {
    const { data: adminProfile } = await admin
      .from('user_profiles')
      .select('tenant_id, role, is_active')
      .eq('id', userId)
      .single()

    if (adminProfile?.tenant_id) {
      if (adminProfile.is_active === false) {
        return { ok: false, status: 403, message: 'Hesap pasif' }
      }
      if (adminProfile.role === 'super_admin') {
        return { ok: false, status: 403, message: 'Süper admin tenant API kullanamaz' }
      }
      return {
        ok: true,
        supabase: supabase as ReturnType<typeof createClient>,
        userId,
        tenantId: adminProfile.tenant_id,
        role: adminProfile.role,
      }
    }

    // Controlled resolution: look up user email from auth admin if needed
    try {
      const { data: userData } = await admin.auth.admin.getUserById(userId)
      const email = userData?.user?.email?.toLowerCase().trim()
      if (email) {
        const { data: matchingTenants } = await admin
          .from('tenants')
          .select('id')
          .ilike('email', email)
          .order('created_at', { ascending: false })
          .limit(1)

        if (matchingTenants && matchingTenants.length > 0) {
          const autoTenantId = matchingTenants[0].id
          await admin.from('user_profiles').upsert(
            {
              id: userId,
              tenant_id: autoTenantId,
              role: 'tenant_admin',
              is_active: true,
              full_name: (userData?.user?.user_metadata?.full_name as string) || email.split('@')[0] || 'Bayi Yöneticisi',
            },
            { onConflict: 'id' }
          )
          return {
            ok: true,
            supabase: supabase as ReturnType<typeof createClient>,
            userId,
            tenantId: autoTenantId,
            role: 'tenant_admin',
          }
        }
      }
    } catch {
      /* ignore */
    }
  }

  return { ok: false, status: 403, message: 'Bayi profili bulunamadı' }
}

interface CachedTenantAuth {
  userId: string
  tenantId: string
  role: string
  expiresAt: number
}

const authCache = new Map<string, CachedTenantAuth>()
const AUTH_CACHE_TTL_MS = 30_000 // 30 saniye in-memory cache

export function invalidateTenantAuthCache(key?: string) {
  if (key) authCache.delete(key)
  else authCache.clear()
}

/** Cookie (web) veya Authorization: Bearer (Expo mobil) */
export async function requireTenantAuth(): Promise<TenantAuth> {
  const h = headers()
  const authHeader = h.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim()
    if (!token) return { ok: false, status: 401, message: 'Oturum bulunamadı' }

    const cached = authCache.get(token)
    if (cached && cached.expiresAt > Date.now()) {
      const supabase = createBearerClient(token)
      return {
        ok: true,
        supabase,
        userId: cached.userId,
        tenantId: cached.tenantId,
        role: cached.role,
      }
    }

    const supabase = createBearerClient(token)
    const { data: { user }, error } = await supabase.auth.getUser(token)
    if (error || !user) {
      return { ok: false, status: 401, message: 'Oturum bulunamadı' }
    }
    const authRes = await resolveProfile(supabase, user.id)
    if (authRes.ok) {
      authCache.set(token, {
        userId: authRes.userId,
        tenantId: authRes.tenantId,
        role: authRes.role,
        expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
      })
    }
    return authRes
  }

  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return { ok: false, status: 401, message: 'Oturum bulunamadı' }
  }

  const userKey = `user_${user.id}`
  const cached = authCache.get(userKey)
  if (cached && cached.expiresAt > Date.now()) {
    return {
      ok: true,
      supabase,
      userId: cached.userId,
      tenantId: cached.tenantId,
      role: cached.role,
    }
  }

  const authRes = await resolveProfile(supabase, user.id)
  if (authRes.ok) {
    authCache.set(userKey, {
      userId: authRes.userId,
      tenantId: authRes.tenantId,
      role: authRes.role,
      expiresAt: Date.now() + AUTH_CACHE_TTL_MS,
    })
  }
  return authRes
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
