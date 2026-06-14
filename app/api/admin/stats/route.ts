import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getAdminDataClient } from '@/lib/supabase/admin-data'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

  try {
    const admin = getAdminDataClient()

    const [tenantsRes, usersRes] = await Promise.all([
      admin.from('tenants').select('id', { count: 'exact', head: true }),
      admin.from('user_profiles').select('id', { count: 'exact', head: true }).neq('role', 'super_admin'),
    ])

    let basvuruCount = 0
    try {
      const basvuruRes = await admin.from('bayi_basvurulari').select('id', { count: 'exact', head: true })
      basvuruCount = basvuruRes.count ?? 0
    } catch {
      basvuruCount = 0
    }

    return NextResponse.json({
      tenants: tenantsRes.count ?? 0,
      users: usersRes.count ?? 0,
      basvurular: basvuruCount,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
