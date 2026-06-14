import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getServiceClient } from '@/lib/supabase/service'
import { ensureSuperAdminProfile, isSuperAdminEmail } from '@/lib/supabase/auth-helpers'

export const dynamic = 'force-dynamic'

/** İlk girişte süper admin profili yoksa service role ile oluşturur */
export async function POST(request: NextRequest) {
  try {
    const sb = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => request.cookies.getAll(),
          setAll: () => {},
        },
      }
    )

    const { data: { user } } = await sb.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'Oturum bulunamadı' }, { status: 401 })
    }

    if (!isSuperAdminEmail(user.email)) {
      return NextResponse.json({ error: 'Yetkisiz' }, { status: 403 })
    }

    const ok = await ensureSuperAdminProfile(user)
    if (!ok && !getServiceClient()) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY .env.local dosyasında tanımlı değil' },
        { status: 500 }
      )
    }
    if (!ok) {
      return NextResponse.json({ error: 'Profil oluşturulamadı' }, { status: 500 })
    }

    return NextResponse.json({ success: true, role: 'super_admin' })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Sunucu hatası'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
