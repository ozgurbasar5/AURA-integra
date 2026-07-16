export const dynamic = 'force-dynamic'

import { NextResponse } from 'next/server'
import { requireTenantAuth } from '@/lib/supabase/tenant-auth'

/** Atölye teknisyen seçimi — user_profiles UUID */
export async function GET() {
  const auth = await requireTenantAuth()
  if (!auth.ok) {
    return NextResponse.json({ error: auth.message }, { status: auth.status })
  }

  const { data, error } = await auth.supabase
    .from('user_profiles')
    .select('id, full_name, role, is_active')
    .eq('tenant_id', auth.tenantId)
    .eq('is_active', true)
    .order('full_name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = (data ?? []).filter(u => {
    const role = String(u.role || '').toLowerCase()
    return !role || role.includes('teknisyen') || role.includes('admin') || role.includes('mudur') || role.includes('owner')
  })

  return NextResponse.json({
    ok: true,
    items: items.length ? items : (data ?? []),
  })
}
