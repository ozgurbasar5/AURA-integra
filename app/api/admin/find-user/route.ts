export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'

async function requireSuperAdmin(request: NextRequest) {
  try {
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => request.cookies.getAll(), setAll: () => {} } }
    )
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return null
    const { data: profile } = await sb.from('user_profiles').select('role').eq('id', user.id).single()
    return (profile as any)?.role === 'super_admin' ? user : null
  } catch { return null }
}

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(request: NextRequest) {
  const admin = await requireSuperAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })
  }

  const email = request.nextUrl.searchParams.get('email')?.trim().toLowerCase()
  if (!email) {
    return NextResponse.json({ error: 'email parametresi gerekli' }, { status: 400 })
  }

  try {
    const supabaseAdmin = getAdminClient()
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      page: 1, perPage: 1000,
    })
    if (error) throw error

    const found = users.find(u => u.email?.toLowerCase() === email)
    if (!found) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı' }, { status: 404 })
    }

    const { data: profile } = await supabaseAdmin
      .from('user_profiles')
      .select('full_name, role, tenant_id, is_active')
      .eq('id', found.id)
      .single()

    return NextResponse.json({
      id:        found.id,
      email:     found.email,
      full_name: (profile as any)?.full_name || found.email?.split('@')[0] || '—',
      role:      (profile as any)?.role || 'staff',
      tenant_id: (profile as any)?.tenant_id || null,
      is_active: (profile as any)?.is_active ?? true,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Sunucu hatası' }, { status: 500 })
  }
}
