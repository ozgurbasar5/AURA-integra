import { createClient } from '@/lib/supabase/server'

export type TenantAuth =
  | {
      ok: true
      supabase: ReturnType<typeof createClient>
      userId: string
      tenantId: string
      role: string
    }
  | { ok: false; status: number; message: string }

export async function requireTenantAuth(): Promise<TenantAuth> {
  const supabase = createClient()
  const { data: { user }, error: authErr } = await supabase.auth.getUser()

  if (authErr || !user) {
    return { ok: false, status: 401, message: 'Oturum bulunamadı' }
  }

  const { data: profile, error: profileErr } = await supabase
    .from('user_profiles')
    .select('tenant_id, role, is_active')
    .eq('id', user.id)
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
    supabase,
    userId: user.id,
    tenantId: profile.tenant_id,
    role: profile.role,
  }
}

export function isUuid(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
}
