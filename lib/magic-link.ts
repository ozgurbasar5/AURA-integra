import type { SupabaseClient } from '@supabase/supabase-js'
import { fixMagicLinkRedirect, resolveMagicLinkBaseUrl, buildAuthCallbackUrl } from '@/lib/app-url'

export async function generateDashboardMagicLink(
  admin: SupabaseClient,
  email: string,
  fallbackOrigin?: string,
): Promise<{ ok: true; link: string } | { ok: false; error: string }> {
  const baseUrl = resolveMagicLinkBaseUrl(fallbackOrigin)
  const redirectTo = buildAuthCallbackUrl(baseUrl, '/dashboard')

  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: email.trim().toLowerCase(),
    options: { redirectTo },
  })

  if (error || !data?.properties?.action_link) {
    return { ok: false, error: error?.message ?? 'Giriş linki oluşturulamadı' }
  }

  return {
    ok: true,
    link: fixMagicLinkRedirect(data.properties.action_link, baseUrl),
  }
}

export async function findAuthUserByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<{ id: string; email: string } | null> {
  const normalized = email.trim().toLowerCase()
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error
    const found = data.users.find((u) => u.email?.toLowerCase() === normalized)
    if (found?.id && found.email) return { id: found.id, email: found.email }
    if (data.users.length < 1000) break
  }
  return null
}
