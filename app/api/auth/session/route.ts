import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { getServiceClient } from '@/lib/supabase/service'
import { isSuperAdminEmail, ensureSuperAdminProfile } from '@/lib/supabase/auth-helpers'

export const dynamic = 'force-dynamic'

/**
 * Resolves current session and role for smooth client-side routing.
 * Never exposes secret keys.
 */
export async function GET(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !key) {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll: () => {},
    },
  })

  try {
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) {
      return NextResponse.json({ authenticated: false }, { status: 200 })
    }

    const email = user.email?.toLowerCase().trim() || ''

    // 1. Super admin check
    if (isSuperAdminEmail(email)) {
      await ensureSuperAdminProfile(user)
      return NextResponse.json({
        authenticated: true,
        email,
        role: 'super_admin',
        redirect: '/admin',
      })
    }

    const admin = getServiceClient()
    if (!admin) {
      // Fallback with session client
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role, is_active, tenant_id')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'super_admin') {
        return NextResponse.json({ authenticated: true, email, role: 'super_admin', redirect: '/admin' })
      }
      if (profile?.tenant_id && profile?.is_active !== false) {
        return NextResponse.json({ authenticated: true, email, role: profile.role, tenant_id: profile.tenant_id, redirect: '/dashboard' })
      }
      return NextResponse.json({ authenticated: true, email, error: 'no_tenant' })
    }

    // 2. Query user profile via service role
    let { data: profile } = await admin
      .from('user_profiles')
      .select('role, is_active, tenant_id')
      .eq('id', user.id)
      .single()

    // 3. If no profile exists, check if user's verified email matches their own tenant
    if (!profile && email) {
      const { data: matchingTenants } = await admin
        .from('tenants')
        .select('id, status')
        .ilike('email', email)
        .order('created_at', { ascending: false })
        .limit(1)

      if (matchingTenants && matchingTenants.length > 0) {
        const { data: newProf } = await admin
          .from('user_profiles')
          .upsert(
            {
              id: user.id,
              tenant_id: matchingTenants[0].id,
              role: 'tenant_admin',
              is_active: true,
              full_name: (user.user_metadata?.full_name as string) || email.split('@')[0] || 'Bayi Yöneticisi',
            },
            { onConflict: 'id' }
          )
          .select('role, is_active, tenant_id')
          .single()

        profile = newProf
      } else {
        // Also check if approved application in bayi_basvurulari has a tenant_id
        const { data: basvuru } = await admin
          .from('bayi_basvurulari')
          .select('tenant_id')
          .ilike('email', email)
          .not('tenant_id', 'is', null)
          .order('created_at', { ascending: false })
          .limit(1)

        if (basvuru && basvuru.length > 0 && basvuru[0].tenant_id) {
          const { data: newProf } = await admin
            .from('user_profiles')
            .upsert(
              {
                id: user.id,
                tenant_id: basvuru[0].tenant_id,
                role: 'tenant_admin',
                is_active: true,
                full_name: (user.user_metadata?.full_name as string) || email.split('@')[0] || 'Bayi Yöneticisi',
              },
              { onConflict: 'id' }
            )
            .select('role, is_active, tenant_id')
            .single()

          profile = newProf
        }
      }
    }

    if (!profile) {
      return NextResponse.json({ authenticated: true, email, error: 'no_tenant' })
    }

    if (profile.is_active === false) {
      return NextResponse.json({ authenticated: true, email, error: 'profile_inactive' })
    }

    if (profile.role === 'super_admin') {
      return NextResponse.json({ authenticated: true, email, role: 'super_admin', redirect: '/admin' })
    }

    if (!profile.tenant_id) {
      return NextResponse.json({ authenticated: true, email, error: 'no_tenant' })
    }

    return NextResponse.json({
      authenticated: true,
      email,
      role: profile.role,
      tenant_id: profile.tenant_id,
      redirect: '/dashboard',
    })
  } catch {
    return NextResponse.json({ authenticated: false }, { status: 200 })
  }
}
