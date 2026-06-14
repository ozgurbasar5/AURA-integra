import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/admin-auth'
import { getAdminDataClient } from '@/lib/supabase/admin-data'
import type { UserRole } from '@/types/database'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (!auth.authorized) return auth.error

  try {
    const admin = getAdminDataClient()
    const { data: tenants, error } = await admin
      .from('tenants')
      .select(`*, subscription_plans(id, name, price)`)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ data: tenants })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireSuperAdmin(req)
  if (!auth.authorized) return auth.error

  try {
    const admin = getAdminDataClient()
    const body = await req.json() as {
      email: string; password: string; full_name: string; tenant_id: string; role: UserRole
    }
    const { email, password, full_name, tenant_id, role } = body

    if (!email || !password || !full_name || !tenant_id || !role) {
      return NextResponse.json(
        { error: 'email, password, full_name, tenant_id ve role zorunludur.' },
        { status: 400 }
      )
    }

    const { data: userList } = await admin.auth.admin.listUsers()
    const existing = userList?.users?.find(u => u.email === email)

    let userId: string
    if (existing) {
      userId = existing.id
      await admin.auth.admin.updateUserById(userId, {
        password, email_confirm: true,
        user_metadata: { full_name, role },
      })
    } else {
      const { data: newUser, error: createErr } = await admin.auth.admin.createUser({
        email, password, email_confirm: true,
        user_metadata: { full_name, role },
      })
      if (createErr || !newUser.user) {
        return NextResponse.json(
          { error: createErr?.message ?? 'Auth kullanıcısı oluşturulamadı.' },
          { status: 500 }
        )
      }
      userId = newUser.user.id
    }

    const { error: insertErr } = await (admin.from('user_profiles') as any).upsert({
      id: userId, tenant_id, full_name, role, is_active: true,
    }, { onConflict: 'id' })

    if (insertErr) {
      return NextResponse.json(
        { error: `Profil kaydedilemedi: ${insertErr.message}` },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { message: 'Kullanıcı başarıyla oluşturuldu.', user_id: userId },
      { status: 201 }
    )
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
