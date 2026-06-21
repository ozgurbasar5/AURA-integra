export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { getServerAppUrl } from '@/lib/app-url'

/** Magic link / OAuth dönüşü — oturumu cookie'ye yazar */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const tokenHash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const next = requestUrl.searchParams.get('next') ?? '/dashboard'
  const appUrl = getServerAppUrl(requestUrl.origin)
  const dest = next.startsWith('/') ? next : `/${next}`

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !key) {
    return NextResponse.redirect(`${appUrl}/login?error=service_unavailable`)
  }

  let cookieResponse = NextResponse.redirect(`${appUrl}${dest}`)

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        cookieResponse = NextResponse.redirect(`${appUrl}${dest}`)
        cookiesToSet.forEach(({ name, value, options }) =>
          cookieResponse.cookies.set(name, value, options),
        )
      },
    },
  })

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      return NextResponse.redirect(`${appUrl}/login?error=magic_link_failed`)
    }
    return cookieResponse
  }

  if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    })
    if (error) {
      return NextResponse.redirect(`${appUrl}/login?error=magic_link_failed`)
    }
    return cookieResponse
  }

  // #access_token hash sunucuya gelmez — client /auth/session'a aktar
  const qs = requestUrl.search || ''
  const html = `<!DOCTYPE html><html lang="tr"><head><meta charset="utf-8"/><title>Giriş</title></head><body><p style="font-family:system-ui;text-align:center;margin-top:40vh;color:#64748b">Giriş tamamlanıyor…</p><script>
(function(){
  var h=window.location.hash||'';
  if(h.indexOf('access_token=')!==-1){window.location.replace('/auth/session${qs.replace(/'/g, "\\'")}'+h);return;}
  window.location.replace('${appUrl}/login?error=magic_link_failed');
})();
</script></body></html>`
  return new NextResponse(html, { headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}
