export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdmin } from '@/lib/admin-auth'

function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase env vars not configured')
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } })
}

export async function GET(request: NextRequest) {
  const auth = await requireSuperAdmin(request)
  if (!auth.authorized) return auth.error

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
      .select('id, full_name, role, tenant_id, is_active')
      .eq('id', found.id)
      .maybeSingle()

    return NextResponse.json({
      user: {
        id: found.id,
        email: found.email,
        created_at: found.created_at,
        last_sign_in_at: found.last_sign_in_at,
        profile,
      },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Arama hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
