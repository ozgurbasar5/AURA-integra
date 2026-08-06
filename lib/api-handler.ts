import { NextRequest, NextResponse } from 'next/server'
import { captureException } from '@/lib/sentry'
import { safeClientMessage } from '@/lib/api-error'

type RouteContext = { params?: Record<string, string> }

type RouteHandler = (
  req: NextRequest,
  ctx?: RouteContext,
) => Promise<NextResponse> | NextResponse

/** API route'ları için try-catch + Sentry sarmalayıcı */
export function withApiHandler<C = RouteContext>(
  handler: (req: NextRequest, ctx: C) => Promise<NextResponse> | NextResponse,
  routeLabel?: string
): (req?: NextRequest, ctx?: C) => Promise<NextResponse> | NextResponse {
  return async (req = new NextRequest('http://localhost'), ctx = {} as C) => {
    try {
      return await handler(req, ctx)
    } catch (err) {
      const path = routeLabel ?? (req.nextUrl ? req.nextUrl.pathname : 'api')
      await captureException(err, { route: path, method: req.method || 'GET' })
      return NextResponse.json({ error: safeClientMessage(err) }, { status: 500 })
    }
  }
}
