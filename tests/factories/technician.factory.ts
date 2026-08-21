/**
 * AURA İntegra — Teknisyen & Kullanıcı Profili (Technician / User Profile) Factory
 *
 * Gerçek DB şemasına dayalı personel ve teknisyen kayıtları oluşturur.
 * Tablo: `user_profiles`
 *
 * Roller:
 * - `teknisyen`: Atölye ve servis tamir personeli
 * - `tenant_admin`: Bayi yöneticisi
 * - `mudur`: Şube/Operasyon müdürü
 * - `muhasebe`: Finans ve fatura personeli
 * - `satis`: Satış ve vitrin personeli
 * - `kasiyer`: Kasa görevlisi
 * - `viewer`: Salt okunur kullanıcı
 */

import { insertOne, insertMany, setupTestEnvironment, type FactoryContext, type Created } from './base.factory'
import { RealisticData } from '../helpers/realistic-data'

export type UserRole =
  | 'super_admin'
  | 'tenant_admin'
  | 'mudur'
  | 'teknisyen'
  | 'muhasebe'
  | 'satis'
  | 'kasiyer'
  | 'viewer'

export interface CreateUserProfileInput {
  id?: string
  tenantId?: string
  full_name?: string
  role?: UserRole
  phone?: string
  avatar_url?: string
  is_active?: boolean
}

export interface CreateTechnicianInput extends Omit<CreateUserProfileInput, 'role'> {
  // Teknisyen için özel opsiyonel alanlar
}

/**
 * Kullanıcı profili (user_profiles) kaydı oluşturur.
 */
export async function createUserProfile(
  ctx?: Partial<FactoryContext>,
  overrides: CreateUserProfileInput = {},
): Promise<{ userProfile: Created<Record<string, unknown>>; ctx: FactoryContext }> {
  let effectiveCtx = ctx as FactoryContext

  if (!effectiveCtx?.tenantId && !overrides.tenantId) {
    if (!effectiveCtx?.client) {
      const { createTestDbClient } = await import('../helpers/test-db')
      const { serviceClient } = createTestDbClient()
      const env = await setupTestEnvironment(serviceClient)
      effectiveCtx = env.ctx
    } else {
      const env = await setupTestEnvironment(effectiveCtx.client)
      effectiveCtx = env.ctx
    }
  }

  const tenantId = overrides.tenantId ?? effectiveCtx.tenantId
  const fullName = overrides.full_name ?? RealisticData.fullName()
  const role = overrides.role ?? 'teknisyen'

  const data: Record<string, unknown> = {
    tenant_id: tenantId,
    full_name: fullName,
    role,
    phone: overrides.phone ?? RealisticData.phone(),
    avatar_url: overrides.avatar_url ?? null,
    is_active: overrides.is_active ?? true,
  }

  if (overrides.id) {
    data.id = overrides.id
  }

  const userProfile = await insertOne(effectiveCtx, 'user_profiles', data)
  return { userProfile, ctx: effectiveCtx }
}

/**
 * Teknisyen rolünde kullanıcı profili oluşturur.
 */
export async function createTechnician(
  ctx?: Partial<FactoryContext>,
  overrides: CreateTechnicianInput = {},
): Promise<{ technician: Created<Record<string, unknown>>; ctx: FactoryContext }> {
  const res = await createUserProfile(ctx, {
    ...overrides,
    role: 'teknisyen',
  })
  return { technician: res.userProfile, ctx: res.ctx }
}

/**
 * N+1 query oluşturmadan toplu teknisyen kaydı oluşturur (batch insert).
 */
export async function createTechnicians(
  ctx: FactoryContext,
  count: number,
  overrides: CreateTechnicianInput = {},
): Promise<Created<Record<string, unknown>>[]> {
  if (count <= 0) return []

  const technicians = Array.from({ length: count }, () => ({
    tenant_id: overrides.tenantId ?? ctx.tenantId,
    full_name: overrides.full_name ?? RealisticData.fullName(),
    role: 'teknisyen',
    phone: overrides.phone ?? RealisticData.phone(),
    avatar_url: overrides.avatar_url ?? null,
    is_active: overrides.is_active ?? true,
  }))

  return insertMany(ctx, 'user_profiles', technicians)
}
