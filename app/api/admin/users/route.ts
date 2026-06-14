import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getAdminDataClient } from '@/lib/supabase/admin-data'

export const dynamic = 'force-dynamic'

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

    const users = await Promise.all(
      (data ?? []).map(async (profile) => {
        const { data: authData } = await admin.auth.admin.getUserById(profile.id)
        return {
          id: profile.id,
          user_id: profile.id,
          role: profile.role || 'staff',
          is_active: profile.is_active ?? true,
          full_name: profile.full_name || '—',
          email: authData.user?.email ?? '—',
          created_at: profile.created_at,
        }
      })
    )

    return NextResponse.json({ data: users })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
