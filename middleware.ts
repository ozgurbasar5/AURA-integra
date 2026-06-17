import { updateSession } from '@/lib/supabase/middleware'
import { NextResponse, type NextRequest } from 'next/server'

/** takip.auraintegra.com/dukkan-slug → /portal/dukkan-slug */
function maybeRewritePortalHost(request: NextRequest): NextResponse | null {
  const host = (request.headers.get('host') ?? '').split(':')[0]
  const portalHost = process.env.NEXT_PUBLIC_PORTAL_HOST?.trim()?.split(':')[0]
  if (!portalHost) return null

  if (host !== portalHost) return null

  const { pathname } = request.nextUrl
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/portal/') ||
    pathname.startsWith('/takip') ||
    pathname === '/' ||
    pathname.includes('.')
  ) {
    return null
  }

  const slugMatch = pathname.match(/^\/([a-z0-9-]+)$/)
  if (!slugMatch) return null

  const url = request.nextUrl.clone()
  url.pathname = `/portal/${slugMatch[1]}`
  return NextResponse.rewrite(url)
}

export async function middleware(request: NextRequest) {
  const rewrite = maybeRewritePortalHost(request)
  if (rewrite) return rewrite
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, sitemap.xml, robots.txt
     * - Public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
