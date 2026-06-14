export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSuperAdmin(request)
    if (!auth.authorized) return auth.error

    const { userId } = await request.json()
    if (!userId) {
      return NextResponse.json({ error: 'userId gerekli' }, { status: 400 })
    }

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ error: 'Service Role Key eksik!' }, { status: 500 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (error) throw error

    return NextResponse.json({ message: 'Kullanıcı Auth sisteminden silindi' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Silme hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
