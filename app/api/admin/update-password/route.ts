export const dynamic = 'force-dynamic'

import { createClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { NextRequest, NextResponse } from 'next/server'

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

export async function POST(request: NextRequest) {
  try {
    const admin = await requireSuperAdmin(request)
    if (!admin) {
      return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 403 })
    }

    const body = await request.json()
    const { userId, email, newPassword } = body

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      console.error('KRİTİK HATA: SUPABASE_SERVICE_ROLE_KEY bulunamadı!')
      return NextResponse.json({ error: 'Sunucu yapılandırma hatası' }, { status: 500 })
    }

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: {
          fetch: (url, options) => fetch(url, { ...options, signal: AbortSignal.timeout(20000) }),
        },
      }
    )

    let targetUserId = userId

    // ID yoksa e-mail ile bul
    if (!targetUserId && email) {
      const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
      if (!error && data.users) {
        const found = data.users.find(u => u.email?.toLowerCase() === email.toLowerCase())
        if (found) targetUserId = found.id
      }
    }

    // Kullanıcı yoksa ve e-posta ile oluşturulacaksa
    if (!targetUserId) {
      if (!newPassword || newPassword.length < 8) {
        return NextResponse.json({ error: 'Yeni kullanıcı için en az 8 karakter şifre gerekli' }, { status: 400 })
      }

      const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: newPassword,
        email_confirm: true,
      })

      if (createError) {
        console.log('Kullanıcı oluşturma hatası:', createError.message)
        return NextResponse.json({ error: createError.message }, { status: 500 })
      }

      return NextResponse.json({
        message: 'Kullanıcı sisteme tanımlandı ve şifresi atandı.',
        user: newUser.user,
        recreated: true,
      })
    }

    // Kullanıcı varsa güncelle
    if (newPassword && newPassword.length >= 6) {
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        targetUserId,
        { password: newPassword }
      )
      if (updateError) throw updateError
      return NextResponse.json({ message: 'Şifre başarıyla güncellendi.', user: { id: targetUserId }, recreated: false })
    }

    return NextResponse.json({ message: 'Bilgiler güncellendi (Şifre değişmedi).', user: { id: targetUserId }, recreated: false })
  } catch (error: any) {
    console.error('API Kritik Hata:', error)
    return NextResponse.json({ error: error.message || 'Sunucu hatası' }, { status: 500 })
  }
}