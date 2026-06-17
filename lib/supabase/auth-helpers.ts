import type { SupabaseClient, User } from '@supabase/supabase-js'
import { getServiceClient } from './service'

const PROFILE_TIMEOUT_MS = 4000

/** Süper admin e-postaları — SUPER_ADMIN_EMAILS env (virgülle ayrılmış) veya varsayılan */
const DEFAULT_SUPER_ADMIN_EMAILS = [
  'admin@aurabilisim.net',
  'admin@aurabilisim.com',
] as const

function getSuperAdminEmailList(): string[] {
  const fromEnv = process.env.SUPER_ADMIN_EMAILS?.trim()
  if (fromEnv) {
    return fromEnv.split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
  }
  return [...DEFAULT_SUPER_ADMIN_EMAILS]
}

export const SUPER_ADMIN_EMAILS = DEFAULT_SUPER_ADMIN_EMAILS

export type LayoutProfile = {
  full_name: string
  role: string
  is_active: boolean
  onboarding_completed?: boolean
  tenant_id: string | null
  tenants: {
    company_name: string
    status: string
    subscription_start: string | null
    subscription_end: string | null
    plan_id: string | null
    subscription_plans: { name: string; price: number } | null
  } | null
}

export type AdminProfile = {
  full_name: string
  role: string
  is_active: boolean
}

type DbFailReason = 'timeout' | 'error' | 'not_found' | 'inactive' | 'not_super_admin'

export type AdminAccessResult =
  | { ok: true; data: AdminProfile; fromDb: true }
  | { ok: true; data: AdminProfile; fromDb: false; warning?: string }
  | { ok: false; reason: DbFailReason }

function parseQueryError(error: unknown): { reason: DbFailReason; code?: string } {
  if (!error || typeof error !== 'object') return { reason: 'error' }
  const e = error as { message?: string; code?: string }
  if (e.message === 'timeout') return { reason: 'timeout' }
  if (e.code === 'PGRST116') return { reason: 'not_found', code: e.code }
  return { reason: 'error', code: e.code }
}

/** Service role ile süper admin profili oluştur / güncelle */
export async function ensureSuperAdminProfile(user: User): Promise<boolean> {
  if (!isSuperAdminEmail(user.email)) return false

  const admin = getServiceClient()
  if (!admin) return false

  try {
    const meta = user.user_metadata as Record<string, unknown> | undefined
    const fullName =
      typeof meta?.full_name === 'string' && meta.full_name.trim()
        ? meta.full_name
        : 'AURA Admin'

    const { error } = await admin.from('user_profiles').upsert(
      {
        id: user.id,
        full_name: fullName,
        role: 'super_admin',
        tenant_id: null,
        is_active: true,
      },
      { onConflict: 'id' }
    )
    return !error
  } catch {
    return false
  }
}

export type DbResult<T> =
  | { ok: true; data: T; fromDb: true }
  | { ok: false; reason: DbFailReason }

function roleFromUser(user: User): string | undefined {
  const meta = user.user_metadata as Record<string, unknown> | undefined
  const app = user.app_metadata as Record<string, unknown> | undefined
  const role = meta?.role ?? app?.role
  return typeof role === 'string' ? role : undefined
}

function nameFromUser(user: User): string {
  const meta = user.user_metadata as Record<string, unknown> | undefined
  const name = meta?.full_name
  if (typeof name === 'string' && name.trim()) return name
  return user.email?.split('@')[0] ?? 'Kullanıcı'
}

export function isSuperAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false
  const normalized = email.toLowerCase().trim()
  return getSuperAdminEmailList().includes(normalized)
}

/** Cookie'den oturum — ağ çağrısı yapmaz */
export async function getSessionUser(supabase: SupabaseClient) {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ?? null
}

async function fetchFromDb<T>(
  query: PromiseLike<{ data: T | null; error: unknown }>,
  timeoutMs = PROFILE_TIMEOUT_MS
): Promise<DbResult<T>> {
  try {
    const result = await Promise.race([
      query,
      new Promise<{ data: null; error: { message: 'timeout' } }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: { message: 'timeout' } }), timeoutMs)
      ),
    ])

    if (result.error) {
      const parsed = parseQueryError(result.error)
      return { ok: false, reason: parsed.reason }
    }

    if (!result.data) return { ok: false, reason: 'not_found' }
    return { ok: true, data: result.data, fromDb: true }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

/**
 * Admin paneli — service role ile profil (RLS bypass, sunucu tarafı güvenilir)
 */
export async function requireSuperAdminFromServiceRole(
  user: User
): Promise<DbResult<AdminProfile>> {
  const admin = getServiceClient()
  if (!admin) return { ok: false, reason: 'error' }

  const result = await fetchFromDb<AdminProfile>(
    admin.from('user_profiles').select('role, full_name, is_active').eq('id', user.id).single(),
    4000
  )

  if (!result.ok) return result
  if (result.data.is_active === false) return { ok: false, reason: 'inactive' }
  if (result.data.role !== 'super_admin') return { ok: false, reason: 'not_super_admin' }

  return result
}

/**
 * Admin paneli — oturumlu anon client (yedek)
 */
export async function requireSuperAdminFromDb(
  supabase: SupabaseClient,
  user: User
): Promise<DbResult<AdminProfile>> {
  const result = await fetchFromDb<AdminProfile>(
    supabase.from('user_profiles').select('role, full_name, is_active').eq('id', user.id).single()
  )

  if (!result.ok) return result

  if (result.data.is_active === false) return { ok: false, reason: 'inactive' }
  if (result.data.role !== 'super_admin') return { ok: false, reason: 'not_super_admin' }

  return result
}

/**
 * Admin paneli erişimi — yalnızca DB'de doğrulanmış super_admin profili.
 */
export async function resolveSuperAdminAccess(
  supabase: SupabaseClient,
  user: User
): Promise<AdminAccessResult> {
  if (!isSuperAdminEmail(user.email) && roleFromUser(user) !== 'super_admin') {
    return { ok: false, reason: 'not_super_admin' }
  }

  let serviceDb = await requireSuperAdminFromServiceRole(user)
  if (serviceDb.ok) return serviceDb

  if (
    isSuperAdminEmail(user.email) &&
    (serviceDb.reason === 'not_found' || serviceDb.reason === 'not_super_admin')
  ) {
    const created = await ensureSuperAdminProfile(user)
    if (created) {
      serviceDb = await requireSuperAdminFromServiceRole(user)
      if (serviceDb.ok) return serviceDb
    }
  }

  const anonDb = await requireSuperAdminFromDb(supabase, user)
  if (anonDb.ok) return anonDb

  if (serviceDb.reason === 'inactive' || anonDb.reason === 'inactive') {
    return { ok: false, reason: 'inactive' }
  }

  if (serviceDb.reason === 'not_super_admin' && anonDb.reason === 'not_super_admin') {
    return { ok: false, reason: 'not_super_admin' }
  }

  return { ok: false, reason: serviceDb.reason !== 'error' ? serviceDb.reason : anonDb.reason }
}

/** Bayi dashboard — DB'den profil; başarısızsa null (offline mod) */
export async function fetchLayoutProfileFromDb(
  supabase: SupabaseClient,
  user: User
): Promise<DbResult<LayoutProfile>> {
  return fetchFromDb<LayoutProfile>(
    supabase
      .from('user_profiles')
      .select(
        'full_name, role, is_active, onboarding_completed, tenant_id, tenants(company_name, status, subscription_start, subscription_end, plan_id, subscription_plans(name, price))'
      )
      .eq('id', user.id)
      .single()
  )
}

/**
 * Bayi dashboard — service role ile profil (RLS bypass + güvenilir).
 * Anon client'ın RLS/timeout sorunlarını aşar; dashboard girişinin
 * "Sunucuya ulaşılamıyor" hatasını çözer.
 */
export async function fetchLayoutProfileService(
  user: User
): Promise<DbResult<LayoutProfile>> {
  const admin = getServiceClient()
  if (!admin) return { ok: false, reason: 'error' }

  return fetchFromDb<LayoutProfile>(
    admin
      .from('user_profiles')
      .select(
        'full_name, role, is_active, onboarding_completed, tenant_id, tenants(company_name, status, subscription_start, subscription_end, plan_id, subscription_plans(name, price))'
      )
      .eq('id', user.id)
      .single(),
    6000
  )
}

/** Bayi için gecikmiş ödeme — service role */
export async function tenantHasOverduePaymentService(
  tenantId: string
): Promise<boolean> {
  const admin = getServiceClient()
  if (!admin) return true
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await admin
      .from('tenant_payments')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'overdue'])
      .lte('due_date', today)
      .limit(1)
    return (data?.length ?? 0) > 0
  } catch {
    return true
  }
}

/** Bayi için gecikmiş ödeme var mı */
export async function tenantHasOverduePayment(
  supabase: SupabaseClient,
  tenantId: string
): Promise<boolean> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const { data } = await supabase
      .from('tenant_payments')
      .select('id, status, due_date')
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'overdue'])
      .lte('due_date', today)
      .limit(1)

    return (data?.length ?? 0) > 0
  } catch {
    return false
  }
}

/** Bayi paneli offline fallback — asla super_admin rolü vermez */
export function buildOfflineLayoutProfile(user: User): LayoutProfile {
  const metaRole = roleFromUser(user)
  const safeRole = metaRole === 'super_admin' ? 'tenant_admin' : (metaRole ?? 'tenant_admin')

  return {
    full_name: nameFromUser(user),
    role: safeRole,
    is_active: true,
    onboarding_completed: false,
    tenant_id: null,
    tenants: null,
  }
}

/** @deprecated Bayi layout için fetchLayoutProfileFromDb + buildOfflineLayoutProfile kullanın */
export async function getLayoutProfile(
  supabase: SupabaseClient,
  user: User
): Promise<LayoutProfile> {
  const db = await fetchLayoutProfileFromDb(supabase, user)
  if (db.ok) return db.data
  return buildOfflineLayoutProfile(user)
}
