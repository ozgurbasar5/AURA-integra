import { NextResponse } from 'next/server'
import { runFinanceIntegrationAudit } from '@/lib/finance-integration-audit'

export const dynamic = 'force-dynamic'

export async function GET() {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 })
  }
  const report = runFinanceIntegrationAudit('api-audit')
  return NextResponse.json(report)
}
